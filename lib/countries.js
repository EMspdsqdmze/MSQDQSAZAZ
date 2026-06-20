export const PHONE_COUNTRIES = [
  { code: "FR", label: "France", dialCode: "+33", nationalDigits: 9, placeholder: "6 12 34 56 78" },
  { code: "BE", label: "Belgique", dialCode: "+32", nationalDigits: null, placeholder: "470 12 34 56" },
  { code: "CH", label: "Suisse", dialCode: "+41", nationalDigits: null, placeholder: "76 123 45 67" }
];

export function findPhoneCountry(countryCode) {
  return PHONE_COUNTRIES.find((item) => item.code === countryCode) || PHONE_COUNTRIES[0];
}

export function localPhoneDigits(countryCode, phone) {
  const country = findPhoneCountry(countryCode);
  const rawPhone = String(phone || "").trim();
  const digits = rawPhone.replace(/\D/g, "");
  const dialDigits = country.dialCode.replace(/\D/g, "");

  if (rawPhone.startsWith("+") && digits.startsWith(dialDigits)) {
    return digits.slice(dialDigits.length).replace(/^0+/, "");
  }

  return digits.replace(/^0+/, "");
}

export function hasLeadingLocalZero(countryCode, phone) {
  const country = findPhoneCountry(countryCode);
  const rawPhone = String(phone || "").trim();
  const digits = rawPhone.replace(/\D/g, "");
  const dialDigits = country.dialCode.replace(/\D/g, "");

  if (rawPhone.startsWith("+") && digits.startsWith(dialDigits)) {
    return digits.slice(dialDigits.length).startsWith("0");
  }

  return digits.startsWith("0");
}

export function validatePhoneForCountry(countryCode, phone) {
  const country = findPhoneCountry(countryCode);

  if (!country.nationalDigits) {
    return true;
  }

  return localPhoneDigits(countryCode, phone).length === country.nationalDigits;
}

export function limitPhoneInputForCountry(countryCode, phone) {
  const country = findPhoneCountry(countryCode);
  const value = String(phone || "");

  if (!country.nationalDigits) {
    return value;
  }

  const digits = value.replace(/\D/g, "");
  const dialDigits = country.dialCode.replace(/\D/g, "");
  const maxDigits = value.trim().startsWith("+")
    ? dialDigits.length + country.nationalDigits
    : country.nationalDigits + (digits.startsWith("0") ? 1 : 0);
  let digitCount = 0;
  let limitedValue = "";

  for (const character of value) {
    if (/\d/.test(character)) {
      if (digitCount >= maxDigits) {
        continue;
      }

      digitCount += 1;
    }

    limitedValue += character;
  }

  return limitedValue;
}

export function phoneLengthMessage(countryCode) {
  const country = findPhoneCountry(countryCode);

  if (!country.nationalDigits) {
    return `${country.label}: entrez le numéro au format local ou international.`;
  }

  return `${country.label}: ${country.nationalDigits} chiffres après l'indicatif ${country.dialCode}.`;
}

export function buildPhoneWithCountry(countryCode, phone) {
  const country = findPhoneCountry(countryCode);
  const rawPhone = String(phone || "").trim();

  if (rawPhone.startsWith("+")) {
    return rawPhone;
  }

  const localPhone = rawPhone.replace(/[^\d]/g, "").replace(/^0+/, "");
  return `${country.dialCode}${localPhone}`;
}
