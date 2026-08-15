import { cacheGet, cacheSet } from '../../config/redis';

const REVOKED_JTI_PREFIX = 'admin:revoked-jti:';

/**
 * Marks a token's jti as revoked for exactly the token's remaining lifetime,
 * so the blacklist entry expires from Redis on its own and never needs
 * cleanup. No-ops when Redis isn't configured, same as every other cache
 * helper in this app — a missed revocation degrades to "token stays valid
 * until its natural expiry," not a broken logout.
 */
export async function revokeJti(
  jti: string,
  expiresAtEpochSeconds: number,
): Promise<void> {
  const ttlSeconds = Math.max(
    expiresAtEpochSeconds - Math.floor(Date.now() / 1000),
    1,
  );
  await cacheSet(`${REVOKED_JTI_PREFIX}${jti}`, true, ttlSeconds);
}

export async function isJtiRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const revoked = await cacheGet<boolean>(`${REVOKED_JTI_PREFIX}${jti}`);
  return revoked === true;
}
