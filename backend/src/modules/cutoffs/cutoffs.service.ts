import { CutoffData, CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
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
  ): Promise<{ rows: CutoffData[]; total: number }> {
    const normalizedFilters = {
      ...filters,
      year: ACTIVE_CUTOFF_YEAR,
    };
    const cacheKey = `cutoffs:${stableStringify(normalizedFilters)}`;
    const cached =
      await cacheGet<{ rows: CutoffData[]; total: number }>(cacheKey);
    if (cached) return cached;

    const result = await cutoffsRepository.getCutoffs(normalizedFilters);
    await cacheSet(cacheKey, result, CUTOFFS_CACHE_TTL_SECONDS);
    return result;
  }

  async bulkInsertCutoffs(cutoffs: BulkCutoffInsert[]): Promise<CutoffData[]> {
    // Validate each cutoff entry
    for (const cutoff of cutoffs) {
      if (!cutoff.year || !cutoff.college_name || !cutoff.branch) {
        throw new Error('Missing required fields in cutoff data');
      }

      if (!cutoff.category || !cutoff.home_university) {
        throw new Error('Missing required fields in cutoff data');
      }

      // percentile is required and must be a valid number in [0, 100].
      // Use == null to catch both undefined and null (null would bypass === undefined).
      if (
        cutoff.percentile == null ||
        cutoff.percentile < 0 ||
        cutoff.percentile > 100
      ) {
        throw new Error('Invalid percentile value');
      }
    }

    return await cutoffsRepository.bulkInsertCutoffs(cutoffs);
  }
}
