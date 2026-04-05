import { PredictorRepository } from './predictor.repository';
import {
  PredictorRequest,
  PredictorResponse,
  CollegeOption,
} from './predictor.types';
import { getDynamicThresholds } from '../../utils/predictorThresholds';

const predictorRepository = new PredictorRepository();
const PREDICTOR_YEAR = parseInt(process.env.PREDICTOR_YEAR || '2025', 10);

export class PredictorService {
  async predictColleges(request: PredictorRequest): Promise<PredictorResponse> {
    // Validate at least one score input
    if (
      (request.rank === undefined || request.rank === null) &&
      (request.percentile === undefined || request.percentile === null)
    ) {
      throw new Error('Either rank or percentile is required');
    }

    if (
      request.rank !== undefined &&
      (request.rank < 1 || isNaN(request.rank))
    ) {
      throw new Error('Rank must be a positive number');
    }

    if (
      request.percentile !== undefined &&
      (request.percentile < 0 ||
        request.percentile > 100 ||
        isNaN(request.percentile))
    ) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const inputMode: 'rank' | 'percentile' =
      request.rank !== undefined && request.rank !== null
        ? 'rank'
        : 'percentile';

    let effectiveRank: number;
    if (inputMode === 'rank') {
      effectiveRank = Number(request.rank);
    } else {
      const estimatedRank =
        await predictorRepository.estimateRankFromPercentile(
          PREDICTOR_YEAR,
          Number(request.percentile),
        );
      if (!estimatedRank) {
        throw new Error(
          'Unable to estimate rank from percentile for the selected year',
        );
      }
      effectiveRank = estimatedRank;
    }

    const { targetAbove, targetBelow, floorGap, ceilGap } =
      getDynamicThresholds(effectiveRank);

    // Apply relevance window in SQL to avoid scanning and transferring rows
    // that will be discarded during post-processing.
    const colleges = await predictorRepository.getEligibleColleges({
      year: PREDICTOR_YEAR,
      category: request.category,
      gender: request.gender,
      minority_types: request.minority_types,
      minority_groups: request.minority_groups,
      level: request.level,
      preferred_branches: request.preferred_branches,
      cities: request.cities,
      include_tfws: request.include_tfws,
      min_cutoff_rank: Math.max(1, effectiveRank - ceilGap),
      max_cutoff_rank: effectiveRank + floorGap,
    });

    // Relevance window: in rank space, lower rank = better.
    // Include colleges with cutoff_rank in [r - ceilGap, r + floorGap].
    const r = effectiveRank;
    const relevant = colleges.filter((c) => {
      const cr = Number(c.cutoff_rank);
      if (!cr) return false; // skip null ranks
      return cr >= r - ceilGap && cr <= r + floorGap;
    });

    // Classify colleges based on student rank (lower rank = better score)
    const safe: CollegeOption[] = [];
    const target: CollegeOption[] = [];
    const dream: CollegeOption[] = [];

    relevant.forEach((college) => {
      const cr = Number(college.cutoff_rank);

      // Safe: cutoff rank is well above student's rank (college easier to get into)
      if (cr > r + targetBelow) {
        safe.push(college);
      }
      // Target: cutoff rank is close to student's rank (within ±threshold)
      else if (cr >= r - targetAbove && cr <= r + targetBelow) {
        target.push(college);
      }
      // Dream: cutoff rank is well below student's rank (harder to get into)
      else {
        dream.push(college);
      }
    });

    // Sort: lower cutoff rank = better/harder college; most attainable dream first
    safe.sort((a, b) => Number(a.cutoff_rank) - Number(b.cutoff_rank));
    target.sort((a, b) => Number(a.cutoff_rank) - Number(b.cutoff_rank));
    dream.sort((a, b) => Number(b.cutoff_rank) - Number(a.cutoff_rank));

    return {
      safe,
      target,
      dream,
      meta: {
        inputMode,
        effectiveRank,
        inputPercentile:
          inputMode === 'percentile' ? Number(request.percentile) : undefined,
        windowFloor: Math.max(1, effectiveRank - ceilGap),
        windowCeil: effectiveRank + floorGap,
      },
    };
  }
}
