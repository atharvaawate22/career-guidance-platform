// Detects common email domain typos (e.g. "gmail.con", "gmial.com") so users
// can be prompted with a correction before booking. Mirrors the server-side
// check in backend/src/utils/emailValidation.ts — the server remains the
// authority (it also does a DNS deliverability check).

const SLD_TYPOS: Record<string, string> = {
  gmial: "gmail",
  gamil: "gmail",
  gmali: "gmail",
  gnail: "gmail",
  gmaill: "gmail",
  gmai: "gmail",
  gemail: "gmail",
  yaho: "yahoo",
  yahooo: "yahoo",
  yhoo: "yahoo",
  hotmial: "hotmail",
  hotmal: "hotmail",
  hotmil: "hotmail",
  outlok: "outlook",
  outloook: "outlook",
  iclod: "icloud",
  icloude: "icloud",
  rediffmial: "rediffmail",
  rediffmal: "rediffmail",
};

const COM_TLD_TYPOS = new Set(["con", "cm", "om", "co", "comm", "cim", "vom", "xom", "cpm", "ocm", "cmo"]);

const KNOWN_COM_PROVIDERS = new Set([
  "gmail", "yahoo", "outlook", "hotmail", "icloud",
  "rediffmail", "live", "protonmail", "aol", "zoho",
]);

/**
 * Returns the full corrected email (e.g. "name@gmail.com") if the domain looks
 * like a common typo, or null if it looks fine.
 */
export function suggestEmailCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  const parts = domain.split(".");
  if (parts.length < 2 || !local) return null;

  let sld = parts[0];
  let tld = parts.slice(1).join(".");

  if (SLD_TYPOS[sld]) sld = SLD_TYPOS[sld];
  if (KNOWN_COM_PROVIDERS.has(sld) && COM_TLD_TYPOS.has(tld)) tld = "com";

  const suggested = `${sld}.${tld}`;
  return suggested !== domain ? `${local}@${suggested}` : null;
}
