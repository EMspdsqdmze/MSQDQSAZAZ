import { lookupInquerelyNumber } from "../../../lib/inquerely";
import { validatePhone } from "../../../lib/security";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  const phone = req.body?.phone;

  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide." });
  }

  try {
    const lookup = await lookupInquerelyNumber(phone);
    return res.status(200).json({ lookup });
  } catch (error) {
    if (error.code === "INQUERELY_MISSING_KEY") {
      return res.status(500).json({ error: "INQUERELY_API_KEY n'est pas configurée." });
    }

    return res.status(502).json({ error: error.message || "Lookup Inquerely impossible." });
  }
}
