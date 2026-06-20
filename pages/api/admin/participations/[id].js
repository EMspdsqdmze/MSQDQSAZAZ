import {
  deleteParticipation,
  updateParticipantCodeStatus,
  updateParticipationStatus
} from "../../../../lib/db";

export default async function handler(req, res) {
  if (!["PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès refusé." });
  }

  if (req.method === "DELETE") {
    const participation = await deleteParticipation(req.query.id, "admin-panel");

    if (!participation) {
      return res.status(404).json({ error: "Inscription introuvable." });
    }

    return res.status(200).json({ participation });
  }

  const codeStatus = req.body?.codeStatus;

  if (["confirmed", "rejected"].includes(codeStatus)) {
    try {
      const participation = await updateParticipantCodeStatus(req.query.id, codeStatus, "admin-panel");

      if (!participation) {
        return res.status(404).json({ error: "Inscription introuvable." });
      }

      return res.status(200).json({ participation });
    } catch (error) {
      if (error.code === "CODE_MISSING") {
        return res.status(400).json({ error: "Aucun code à confirmer pour cette inscription." });
      }

      throw error;
    }
  }

  const status = req.body?.status;

  if (!["validated", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide." });
  }

  const reason = status === "rejected" ? req.body?.reason : "";
  const participation = await updateParticipationStatus(req.query.id, status, "admin-panel", reason);

  if (!participation) {
    return res.status(404).json({ error: "Inscription introuvable." });
  }

  return res.status(200).json({ participation });
}
