import { CutoffData, CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { CutoffsRepository } from './cutoffs.repository';

const cutoffsRepository = new CutoffsRepository();

export class CutoffsService {
  async getCutoffs(filters: CutoffFilters): Promise<CutoffData[]> {
    // Validate year if provided
    if (filters.year !== undefined) {
      const year = Number(filters.year);
      if (isNaN(year) || year < 2000 || year > 2100) {
        throw new Error('Invalid year provided');
      }
      filters.year = year;
    }

    // Validate percentile range if needed in future
    // For now, just pass to repository
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
