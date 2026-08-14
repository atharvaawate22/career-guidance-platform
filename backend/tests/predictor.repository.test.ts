import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

/**
 * Deliberate departure from the house convention of mocking at the repository
 * module boundary (see auth/booking/settings/predictor service tests): here the
 * unit under test IS the repository's SQL and placeholder generation, so the
 * seam has to move down to config/database. Mocking the module wholesale also
 * stops database.ts constructing a real pg Pool at import time.
 */
vi.mock('../src/config/database', () => ({
  query: queryMock,
  testConnection: vi.fn(),
  default: {},
}));

import { PredictorRepository } from '../src/modules/predictor/predictor.repository';

const repo = new PredictorRepository();

/**
 * Exercises every variable-width placeholder builder at once: a PWD_ category
 * (2 placeholders) plus include_tfws (1 more), gender (0), a minority group
 * with multiple aliases (1 + N), branches, cities, and both rank bounds. If the
 * shared `p` counter ever desynchronises from `values`, this shape catches it.
 */
const filters = {
  year: 2025,
  cap_round: 1,
  category: 'PWD_OBC',
  gender: 'Male',
  include_tfws: true,
  minority_types: ['religious'],
  minority_groups: ['roman_catholics'],
  preferred_branches: ['Computer Engineering'],
  cities: ['Pune'],
  min_cutoff_rank: 5000,
  max_cutoff_rank: 15000,
  effective_rank: 10000,
  target_above: 2500,
  target_below: 1500,
};

const lastCall = () => queryMock.mock.calls[0] as [string, unknown[]];

describe('PredictorRepository.getEligibleColleges', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it('caps rows per tier rather than applying one hardest-first limit', async () => {
    await repo.getEligibleColleges(filters);
    const [sql] = lastCall();

    expect(sql).toMatch(/row_number\(\)\s+OVER\s*\(\s*PARTITION BY t\.tier/);
    expect(sql).toMatch(/WHERE tier_rank <= 200/);
    // The bug: a flat cap after `ORDER BY cutoff_rank ASC` could only ever
    // truncate the Safe end of the list.
    expect(sql).not.toMatch(/LIMIT 800/);
  });

  /**
   * The highest-value assertion in this file. The repository composes its
   * WHERE clause from three builders that each consume a *variable* number of
   * placeholders, so any future filter change risks emitting a `$N` with no
   * corresponding value (or binding a value nothing references). Both are
   * silent failures in review and loud ones in production.
   */
  it('binds every placeholder it emits, with no gaps or overruns', async () => {
    await repo.getEligibleColleges(filters);
    const [sql, values] = lastCall();

    const used = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    const max = Math.max(...used);

    expect(max).toBe(values.length);
    for (let i = 1; i <= max; i += 1) {
      expect(used).toContain(i);
    }
  });

  it('allocates the tier boundaries after every WHERE-clause parameter', async () => {
    await repo.getEligibleColleges(filters);
    const [, values] = lastCall();

    expect(values.slice(-3)).toEqual([10000, 2500, 1500]);
  });

  it('emits the same tier ladder the service used to apply in JS', async () => {
    await repo.getEligibleColleges(filters);
    const [sql, values] = lastCall();

    // pRank = n-2, pAbove = n-1, pBelow = n
    const n = values.length;
    const flat = sql.replace(/\s+/g, ' ');

    expect(flat).toContain(
      `WHEN d.cutoff_rank > $${n - 2}::int + $${n}::int THEN 'safe'`,
    );
    expect(flat).toContain(
      `WHEN d.cutoff_rank >= $${n - 2}::int - $${n - 1}::int THEN 'target'`,
    );
  });

  it('still binds correctly with the minimal filter set', async () => {
    await repo.getEligibleColleges({
      year: 2025,
      cap_round: 1,
      effective_rank: 500,
      target_above: 559,
      target_below: 335,
    });
    const [sql, values] = lastCall();

    const used = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...used)).toBe(values.length);
    expect(values.slice(-3)).toEqual([500, 559, 335]);
  });
});

describe('PredictorRepository.estimateRankFromPercentile', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('interpolates between the bracketing points rather than snapping to one', async () => {
    queryMock.mockResolvedValue({ rows: [{ cutoff_rank: 12230 }] });

    const result = await repo.estimateRankFromPercentile(2025, 96.5);
    const [sql] = lastCall();

    expect(result).toBe(12230);
    // The interpolation itself, and the anchor that guarantees exactly one row.
    expect(sql.replace(/\s+/g, ' ')).toContain(
      '(a.rnk - b.rnk) * (($3::numeric - b.pct) / (a.pct - b.pct))',
    );
    expect(sql).toContain('FROM (VALUES (1)) AS anchor(one)');
  });

  // Contract preserved from the previous implementation: only a total absence
  // of usable data yields null, which PredictorService maps to a 422.
  it('returns null only when the single row comes back null', async () => {
    queryMock.mockResolvedValue({ rows: [{ cutoff_rank: null }] });
    await expect(repo.estimateRankFromPercentile(2025, 96.5)).resolves.toBeNull();
  });

  it('returns null when no row comes back at all', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await expect(repo.estimateRankFromPercentile(2025, 96.5)).resolves.toBeNull();
  });

  // Guards the explicit `=== null` check — `if (!estimated)` would send a
  // legitimate 0 down the 422 path by accident.
  it('does not treat a zero rank as a failed estimate', async () => {
    queryMock.mockResolvedValue({ rows: [{ cutoff_rank: 0 }] });
    await expect(repo.estimateRankFromPercentile(2025, 96.5)).resolves.toBe(0);
  });
});
