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
});
