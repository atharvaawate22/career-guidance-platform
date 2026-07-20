/** Strips formatting and assumes India (+91) when a bare 10-digit number is given — MHT-CET is Maharashtra-only, so every number here is domestic. */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/** Builds a wa.me deep link with an optional prefilled message. Returns null when no number is configured (contact_info.phone empty) so callers can hide the CTA instead of linking to a broken chat. */
export function buildWaMeLink(phone: string, message?: string): string | null {
  const digits = normalizePhoneForWhatsApp(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
