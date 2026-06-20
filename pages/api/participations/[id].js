import { getParticipation, publicEntry } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const entry = await getParticipation(req.query.id);

  if (!entry) {
    return res.status(404).json({ error: "Inscription introuvable." });
  }

  return res.status(200).json({ participation: publicEntry(entry) });
}
