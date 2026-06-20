import { normalizePhone } from "./security";

const DEFAULT_ENDPOINT = "https://apilayer.net/api/validate";

export async function verifyPhoneOperator(phone) {
  const apiKey = process.env.NUMVERIFY_API_KEY;
  const endpoint = process.env.NUMVERIFY_ENDPOINT || DEFAULT_ENDPOINT;

  if (!apiKey) {
    const error = new Error("NUMVERIFY_API_KEY is required");
    error.code = "NUMVERIFY_MISSING_KEY";
    throw error;
  }

  const url = new URL(endpoint);
  url.searchParams.set("number", normalizePhone(phone));

  const headers = {};

  if (endpoint.includes("api.apilayer.com")) {
    headers.apikey = apiKey;
  } else {
    url.searchParams.set("access_key", apiKey);
  }

  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const error = new Error(data.error?.info || data.message || "Vérification Numverify impossible.");
    error.code = "NUMVERIFY_REQUEST_FAILED";
    throw error;
  }

  return {
    valid: Boolean(data.valid),
    number: data.international_format || data.number || normalizePhone(phone),
    localFormat: data.local_format || null,
    countryName: data.country_name || null,
    countryCode: data.country_code || null,
    location: data.location || null,
    carrier: data.carrier || "Opérateur non disponible",
    lineType: data.line_type || null
  };
}
