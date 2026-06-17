"use client";

import { getCutoffCategoryColor } from "@/lib/cutoffCategoryColors";
import { getMinorityStatusLabel } from "@/lib/minorityStatus";

interface Props {
  cutoff: {
    id: string; year: number;
    college_code: string | null; college_name: string;
    branch: string; category: string;
    college_status: string | null; cap_round: number;
    percentile: number | null; cutoff_rank: number | null;
  };
}

function formatRound(round: number | null) {
  if (!round) return "—";
  return `CAP Round ${round}`;
}

export default function CutoffResultCard({ cutoff }: Props) {
  const minority = getMinorityStatusLabel(cutoff.college_status);

  return (
    <article
      className="rounded-2xl border transition-all duration-200"
      style={{
        background: "var(--bg-primary)",
        borderColor: "var(--slate-200)",
        boxShadow: "var(--shadow-xs)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.borderColor = "var(--slate-300)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-xs)";
        e.currentTarget.style.borderColor = "var(--slate-200)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="p-4">
        {/* Header row: tags + percentile */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span
                className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: "var(--slate-100)", color: "var(--slate-600)", border: "1px solid var(--slate-200)" }}
              >
                {cutoff.year}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${getCutoffCategoryColor(cutoff.category)}`}>
                {cutoff.category}
              </span>
              <span
                className="text-[10px] font-medium px-2 py-1 rounded-lg"
                style={{ background: "var(--primary-50)", color: "var(--primary-700)", border: "1px solid var(--primary-200)" }}
              >
                {formatRound(cutoff.cap_round)}
              </span>
              {minority && (
                <span
                  className="text-[10px] font-medium px-2 py-1 rounded-lg"
                  style={{ background: "#FDF4FF", color: "#7E22CE", border: "1px solid #E9D5FF" }}
                >
                  {minority}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold leading-snug mb-0.5" style={{ color: "var(--slate-900)" }}>
              {cutoff.college_name}
            </h3>
            <p className="text-xs mb-1" style={{ color: "var(--slate-600)" }}>{cutoff.branch}</p>
            {cutoff.college_code && (
              <p className="text-[10px]" style={{ color: "var(--slate-400)" }}>Code: {cutoff.college_code}</p>
            )}
          </div>

          {/* Percentile badge */}
          <div
            className="shrink-0 text-right rounded-xl px-3.5 py-2.5"
            style={{
              background: "var(--primary-50)",
              border: "1px solid var(--primary-200)",
              minWidth: "80px",
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--primary-500)" }}>Percentile</div>
            <div className="text-xl font-bold leading-none" style={{ color: "var(--primary-700)", fontFamily: "var(--font-mono)" }}>
              {cutoff.percentile != null ? Number(cutoff.percentile).toFixed(2) : "—"}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--slate-50)", border: "1px solid var(--slate-100)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate-500)" }}>Cutoff Rank</div>
            <div className="text-base font-bold" style={{ color: "var(--slate-900)", fontFamily: "var(--font-mono)" }}>
              {cutoff.cutoff_rank != null ? cutoff.cutoff_rank.toLocaleString() : "—"}
            </div>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--slate-50)", border: "1px solid var(--slate-100)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate-500)" }}>Round</div>
            <div className="text-sm font-semibold" style={{ color: "var(--slate-900)" }}>
              {formatRound(cutoff.cap_round)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
