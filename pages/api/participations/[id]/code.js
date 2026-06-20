import { saveParticipantCode } from "../../../../lib/db";
import { notifyTelegramCode } from "../../../../lib/telegram";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = String(req.body?.code || "").replace(/\D/g, "");

  if (code.length !== 4) {
    return res.status(400).json({ error: "Le code doit contenir 4 chiffres." });
  }

  const result = await saveParticipantCode(req.query.id, code);

  if (result.reason === "not_found") {
    return res.status(404).json({ error: "Inscription introuvable." });
  }

  if (result.reason === "not_validated") {
    return res.status(409).json({ error: "Inscription pas encore validée." });
  }

  if (!result.ok) {
    return res.status(401).json({ error: "Code de participation impossible à enregistrer." });
  }

  try {
    await notifyTelegramCode(result.adminParticipation);
  } catch (error) {
    console.error("Telegram code notification failed", error);
  }

  return res.status(200).json({ ok: true, participation: result.participation });
}
