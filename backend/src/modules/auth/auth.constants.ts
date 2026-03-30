export const ADMIN_AUTH_COOKIE = 'cgp_admin_session';
export const ADMIN_CSRF_COOKIE = 'cgp_admin_csrf';

export function getSessionCookieMaxAgeMs(
  expiresIn: string | undefined,
): number {
  if (!expiresIn) return 24 * 60 * 60 * 1000;

  const trimmed = expiresIn.trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber * 1000;
  }

  const match = trimmed.match(/^(\d+)([smhd])$/i);
  if (!match) return 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60 * 1000
        : unit === 'h'
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
  return value * multiplier;
}
