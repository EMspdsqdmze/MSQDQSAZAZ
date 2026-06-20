import { getParticipationByPhoneHash, publicEntry } from "../../../lib/db";
import { clientIp, phoneHash, validatePhone } from "../../../lib/security";
import { rateLimit } from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`status:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });

  if (!limited.allowed) {
    return res.status(429).json({ error: "Trop de tentatives. Réessayez plus tard." });
  }

  const phone = req.body?.phone;

  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide." });
  }

  const entry = await getParticipationByPhoneHash(phoneHash(phone));

  if (!entry) {
    return res.status(404).json({ error: "Aucune inscription trouvée pour ce numéro." });
  }

  return res.status(200).json({ participation: publicEntry(entry) });
}
