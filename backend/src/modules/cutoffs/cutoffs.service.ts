import { CutoffRow, CutoffFilters, CollegeInfo } from './cutoffs.types';
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
  ): Promise<{ rows: CutoffRow[]; total: number; cached: boolean }> {
    const normalizedFilters = {
      ...filters,
      year: ACTIVE_CUTOFF_YEAR,
    };
    const cacheKey = `cutoffs:${stableStringify(normalizedFilters)}`;
    const cached =
      await cacheGet<{ rows: CutoffRow[]; total: number }>(cacheKey);
    if (cached) return { ...cached, cached: true };

    const result = await cutoffsRepository.getCutoffs(normalizedFilters);
    await cacheSet(cacheKey, result, CUTOFFS_CACHE_TTL_SECONDS);
    return { ...result, cached: false };
  }

  async getCollegeCutoffs(collegeCode: string): Promise<{
    college: CollegeInfo | null;
    rows: CutoffRow[];
    cached: boolean;
  }> {
    const cacheKey = `cutoffs:college:v1:${ACTIVE_CUTOFF_YEAR}:${collegeCode}`;
    const cached =
      await cacheGet<{ college: CollegeInfo | null; rows: CutoffRow[] }>(
        cacheKey,
      );
    if (cached) return { ...cached, cached: true };

    const result = await cutoffsRepository.getCollegeCutoffs(
      collegeCode,
      ACTIVE_CUTOFF_YEAR,
    );
    // Don't cache misses for unknown codes — keeps junk keys out of Redis.
    if (result.college) {
      await cacheSet(cacheKey, result, CUTOFFS_CACHE_TTL_SECONDS);
    }
    return { ...result, cached: false };
  }
}
