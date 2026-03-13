import { PredictorRepository } from './predictor.repository';
import {
  PredictorRequest,
  PredictorResponse,
  CollegeOption,
} from './predictor.types';

const predictorRepository = new PredictorRepository();
const PREDICTOR_YEAR = 2025;

/**
 * Dynamic thresholds — fully continuous, no flat zones.
 *
 * targetAbove = min(8, 0.5 + (100 - p) * 0.1)
 *   0.5 base prevents the band collapsing at high %iles; differentiates 90–100% properly.
 *   p=99→0.6, p=98→0.7, p=95→1.0, p=90→1.5, p=80→2.5, p=70→3.5
 *
 * targetBelow = min(15, targetAbove * 2)
 *
 * floorGap = min(22, max(3, targetBelow * 1.5))
 *   ×1.5 keeps the safe floor tight (especially at high %iles).
 *   Min 3 ensures at least a few safe options always appear.
 *
 * ceilGap = min(15, max(5, targetAbove * 3))
 *   Dream ceiling stays at 5 for high %iles, grows at lower ones.
 *
 * Examples:
 *   p=99 → tA=0.6, tB=1.2, floor=3,    ceil=5    → Safe 96–97.8   | Target 97.8–99.6 | Dream 99.6–100  | Window 96–100
 *   p=98 → tA=0.7, tB=1.4, floor=3,    ceil=5    → Safe 95–96.6   | Target 96.6–98.7 | Dream 98.7–100  | Window 95–100
 *   p=95 → tA=1.0, tB=2.0, floor=3,    ceil=5    → Safe 92–93     | Target 93–96     | Dream 96–100    | Window 92–100
 *   p=90 → tA=1.5, tB=3.0, floor=4.5,  ceil=5    → Safe 85.5–87   | Target 87–91.5   | Dream 91.5–95   | Window 85.5–95
 *   p=85 → tA=2.0, tB=4.0, floor=6,    ceil=6    → Safe 79–81     | Target 81–87     | Dream 87–91     | Window 79–91
 *   p=80 → tA=2.5, tB=5.0, floor=7.5,  ceil=7.5  → Safe 72.5–75   | Target 75–82.5   | Dream 82.5–87.5 | Window 72.5–87.5
 *   p=70 → tA=3.5, tB=7.0, floor=10.5, ceil=10.5 → Safe 59.5–63   | Target 63–73.5   | Dream 73.5–80.5 | Window 59.5–80.5
 *   p=50 → tA=5.5, tB=11,  floor=16.5, ceil=15   → Safe 33.5–39   | Target 39–55.5   | Dream 55.5–65   | Window 33.5–65
 */
function getDynamicThresholds(percentile: number): {
  targetAbove: number;
  targetBelow: number;
  floorGap: number;
  ceilGap: number;
} {
  const targetAbove = Math.min(8, 0.5 + (100 - percentile) * 0.1);
  const targetBelow = Math.min(15, targetAbove * 2);
  const floorGap = Math.min(22, Math.max(3, targetBelow * 1.5));
  const ceilGap = Math.min(15, Math.max(5, targetAbove * 3));
  return { targetAbove, targetBelow, floorGap, ceilGap };
}

export class PredictorService {
  async predictColleges(request: PredictorRequest): Promise<PredictorResponse> {
    // Validate percentile
    if (
      request.percentile < 0 ||
      request.percentile > 100 ||
      isNaN(request.percentile)
    ) {
      throw new Error('Percentile must be between 0 and 100');
    }

    // Get eligible colleges from repository
    const colleges = await predictorRepository.getEligibleColleges({
      year: PREDICTOR_YEAR,
      category: request.category,
      gender: request.gender,
      level: request.level,
      preferred_branches: request.preferred_branches,
      cities: request.cities,
    });

    // Deduplicate: when multiple level rows exist for the same college+branch+category+gender,
    // keep only the one with the lowest cutoff (most accessible seat for the student)
    const seen = new Map<string, CollegeOption>();
    for (const college of colleges) {
      const key = `${college.college_name}||${college.branch}||${college.category}||${college.gender}`;
      const existing = seen.get(key);
      if (
        !existing ||
        Number(college.cutoff_percentile) < Number(existing.cutoff_percentile)
      ) {
        seen.set(key, college);
      }
    }
    const deduped = Array.from(seen.values());

    const { targetAbove, targetBelow, floorGap, ceilGap } =
      getDynamicThresholds(request.percentile);

    // Relevance window: exclude colleges too far from the student's percentile.
    // floorGap and ceilGap are dynamic — wider at lower percentiles, tighter at high ones.
    const s = request.percentile;
    const relevant = deduped.filter((c) => {
      const cutoff = Number(c.cutoff_percentile);
      return cutoff >= s - floorGap && cutoff <= s + ceilGap;
    });

    // Classify colleges based on student percentile
    const safe: CollegeOption[] = [];
    const target: CollegeOption[] = [];
    const dream: CollegeOption[] = [];

    relevant.forEach((college) => {
      const cutoff = Number(college.cutoff_percentile);

      // Safe: student's percentile is more than targetBelow% above the cutoff
      if (s > cutoff + targetBelow) {
        safe.push(college);
      }
      // Target: cutoff is within [s - targetBelow, s + targetAbove]
      else if (cutoff >= s - targetBelow && cutoff <= s + targetAbove) {
        target.push(college);
      }
      // Dream: cutoff is more than targetAbove% above student's percentile
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
