const PHONE_AUTH_EMAIL_DOMAIN = "phone-auth.paikari.invalid";

const bangladeshMobileRegex = /^(\+?880|0)1[3-9]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeBangladeshPhone(value: string | null | undefined): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("880")) {
    return `0${digits.slice(3)}`;
  }

  if (digits.length === 11 && digits.startsWith("01")) {
    return digits;
  }

  return raw;
}

export function isValidEmailAddress(value: string | null | undefined): boolean {
  return emailRegex.test(normalizeEmail(value));
}

export function isValidBangladeshMobileNumber(value: string | null | undefined): boolean {
  const normalized = normalizeBangladeshPhone(value);
  return bangladeshMobileRegex.test(normalized);
}

export function buildPhoneAuthEmail(phone: string): string {
  const normalized = normalizeBangladeshPhone(phone);
  const digits = normalized.replace(/\D/g, "");
  return `${digits}@${PHONE_AUTH_EMAIL_DOMAIN}`;
}

export function isPhoneAuthEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.endsWith(`@${PHONE_AUTH_EMAIL_DOMAIN}`);
}

export function getPublicEmail(email: string | null | undefined): string | null {
  if (!email || isPhoneAuthEmail(email)) return null;
  return email;
}

export type ParsedAuthIdentifier =
  | { type: "email"; email: string }
  | { type: "phone"; phone: string };

export function parseAuthIdentifier(value: string | null | undefined): ParsedAuthIdentifier | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const email = normalizeEmail(raw);
  if (isValidEmailAddress(email)) {
    return { type: "email", email };
  }

  const phone = normalizeBangladeshPhone(raw);
  if (isValidBangladeshMobileNumber(phone)) {
    return { type: "phone", phone };
  }

  return null;
}
