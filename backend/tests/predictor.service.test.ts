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

const makeCollege = (id: string, cutoff_rank: number) => ({
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
      makeCollege('1', 40),
      makeCollege('2', 1),
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
      makeCollege('1', 185000),
      makeCollege('2', rank),
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

  it('college exactly at rank - targetAbove is classified as target not dream', async () => {
    const rank = 10000;
    getEligibleCollegesMock.mockResolvedValueOnce([makeCollege('1', 7500)]);

    const result = await service.predictColleges({ rank });
    expect(result.target).toHaveLength(1);
    expect(result.dream).toHaveLength(0);
  });

  it('college exactly at rank + targetBelow is classified as target not safe', async () => {
    const rank = 10000;
    getEligibleCollegesMock.mockResolvedValueOnce([makeCollege('1', 11500)]);

    const result = await service.predictColleges({ rank });
    expect(result.target).toHaveLength(1);
    expect(result.safe).toHaveLength(0);
  });

  it('include_tfws=true path passes the flag through to repository', async () => {
    getEligibleCollegesMock.mockResolvedValueOnce([makeCollege('1', 5000)]);

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
