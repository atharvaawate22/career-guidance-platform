import { PredictorRepository } from './predictor.repository';
import {
  PredictorRequest,
  PredictorResponse,
  CollegeOption,
} from './predictor.types';

const predictorRepository = new PredictorRepository();
const PREDICTOR_YEAR = 2025;

/**
 * Rank-only windowing (Formula A): h = 50 * sqrt(rank)
 * Full relevant window: [rank - h, rank + h]
 *
 * Zone split over full window (2h total):
 * - Dream: 25%  => [rank - h, rank - 0.5h]
 * - Target: 40% => (rank - 0.5h, rank + 0.3h]
 * - Safe: 35%   => (rank + 0.3h, rank + h]
 */
function getDynamicThresholds(rank: number): {
  targetAbove: number;
  targetBelow: number;
  floorGap: number;
  ceilGap: number;
} {
  const h = Math.round(50 * Math.sqrt(rank));
  const targetAbove = Math.round(0.5 * h);
  const targetBelow = Math.round(0.3 * h);
  const floorGap = h;
  const ceilGap = h;
  return { targetAbove, targetBelow, floorGap, ceilGap };
}

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

    // Get eligible colleges from repository
    const colleges = await predictorRepository.getEligibleColleges({
      year: PREDICTOR_YEAR,
      category: request.category,
      gender: request.gender,
      level: request.level,
      preferred_branches: request.preferred_branches,
      cities: request.cities,
      include_tfws: request.include_tfws,
    });

    // Deduplicate: when multiple level rows exist for the same college+branch+category+gender,
    // keep only the one with the highest cutoff_rank (most accessible = easiest to get into)
    const seen = new Map<string, CollegeOption>();
    for (const college of colleges) {
      const key = `${college.college_name}||${college.branch}||${college.category}||${college.gender}`;
      const existing = seen.get(key);
      if (
        !existing ||
        Number(college.cutoff_rank ?? 0) > Number(existing.cutoff_rank ?? 0)
      ) {
        seen.set(key, college);
      }
    }
    const deduped = Array.from(seen.values());

    const { targetAbove, targetBelow, floorGap, ceilGap } =
      getDynamicThresholds(effectiveRank);

    // Relevance window: in rank space, lower rank = better.
    // Include colleges with cutoff_rank in [r - ceilGap, r + floorGap].
    const r = effectiveRank;
    const relevant = deduped.filter((c) => {
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
      },
    };
  }
}
