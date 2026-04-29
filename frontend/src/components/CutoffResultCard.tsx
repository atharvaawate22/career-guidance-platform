"use client";

import { getCutoffCategoryColor } from "@/lib/cutoffCategoryColors";
import { getMinorityStatusLabel } from "@/lib/minorityStatus";

interface Props {
  cutoff: {
    id: string; year: number;
    college_code: string | null; college_name: string;
    branch: string; category: string;
    college_status: string | null; stage: string | null;
    percentile: number; cutoff_rank: number | null;
  };
}

function formatRound(stage: string | null) {
  if (!stage) return "—";
  const n = stage.trim().toUpperCase();
  const map: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };
  if (map[n]) return `CAP Round ${map[n]}`;
  if (n.includes("ROUND") || n.includes("CAP")) return stage;
  return `Round ${stage}`;
}

export default function CutoffResultCard({ cutoff }: Props) {
  const minority = getMinorityStatusLabel(cutoff.college_status);

  return (
    <article className="card card-hover" style={{ borderRadius: ".75rem" }}>
      <div className="p-4">
        {/* Header row: tags + percentile */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "var(--ice-mid)", color: "var(--slate)", border: "1px solid var(--border)" }}>
                {cutoff.year}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${getCutoffCategoryColor(cutoff.category)}`}>
                {cutoff.category}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                style={{ background: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE" }}>
                {formatRound(cutoff.stage)}
              </span>
              {minority && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                  style={{ background: "#FDF4FF", color: "#7E22CE", border: "1px solid #E9D5FF" }}>
                  {minority}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold leading-snug mb-0.5" style={{ color: "var(--ink)" }}>
              {cutoff.college_name}
            </h3>
            <p className="text-xs mb-1" style={{ color: "var(--slate)" }}>{cutoff.branch}</p>
            {cutoff.college_code && (
              <p className="text-[10px]" style={{ color: "var(--slate-light)" }}>Code: {cutoff.college_code}</p>
            )}
          </div>

          {/* Percentile badge */}
          <div className="shrink-0 text-right rounded-xl px-3.5 py-2.5"
            style={{ background: "var(--navy)", border: "1px solid var(--navy-border)", minWidth: "80px" }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--slate-light)" }}>Percentile</div>
            <div className="text-xl font-bold leading-none" style={{ color: "var(--gold)", fontFamily: "var(--font-playfair)" }}>
              {Number(cutoff.percentile).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="stat-box">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate)" }}>Cutoff Rank</div>
            <div className="text-base font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
            {/* Uses != null so that a rank of 0 is shown correctly rather
                than being treated as falsy and displaying "—". */}
              {cutoff.cutoff_rank != null ? cutoff.cutoff_rank.toLocaleString() : "—"}
            </div>
          </div>
          <div className="stat-box">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate)" }}>Round</div>
            <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {formatRound(cutoff.stage)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
