import { PredictorRepository } from './predictor.repository';
import {
  PredictorRequest,
  PredictorResponse,
  CollegeOption,
} from './predictor.types';

const predictorRepository = new PredictorRepository();

const SAFE_BUFFER = 3;
const TARGET_MARGIN = 2;

export class PredictorService {
  async predictColleges(
    request: PredictorRequest,
  ): Promise<PredictorResponse> {
    // Validate percentile
    if (
      request.percentile < 0 ||
      request.percentile > 100 ||
      isNaN(request.percentile)
    ) {
      throw new Error('Percentile must be between 0 and 100');
    }

    // Validate year
    if (!request.year || request.year < 2000 || request.year > 2100) {
      throw new Error('Invalid year provided');
    }

    // Get eligible colleges from repository
    const colleges = await predictorRepository.getEligibleColleges({
      year: request.year,
      category: request.category,
      gender: request.gender,
      home_university: request.home_university,
      preferred_branches: request.preferred_branches,
    });

    // Classify colleges based on student percentile
    const safe: CollegeOption[] = [];
    const target: CollegeOption[] = [];
    const dream: CollegeOption[] = [];

    colleges.forEach((college) => {
      const cutoff = Number(college.cutoff_percentile);
      const studentPercentile = request.percentile;

      // Safe: student percentile >= cutoff + SAFE_BUFFER
      if (studentPercentile >= cutoff + SAFE_BUFFER) {
        safe.push(college);
      }
      // Target: within buffer range (cutoff to cutoff + SAFE_BUFFER)
      else if (
        studentPercentile >= cutoff &&
        studentPercentile < cutoff + SAFE_BUFFER
      ) {
        target.push(college);
      }
      // Dream: student percentile < cutoff
      else {
        dream.push(college);
      }
    });

    return {
      safe,
      target,
      dream,
    };
  }
}
