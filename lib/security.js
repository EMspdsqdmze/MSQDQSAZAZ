import crypto from "crypto";

const PHONE_REGEX = /^\+?[0-9 ()-]{8,20}$/;

export function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function validatePhone(phone) {
  const trimmed = String(phone || "").trim();
  const normalized = normalizePhone(trimmed);
  return PHONE_REGEX.test(trimmed) && normalized.replace(/\D/g, "").length >= 8;
}

export function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  const prefix = normalized.startsWith("+") ? normalized.slice(0, 5) : normalized.slice(0, 3);
  const suffix = normalized.slice(-2);
  return `${prefix} ** ** ** ${suffix}`;
}

export function phoneHash(phone) {
  const secret = process.env.PHONE_HASH_SECRET;
  if (!secret) {
    throw new Error("PHONE_HASH_SECRET is required");
  }

  return crypto.createHmac("sha256", secret).update(normalizePhone(phone)).digest("hex");
}

function encryptionKey() {
  const raw = process.env.PHONE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PHONE_ENCRYPTION_KEY is required");
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptText(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value || ""), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptText(cipherText) {
  const [ivValue, tagValue, encryptedValue] = String(cipherText || "").split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    return "";
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function encryptPhone(phone) {
  return encryptText(normalizePhone(phone));
}

export function decryptPhone(cipherText) {
  return decryptText(cipherText);
}

export function cleanPseudo(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w .#-]/g, "")
    .slice(0, 32);
}

export function clientIp(req) {
  return String(
    req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown"
  )
    .split(",")[0]
    .replace(/^::ffff:/, "")
    .trim();
}

export function isLocalIp(ip) {
  const value = String(ip || "").toLowerCase();

  return (
    value === "::1" ||
    value === "127.0.0.1" ||
    value === "localhost" ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  );
}

export function cleanReportedIp(ip) {
  const value = String(ip || "")
    .split(",")[0]
    .replace(/^::ffff:/, "")
    .trim();

  if (!value || value.length > 64 || /[^a-f0-9:.]/i.test(value)) {
    return "";
  }

  return value;
}

export function isStrongBotTrap(body) {
  return Boolean(body.website || body.email);
}
