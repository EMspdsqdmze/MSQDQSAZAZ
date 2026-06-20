import {
  listAdminParticipations,
  updateParticipantCodeStatus,
  updateParticipationStatus
} from "../../../lib/db";
import {
  answerTelegramCallback,
  editTelegramCodeMessage,
  editTelegramValidationMessage,
  sendTelegramAdminPanel,
  sendTelegramPendingCodes,
  sendTelegramPendingEntries
} from "../../../lib/telegram";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

function getTelegramWebhookSecret() {
  return process.env.MESSAGE_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || "";
}

function getTelegramAdminId() {
  return String(process.env.MESSAGE_ADMIN_ID || process.env.TELEGRAM_ADMIN_ID || "");
}

  const expectedSecret = getTelegramWebhookSecret();
  const providedSecret = req.headers["x-telegram-bot-api-secret-token"];

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: "Invalid Telegram secret." });
  }

  const adminId = getTelegramAdminId();
  const callback = req.body?.callback_query;
  const message = req.body?.message;
  const actorId = String(callback?.from?.id || message?.from?.id || "");

  if (!adminId || actorId !== adminId) {
    if (callback?.id) {
      await answerTelegramCallback(callback.id, "Action non autorisée.");
    }
    return res.status(403).json({ error: "Unauthorized Telegram user." });
  }

  if (message?.text) {
    const command = String(message.text).trim().toLowerCase();

    if (["/start", "/admin", "/panel"].includes(command)) {
      const participations = await listAdminParticipations();
      await sendTelegramAdminPanel(message.chat.id, participations);
    }

    return res.status(200).json({ ok: true });
  }

  if (!callback) {
    return res.status(200).json({ ok: true });
  }

  const [action, participationId] = String(callback.data || "").split(":");

  if (action === "done") {
    await answerTelegramCallback(callback.id, "Cette inscription a déjà été traitée.");
    return res.status(200).json({ ok: true });
  }

  if (action === "panel") {
    const participations = await listAdminParticipations();
    await sendTelegramAdminPanel(callback.message.chat.id, participations);
    await answerTelegramCallback(callback.id, "Panel actualise.");
    return res.status(200).json({ ok: true });
  }

  if (action === "panel_entries") {
    const participations = await listAdminParticipations();
    await sendTelegramPendingEntries(callback.message.chat.id, participations);
    await answerTelegramCallback(callback.id, "Inscriptions envoyées.");
    return res.status(200).json({ ok: true });
  }

  if (action === "panel_codes") {
    const participations = await listAdminParticipations();
    await sendTelegramPendingCodes(callback.message.chat.id, participations);
    await answerTelegramCallback(callback.id, "Codes envoyés.");
    return res.status(200).json({ ok: true });
  }

  if (["code_confirm", "code_reject"].includes(action)) {
    const codeStatus = action === "code_confirm" ? "confirmed" : "rejected";

    try {
      const updated = await updateParticipantCodeStatus(
        participationId,
        codeStatus,
        `telegram:${actorId}`
      );

      if (!updated) {
        await answerTelegramCallback(callback.id, "Inscription introuvable.");
        return res.status(404).json({ error: "Participation not found." });
      }

      await answerTelegramCallback(
        callback.id,
        codeStatus === "confirmed" ? "Code confirmé." : "Code refusé."
      );
      await editTelegramCodeMessage(callback, codeStatus);

      return res.status(200).json({ ok: true, participation: updated });
    } catch (error) {
      if (error.code === "CODE_MISSING") {
        await answerTelegramCallback(callback.id, "Aucun code à confirmer.");
        return res.status(400).json({ error: "Code missing." });
      }

      throw error;
    }
  }

  const status = action === "confirm" ? "validated" : action === "reject" ? "rejected" : null;

  if (!status || !participationId) {
    await answerTelegramCallback(callback.id, "Action invalide.");
    return res.status(400).json({ error: "Invalid callback data." });
  }

  const updated = await updateParticipationStatus(participationId, status, `telegram:${actorId}`);

  if (!updated) {
    await answerTelegramCallback(callback.id, "Inscription introuvable.");
    return res.status(404).json({ error: "Participation not found." });
  }

  await answerTelegramCallback(
    callback.id,
    status === "validated" ? "Inscription validée." : "Inscription refusée."
  );
  await editTelegramValidationMessage(callback, status);

  return res.status(200).json({ ok: true, participation: updated });
}
