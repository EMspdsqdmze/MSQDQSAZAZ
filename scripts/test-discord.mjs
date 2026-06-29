import fs from "fs";
import path from "path";

const DISCORD_API_BASE = "https://discord.com/api/v10";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris"
  }).format(value);
}

function disabledButton(label, customId, style) {
  return {
    type: 2,
    label,
    style,
    custom_id: customId,
    disabled: true
  };
}

async function sendDiscordTest() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error("DISCORD_BOT_TOKEN et DISCORD_CHANNEL_ID doivent être configurés dans .env.local.");
  }

  const payload = {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "# Nouvelle demande",
        description: [
          "🎁 **Cadeau:**\n`Snap Plus`",
          "👤 **Pseudo:**\n`TestLocal`",
          "💬 **Discord:**\n`test.local`",
          "📞 **Téléphone:**\n`+33 6 ** ** ** 42`",
          "🌐 **IP publique:**\n`127.0.0.1 (test local)`",
          "🛡️ **Statut:**\n`En attente`",
          "📝 **Raison:**\n`-`",
          "🔎 **Opérateur:**\n`Non vérifié`",
          "🔑 **Code:**\n`En attente`",
          `🔄 **Date:**\n\`${formatDate(new Date())}\``,
          "",
          "⚠️ *Validation manuelle requise. Le gain n'est jamais automatique.*"
        ].join("\n"),
        color: 0x8b5cf6,
        footer: { text: "TirageZone admin" },
        timestamp: new Date().toISOString()
      }
    ],
    components: [
      {
        type: 1,
        components: [
          disabledButton("✅ Valider (test)", "local_test_confirm", 3),
          disabledButton("❌ Refuser (test)", "local_test_reject", 4)
        ]
      }
    ]
  };

  const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(`Discord a refusé le message: ${response.status} ${body?.message || JSON.stringify(body)}`);
  }

  const message = await response.json();
  console.log(`Message de test envoyé: ${message.id}`);
}

sendDiscordTest().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
