import { listAdminParticipations } from "../../../lib/db";

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

  const participations = await listAdminParticipations();
  return res.status(200).json({ participations });
}
