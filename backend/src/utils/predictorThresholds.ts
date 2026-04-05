/**
 * Rank-only windowing (Formula A): h = 50 * sqrt(rank)
 * Full relevant window: [rank - h, rank + h]
 *
 * Zone split over full window (2h total):
 * - Dream: 25%  => [rank - h, rank - 0.5h]
 * - Target: 40% => (rank - 0.5h, rank + 0.3h]
 * - Safe: 35%   => (rank + 0.3h, rank + h]
 */
export function getDynamicThresholds(rank: number): {
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
