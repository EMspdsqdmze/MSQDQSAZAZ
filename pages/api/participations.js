import crypto from "crypto";
import { findGift } from "../../lib/gifts";
import { createParticipation } from "../../lib/db";
import { notifyTelegram } from "../../lib/telegram";
import {
  cleanPseudo,
  cleanReportedIp,
  clientIp,
  encryptPhone,
  encryptText,
  isLocalIp,
  isStrongBotTrap,
  maskPhone,
  phoneHash,
  validatePhone
} from "../../lib/security";
import { rateLimit } from "../../lib/rateLimit";

async function fetchServerPublicIp() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal
    });
    const data = await response.json();
    return cleanReportedIp(data?.ip);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requestIp = clientIp(req);
  const reportedPublicIp = cleanReportedIp(req.body?.browserPublicIp);
  let storedIp = isLocalIp(requestIp) && reportedPublicIp ? reportedPublicIp : requestIp;
  const limited = rateLimit(`signup:${requestIp}`, { limit: 4, windowMs: 10 * 60 * 1000 });

  if (!limited.allowed) {
    return res.status(429).json({ error: "Trop de tentatives. Réessayez plus tard." });
  }

  const { giftId, phone, gamePseudo, acceptedRules, formStartedAt } = req.body || {};
  const gift = findGift(giftId);

  if (isStrongBotTrap(req.body || {})) {
    return res.status(400).json({ error: "Formulaire invalide." });
  }

  if (!formStartedAt || Date.now() - Number(formStartedAt) < 1200) {
    return res.status(400).json({ error: "Merci de vérifier le formulaire avant envoi." });
  }

  if (!gift) {
    return res.status(400).json({ error: "Cadeau invalide." });
  }

  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide." });
  }

  const safePseudo = cleanPseudo(gamePseudo);
  if (gift.needsGamePseudo && safePseudo.length < 2) {
    return res.status(400).json({ error: "Pseudo requis pour ce cadeau." });
  }

  if (acceptedRules !== true) {
    return res.status(400).json({ error: "Le règlement et la politique de confidentialité doivent être acceptés." });
  }

  if (isLocalIp(storedIp)) {
    storedIp = await fetchServerPublicIp() || storedIp;
  }

  const now = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(),
    giftId: gift.id,
    giftLabel: gift.label,
    gamePseudo: safePseudo,
    phoneHash: phoneHash(phone),
    phoneCipher: encryptPhone(phone),
    maskedPhone: maskPhone(phone),
    status: "pending",
    createdAt: now,
    ipCipher: encryptText(storedIp),
    ipHash: crypto
      .createHmac("sha256", process.env.PHONE_HASH_SECRET)
      .update(storedIp)
      .digest("hex")
  };

  try {
    await createParticipation(entry);
    await notifyTelegram(entry);

    return res.status(201).json({
      message: "Votre inscription est en attente de validation.",
      participation: {
        id: entry.id,
        status: entry.status,
        giftLabel: entry.giftLabel,
        maskedPhone: entry.maskedPhone
      }
    });
  } catch (error) {
    if (error.code === "PHONE_ALREADY_REGISTERED") {
      return res.status(409).json({ error: "Une inscription existe déjà pour ce numéro." });
    }

    console.error(error);
    return res.status(500).json({ error: "Impossible d'enregistrer l'inscription." });
  }
}
