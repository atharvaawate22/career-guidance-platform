export interface CollegeMetaOption {
  code: string | null;
  name: string;
}

export interface CutoffMetaPayload {
  colleges: CollegeMetaOption[];
  branches: string[];
  cities: string[];
}

interface CutoffMetaCacheKeyInput {
  year?: number;
  collegeCode?: string;
  collegeName?: string;
  branches?: string[];
  cities?: string[];
}

interface CacheEntry {
  expiresAt: number;
  value: CutoffMetaPayload;
}

const META_CACHE_TTL_MS = 15 * 60 * 1000;
const META_CACHE_MAX_ENTRIES = 200;

const metaCache = new Map<string, CacheEntry>();
const inflightLoads = new Map<string, Promise<CutoffMetaPayload>>();

const normalizeList = (values?: string[]) =>
  [...new Set((values ?? []).map((value) => value.trim().toLowerCase()))]
    .filter(Boolean)
    .sort();

export const buildCutoffMetaCacheKey = ({
  year,
  collegeCode,
  collegeName,
  branches,
  cities,
}: CutoffMetaCacheKeyInput): string =>
  JSON.stringify({
    year: year ?? null,
    collegeCode: collegeCode?.trim() || null,
    collegeName: collegeName?.trim().toLowerCase() || null,
    branches: normalizeList(branches),
    cities: normalizeList(cities),
  });

const trimExpiredEntries = () => {
  const now = Date.now();

  for (const [key, entry] of metaCache.entries()) {
    if (entry.expiresAt <= now) {
      metaCache.delete(key);
    }
  }

  while (metaCache.size > META_CACHE_MAX_ENTRIES) {
    const oldestKey = metaCache.keys().next().value;
    if (!oldestKey) break;
    metaCache.delete(oldestKey);
  }
};

export const getOrLoadCutoffMeta = async (
  keyInput: CutoffMetaCacheKeyInput,
  loader: () => Promise<CutoffMetaPayload>,
): Promise<CutoffMetaPayload> => {
  trimExpiredEntries();

  const cacheKey = buildCutoffMetaCacheKey(keyInput);
  const cached = metaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existingLoad = inflightLoads.get(cacheKey);
  if (existingLoad) {
    return existingLoad;
  }

  const loadPromise = loader()
    .then((value) => {
      metaCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + META_CACHE_TTL_MS,
      });
      trimExpiredEntries();
      return value;
    })
    .finally(() => {
      inflightLoads.delete(cacheKey);
    });

  inflightLoads.set(cacheKey, loadPromise);
  return loadPromise;
};

export const invalidateCutoffMetaCache = () => {
  metaCache.clear();
  inflightLoads.clear();
};