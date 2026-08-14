import { beforeEach, describe, expect, it, vi } from 'vitest';

const { estimateRankFromPercentileMock, getEligibleCollegesMock } = vi.hoisted(
  () => ({
    estimateRankFromPercentileMock: vi.fn(),
    getEligibleCollegesMock: vi.fn(),
  }),
);

vi.mock('../src/modules/predictor/predictor.repository', () => {
  return {
    PredictorRepository: class {
      estimateRankFromPercentile = estimateRankFromPercentileMock;
      getEligibleColleges = getEligibleCollegesMock;
    },
  };
});

import { PredictorService } from '../src/modules/predictor/predictor.service';

type Tier = 'dream' | 'target' | 'safe';

// `tier` is assigned by the repository's SQL now, so a mocked repository row
// has to carry it — the service only groups by it.
const makeCollege = (id: string, cutoff_rank: number, tier: Tier) => ({
  id,
  college_code: `C${id}`,
  college_name: `College ${id}`,
  branch: 'CE',
  category: 'OPEN',
  gender: null,
  college_status: null,
  level: 'State Level',
  stage: 'I',
  cutoff_rank,
  cutoff_percentile: 90,
  year: 2025,
  tier,
});

describe('predictor.service predictColleges', () => {
  const service = new PredictorService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when both rank and percentile are missing', async () => {
    await expect(service.predictColleges({})).rejects.toThrow(
      'Either rank or percentile is required',
    );
  });

  it('estimates rank from percentile and returns classified results', async () => {
    estimateRankFromPercentileMock.mockResolvedValueOnce(10000);
    getEligibleCollegesMock.mockResolvedValueOnce([
      {
        id: '1',
        college_code: 'C1',
        college_name: 'College A',
        branch: 'CE',
        category: 'OPEN',
        gender: null,
        college_status: null,
        level: 'State Level',
        stage: 'I',
        cutoff_rank: 13000,
        cutoff_percentile: 93.1,
        year: 2025,
        tier: 'safe',
      },
      {
        id: '2',
        college_code: 'C2',
        college_name: 'College B',
        branch: 'IT',
        category: 'OPEN',
        gender: null,
        college_status: null,
        level: 'State Level',
        stage: 'I',
        cutoff_rank: 10000,
        cutoff_percentile: 94.2,
        year: 2025,
        tier: 'target',
      },
      {
        id: '3',
        college_code: 'C3',
        college_name: 'College C',
        branch: 'AI',
        category: 'OPEN',
        gender: null,
        college_status: null,
        level: 'State Level',
        stage: 'I',
        cutoff_rank: 7000,
        cutoff_percentile: 96.5,
        year: 2025,
        tier: 'dream',
      },
    ]);

    const result = await service.predictColleges({
      percentile: 92.5,
      category: 'OPEN',
    });

    expect(result.meta.inputMode).toBe('percentile');
    expect(result.meta.effectiveRank).toBe(10000);
    expect(result.safe.length).toBeGreaterThan(0);
    expect(result.target.length).toBeGreaterThan(0);
    expect(result.dream.length).toBeGreaterThan(0);
  });

  it('throws when percentile rank estimation fails', async () => {
    estimateRankFromPercentileMock.mockResolvedValueOnce(null);

    await expect(service.predictColleges({ percentile: 88.2 })).rejects.toThrow(
      'Unable to estimate rank from percentile for the selected year',
    );
  });

  it('rank=1 classifies most colleges as safe', async () => {
    const rank = 1;
    getEligibleCollegesMock.mockResolvedValueOnce([
      makeCollege('1', 40, 'safe'),
      makeCollege('2', 1, 'target'),
    ]);

    const result = await service.predictColleges({ rank });
    expect(result.meta.effectiveRank).toBe(1);
    expect(result.meta.inputMode).toBe('rank');
    expect(result.safe.length).toBeGreaterThan(0);
    expect(result.dream).toHaveLength(0);
  });

  it('rank=200000 classifies most colleges as dream', async () => {
    const rank = 200000;
    getEligibleCollegesMock.mockResolvedValueOnce([
      makeCollege('1', 185000, 'dream'),
      makeCollege('2', rank, 'target'),
    ]);

    const result = await service.predictColleges({ rank });
    expect(result.meta.effectiveRank).toBe(rank);
    expect(result.dream.length).toBeGreaterThan(0);
  });

  it('returns empty results when no colleges match', async () => {
    getEligibleCollegesMock.mockResolvedValueOnce([]);

    const result = await service.predictColleges({ rank: 5000 });
    expect(result.safe).toHaveLength(0);
    expect(result.target).toHaveLength(0);
    expect(result.dream).toHaveLength(0);
  });

  /**
   * The tier boundaries used to be applied in JS here, and two tests pinned
   * them by asserting that a college at exactly `rank - targetAbove` (7500) is
   * Target not Dream, and one at exactly `rank + targetBelow` (11500) is Target
   * not Safe. Classification now happens in SQL, so the contract this service
   * owns is the *parameters* it derives and hands to the repository — those
   * same two boundaries, just asserted where they now live.
   */
  it('derives the tier boundaries and relevance window from the rank', async () => {
    getEligibleCollegesMock.mockResolvedValueOnce([]);

    await service.predictColleges({ rank: 10000 });

    // h = round(50 * sqrt(10000)) = 5000
    //   targetAbove = round(0.5h) = 2500  -> dream/target boundary at 7500
    //   targetBelow = round(0.3h) = 1500  -> target/safe  boundary at 11500
    //   floorGap = ceilGap = h            -> window [5000, 15000]
    expect(getEligibleCollegesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        effective_rank: 10000,
        target_above: 2500,
        target_below: 1500,
        min_cutoff_rank: 5000,
        max_cutoff_rank: 15000,
      }),
    );
  });

  it('clamps the relevance window floor to 1 for very low ranks', async () => {
    getEligibleCollegesMock.mockResolvedValueOnce([]);

    await service.predictColleges({ rank: 1 });

    expect(getEligibleCollegesMock).toHaveBeenCalledWith(
      expect.objectContaining({ min_cutoff_rank: 1 }),
    );
  });

  /**
   * Regression for the flat `LIMIT 800` the repository used to apply after
   * `ORDER BY cutoff_rank ASC` (hardest first), which could only ever truncate
   * the Safe end of the list.
   *
   * At rank 150,000: h = round(50*sqrt(150000)) = 19,365, so the window spans
   * [130,635, 169,365] — ~38,700 ranks through the densest part of the
   * distribution. Dream and Target alone exhausted 800 rows and the student was
   * shown an empty Safe tier. These rows are shaped the way the repository
   * returns them now: classified in SQL and already capped per tier.
   */
  it('returns a populated Safe tier at a high rank', async () => {
    const rank = 150000;
    const tierRows = (tier: Tier, base: number, n: number) =>
      Array.from({ length: n }, (_, i) => makeCollege(`${tier}-${i}`, base + i, tier));

    getEligibleCollegesMock.mockResolvedValueOnce([
      ...tierRows('dream', 130635, 200),
      ...tierRows('target', 140317, 200),
      ...tierRows('safe', 155811, 200),
    ]);

    const result = await service.predictColleges({ rank });

    expect(result.safe).toHaveLength(200);
    expect(result.target).toHaveLength(200);
    expect(result.dream).toHaveLength(200);
    // Every Safe row sits beyond the target/safe boundary (rank + targetBelow).
    expect(result.safe.every((c) => Number(c.cutoff_rank) > rank + 5810)).toBe(true);
    // Safe is displayed most-attainable-adjacent first...
    expect(Number(result.safe[0].cutoff_rank)).toBe(155811);
    // ...and Dream highest-rank (most attainable) first.
    expect(Number(result.dream[0].cutoff_rank)).toBe(130834);
    expect(result.meta.perTierLimit).toBe(200);
  });

  it('include_tfws=true path passes the flag through to repository', async () => {
    getEligibleCollegesMock.mockResolvedValueOnce([makeCollege('1', 5000, 'target')]);

    await service.predictColleges({ rank: 5000, include_tfws: true });

    expect(getEligibleCollegesMock).toHaveBeenCalledWith(
      expect.objectContaining({ include_tfws: true }),
    );
  });

  it('throws on invalid rank < 1', async () => {
    await expect(service.predictColleges({ rank: 0 })).rejects.toThrow(
      'Rank must be a positive number',
    );
  });

  it('throws on percentile > 100', async () => {
    await expect(service.predictColleges({ percentile: 101 })).rejects.toThrow(
      'Percentile must be between 0 and 100',
    );
  });
});
