import { getParticipation, updateParticipationOperator } from "../../../../../lib/db";
import { decryptPhone } from "../../../../../lib/security";
import { verifyPhoneOperator } from "../../../../../lib/numverify";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: "Configuration manquante: ADMIN_TOKEN n'est pas définie." });
  }

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const entry = await getParticipation(req.query.id);

  if (!entry) {
    return res.status(404).json({ error: "Inscription introuvable." });
  }

  let phone = "";

  try {
    phone = decryptPhone(entry.phoneCipher);
  } catch {
    return res.status(422).json({
      error: "Impossible de déchiffrer ce numéro avec la clé actuelle."
    });
  }

  try {
    const verification = await verifyPhoneOperator(phone);
    await updateParticipationOperator(req.query.id, verification, "admin-panel");
    return res.status(200).json({ verification });
  } catch (error) {
    if (error.code === "NUMVERIFY_MISSING_KEY") {
      return res.status(500).json({ error: "NUMVERIFY_API_KEY n'est pas configurée." });
    }

    return res.status(502).json({ error: error.message || "Vérification opérateur impossible." });
  }
}
