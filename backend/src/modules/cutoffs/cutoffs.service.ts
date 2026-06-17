import { CutoffRow, CutoffFilters } from './cutoffs.types';
import { CutoffsRepository } from './cutoffs.repository';
import { ACTIVE_CUTOFF_YEAR } from '../../config/constants';
import { cacheGet, cacheSet } from '../../config/redis';

const cutoffsRepository = new CutoffsRepository();
const CUTOFFS_CACHE_TTL_SECONDS = 6 * 60 * 60;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export class CutoffsService {
  async getCutoffs(
    filters: CutoffFilters,
  ): Promise<{ rows: CutoffRow[]; total: number }> {
    const normalizedFilters = {
      ...filters,
      year: ACTIVE_CUTOFF_YEAR,
    };
    const cacheKey = `cutoffs:${stableStringify(normalizedFilters)}`;
    const cached =
      await cacheGet<{ rows: CutoffRow[]; total: number }>(cacheKey);
    if (cached) return cached;

    const result = await cutoffsRepository.getCutoffs(normalizedFilters);
    await cacheSet(cacheKey, result, CUTOFFS_CACHE_TTL_SECONDS);
    return result;
  }
}
