/*
 * Sanity-checks a single parsed cutoff row before it reaches Postgres.
 *
 * A malformed PDF-table extraction can silently produce a zero, negative, or
 * absurd rank/percentile that would otherwise insert cleanly (the schema only
 * requires these columns be nullable numerics) and then corrupt the
 * predictor's sqrt(rank) window and every cutoff comparison downstream. This
 * only checks shape/range, not truth — it cannot know a rank is wrong, only
 * that it is impossible.
 */
function isValidCutoffRow(row) {
  const { closing_rank, closing_percentile } = row;

  const hasRank = closing_rank !== null && closing_rank !== undefined;
  const hasPercentile =
    closing_percentile !== null && closing_percentile !== undefined;

  if (!hasRank && !hasPercentile) return false;

  if (hasRank && (!Number.isFinite(closing_rank) || closing_rank <= 0)) {
    return false;
  }

  if (hasPercentile) {
    const pct = Number(closing_percentile);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return false;
  }

  return true;
}

module.exports = { isValidCutoffRow };
