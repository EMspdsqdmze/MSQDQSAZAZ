import { verifyPhoneOperator } from "../../../lib/numverify";
import { validatePhone } from "../../../lib/security";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: "Configuration manquante: ADMIN_TOKEN n'est pas définie." });
  }

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const phone = req.body?.phone;

  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide." });
  }

  try {
    const verification = await verifyPhoneOperator(phone);
    return res.status(200).json({ verification });
  } catch (error) {
    if (error.code === "NUMVERIFY_MISSING_KEY") {
      return res.status(500).json({ error: "NUMVERIFY_API_KEY n'est pas configurée." });
    }

    return res.status(502).json({ error: error.message || "Lookup du numéro impossible." });
  }
}
