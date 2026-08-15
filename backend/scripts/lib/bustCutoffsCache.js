/*
 * Invalidates every Redis key that could be serving cutoffs/predictor data,
 * so a fresh ingestion is visible immediately instead of waiting out the 6h
 * TTL (see backend/src/modules/cutoffs/cutoffs.service.ts and
 * cutoffsMetaCache.ts). Every cache key this app writes for cutoffs data is
 * prefixed "cutoffs:" ("cutoffs:<filters>", "cutoffs:college:v1:...",
 * "cutoffs:meta:v7:..."), so one SCAN pattern covers all of them.
 *
 * No-ops (with a log line) when REDIS_URL isn't set, matching the app's own
 * getRedis() behavior of treating "no Redis configured" as a soft feature
 * rather than an error — local/dev loads should not require a Redis instance.
 */
const Redis = require('ioredis');

async function bustCutoffsCache() {
  if (!process.env.REDIS_URL) {
    console.log('REDIS_URL not set — skipping cache invalidation.');
    return;
  }

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await client.connect();
    let cursor = '0';
    let deleted = 0;
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        'cutoffs:*',
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');
    console.log(`Cache invalidated: ${deleted} key(s) matching "cutoffs:*" deleted.`);
  } catch (error) {
    // A failed cache bust must never fail the load — the data is already
    // committed to Postgres; worst case is a stale cache for up to 6h.
    console.error('Cache invalidation failed (data was still loaded successfully):', error.message);
  } finally {
    client.disconnect();
  }
}

module.exports = { bustCutoffsCache };
