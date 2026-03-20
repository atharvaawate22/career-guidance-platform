import { CutoffData, CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { CutoffsRepository } from './cutoffs.repository';

const cutoffsRepository = new CutoffsRepository();
const ACTIVE_CUTOFF_YEAR = 2025;

export class CutoffsService {
  async getCutoffs(
    filters: CutoffFilters,
  ): Promise<{ rows: CutoffData[]; total: number }> {
    filters.year = ACTIVE_CUTOFF_YEAR;
    return await cutoffsRepository.getCutoffs(filters);
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

      if (
        cutoff.percentile === undefined ||
        cutoff.percentile < 0 ||
        cutoff.percentile > 100
      ) {
        throw new Error('Invalid percentile value');
      }
    }

    return await cutoffsRepository.bulkInsertCutoffs(cutoffs);
  }
}
