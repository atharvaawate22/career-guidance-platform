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
