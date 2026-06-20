import { normalizePhone } from "./security";

const DEFAULT_ENDPOINT = "https://inquerely.com/api/v1/search";

function pickFirst(data, keys, fallback = "") {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], data);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function cleanResultValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatEntry(entry) {
  const preferredKeys = ["phone", "number", "name", "fullname", "email", "username", "address", "city", "country"];
  const pairs = [];

  for (const key of preferredKeys) {
    const value = cleanResultValue(entry?.[key]);

    if (value) {
      pairs.push([key, value]);
    }
  }

  for (const [key, value] of Object.entries(entry || {})) {
    if (pairs.length >= 6) {
      break;
    }

    if (!preferredKeys.includes(key)) {
      const cleanedValue = cleanResultValue(value);

      if (cleanedValue) {
        pairs.push([key, cleanedValue]);
      }
    }
  }

  return pairs.map(([key, value]) => ({ key, value: value.slice(0, 120) }));
}

export async function lookupInquerelyNumber(phone) {
  const apiKey = process.env.INQUERELY_API_KEY;
  const endpoint = process.env.INQUERELY_SEARCH_ENDPOINT || DEFAULT_ENDPOINT;

  if (!apiKey) {
    const error = new Error("INQUERELY_API_KEY is required");
    error.code = "INQUERELY_MISSING_KEY";
    throw error;
  }

  const normalizedPhone = normalizePhone(phone);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query: normalizedPhone,
      type: "phone"
    })
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.ok === false || body.error) {
    const error = new Error(
      body.error?.message ||
        body.error?.code ||
        body.message ||
        "Lookup Inquerely impossible."
    );
    error.code = "INQUERELY_REQUEST_FAILED";
    error.traceId = body.traceId || "";
    throw error;
  }

  const data = body.data || {};
  const results = data.results || {};
  const breaches = Array.isArray(results.breaches) ? results.breaches : [];
  const quota = data.metadata?.quota || null;

  return {
    number: data.query || normalizedPhone,
    type: data.type || "phone",
    breachCount: breaches.length,
    databases: breaches.map((breach) => breach.database).filter(Boolean).slice(0, 6),
    entriesCount: breaches.reduce((total, breach) => total + (Array.isArray(breach.entries) ? breach.entries.length : 0), 0),
    breaches: breaches.slice(0, 5).map((breach) => ({
      database: breach.database || "Base inconnue",
      description: cleanResultValue(breach.description).slice(0, 160),
      entries: Array.isArray(breach.entries)
        ? breach.entries.slice(0, 3).map(formatEntry).filter((entry) => entry.length > 0)
        : []
    })),
    durationMs: pickFirst(data, ["metadata.durationMs"], ""),
    quota,
    raw: body
  };
}
