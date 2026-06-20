import fs from "fs/promises";
import path from "path";
import { decryptPhone, decryptText, isLocalIp } from "./security";

// On Netlify the writable filesystem is ephemeral and available under /tmp.
// Use /tmp/data by default when running on Netlify or inside a serverless function.
const isServerless = process.env.NETLIFY || process.cwd().startsWith("/var/task");
const DEFAULT_DATA_DIR = isServerless ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const DATA_DIR = process.env.DATA_DIR || DEFAULT_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, "participations.json");
const LOG_FILE = path.join(DATA_DIR, "audit.log");

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ participations: [] }, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export async function createParticipation(entry) {
  const db = await readDb();
  const exists = db.participations.some((item) => item.phoneHash === entry.phoneHash);

  if (exists) {
    const error = new Error("PHONE_ALREADY_REGISTERED");
    error.code = "PHONE_ALREADY_REGISTERED";
    throw error;
  }

  db.participations.unshift(entry);
  await writeDb(db);
  await appendAudit("created", entry.id, { gift: entry.giftLabel, status: entry.status });
  return entry;
}

export async function listParticipations() {
  const db = await readDb();
  return db.participations.map(publicEntry);
}

export async function listAdminParticipations() {
  const db = await readDb();
  return db.participations.map(adminEntry);
}

export async function getParticipation(id) {
  const db = await readDb();
  return db.participations.find((entry) => entry.id === id);
}

export async function getParticipationByPhoneHash(hash) {
  const db = await readDb();
  return db.participations.find((entry) => entry.phoneHash === hash);
}

export async function updateParticipationStatus(id, status, actor, reason = "") {
  const db = await readDb();
  const entry = db.participations.find((item) => item.id === id);

  if (!entry) {
    return null;
  }

  entry.status = status;
  entry.reviewedAt = new Date().toISOString();
  entry.reviewedBy = actor;
  entry.reviewReason = status === "rejected" ? String(reason || "").trim().slice(0, 240) : "";

  await writeDb(db);
  await appendAudit(status, id, { actor, reason: entry.reviewReason });
  return publicEntry(entry);
}

export async function deleteParticipation(id, actor) {
  const db = await readDb();
  const index = db.participations.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [entry] = db.participations.splice(index, 1);
  await writeDb(db);
  await appendAudit("deleted", id, {
    actor,
    gift: entry.giftLabel,
    maskedPhone: entry.maskedPhone
  });

  return adminEntry(entry);
}

export async function updateParticipationOperator(id, operatorVerification, actor) {
  const db = await readDb();
  const entry = db.participations.find((item) => item.id === id);

  if (!entry) {
    return null;
  }

  entry.operatorVerification = operatorVerification;
  entry.operatorVerifiedAt = new Date().toISOString();
  entry.operatorVerifiedBy = actor;

  await writeDb(db);
  await appendAudit("operator_verified", id, {
    actor,
    carrier: operatorVerification.carrier,
    valid: operatorVerification.valid
  });
  return adminEntry(entry);
}

export async function saveParticipantCode(id, code) {
  const db = await readDb();
  const entry = db.participations.find((item) => item.id === id);

  if (!entry) {
    return { ok: false, reason: "not_found" };
  }

  if (entry.status !== "validated") {
    return { ok: false, reason: "not_validated" };
  }

  entry.participantEnteredCode = code;
  entry.participantCodeConfirmedAt = new Date().toISOString();
  entry.participantCodeStatus = "pending";
  entry.participantCodeReviewedAt = null;
  entry.participantCodeReviewedBy = null;
  await writeDb(db);
  await appendAudit("participant_code_confirmed", id);

  return { ok: true, reason: "ok", participation: publicEntry(entry), adminParticipation: adminEntry(entry) };
}

export async function updateParticipantCodeStatus(id, codeStatus, actor) {
  const db = await readDb();
  const entry = db.participations.find((item) => item.id === id);

  if (!entry) {
    return null;
  }

  if (!entry.participantEnteredCode) {
    const error = new Error("CODE_MISSING");
    error.code = "CODE_MISSING";
    throw error;
  }

  entry.participantCodeStatus = codeStatus;
  entry.participantCodeReviewedAt = new Date().toISOString();
  entry.participantCodeReviewedBy = actor;

  await writeDb(db);
  await appendAudit(`participant_code_${codeStatus}`, id, { actor });

  return adminEntry(entry);
}

export async function appendAudit(action, participationId, details = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(),
    action,
    participationId,
    details
  });

  await fs.appendFile(LOG_FILE, `${line}\n`);
}

export function publicEntry(entry) {
  return {
    id: entry.id,
    giftId: entry.giftId,
    giftLabel: entry.giftLabel,
    gamePseudo: entry.gamePseudo,
    maskedPhone: entry.maskedPhone,
    status: entry.status,
    reviewReason: entry.status === "rejected" ? entry.reviewReason || "" : "",
    participantCodeStatus: entry.participantCodeStatus || "",
    createdAt: entry.createdAt,
    reviewedAt: entry.reviewedAt || null,
    reviewedBy: entry.reviewedBy || null
  };
}

export function adminEntry(entry) {
  return {
    ...publicEntry(entry),
    phone: safeDecryptPhone(entry),
    publicIp: safeDecryptIp(entry),
    participantEnteredCode: entry.participantEnteredCode || "",
    participantCodeConfirmedAt: entry.participantCodeConfirmedAt || null,
    participantCodeStatus: entry.participantCodeStatus || "",
    participantCodeReviewedAt: entry.participantCodeReviewedAt || null,
    participantCodeReviewedBy: entry.participantCodeReviewedBy || null,
    operatorVerification: entry.operatorVerification || null,
    operatorVerifiedAt: entry.operatorVerifiedAt || null
  };
}

function safeDecryptPhone(entry) {
  try {
    return decryptPhone(entry.phoneCipher) || entry.maskedPhone;
  } catch {
    return entry.maskedPhone;
  }
}

function safeDecryptIp(entry) {
  try {
    return displayIp(decryptText(entry.ipCipher) || entry.publicIp || entry.ipAddress || entry.ip);
  } catch {
    return displayIp(entry.publicIp || entry.ipAddress || entry.ip);
  }
}

function displayIp(ip) {
  if (!ip) {
    return "Non disponible";
  }

  return isLocalIp(ip) ? `${ip} (locale)` : ip;
}
