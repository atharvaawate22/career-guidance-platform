"use client";

import { getCutoffCategoryColor } from "@/lib/cutoffCategoryColors";
import { getMinorityStatusLabel } from "@/lib/minorityStatus";

interface Props {
  college: {
    id: string; college_code: string; college_name: string;
    branch: string; category: string; college_status: string | null;
    stage: string; cutoff_rank: number | null; cutoff_percentile: number;
  };
  tier: "safe" | "target" | "dream";
}

const TIER = {
  safe:   { bar: "#16A34A", badge: { bg: "#D1FAE5", color: "#065F46" }, label: "Safe" },
  target: { bar: "#D97706", badge: { bg: "#FEF3C7", color: "#92400E" }, label: "Target" },
  dream:  { bar: "#2563EB", badge: { bg: "#DBEAFE", color: "#1E40AF" }, label: "Dream" },
} as const;

function formatRound(stage: string | null) {
  if (!stage) return "—";
  const n = stage.trim().toUpperCase();
  const map: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };
  return map[n] ? `CAP R${map[n]}` : stage;
}

export default function PredictorResultCard({ college, tier }: Props) {
  const t = TIER[tier];
  const minority = getMinorityStatusLabel(college.college_status);

  return (
    <article className="card card-hover relative overflow-hidden" style={{ borderRadius: ".75rem" }}>
      {/* Tier bar */}
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: t.bar }} />

      <div className="pl-4 pr-4 py-4">
        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
            style={{ background: t.badge.bg, color: t.badge.color }}>
            {t.label}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${getCutoffCategoryColor(college.category)}`}>
            {college.category}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
            style={{ background: "var(--ice-mid)", color: "var(--slate)", border: "1px solid var(--border)" }}>
            {formatRound(college.stage)}
          </span>
          {minority && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
              style={{ background: "#FDF4FF", color: "#7E22CE", border: "1px solid #E9D5FF" }}>
              {minority}
            </span>
          )}
        </div>

        {/* College name + branch */}
        <h4 className="text-sm font-bold leading-snug mb-0.5" style={{ color: "var(--ink)" }}>
          {college.college_name}
        </h4>
        <p className="text-xs mb-1" style={{ color: "var(--slate)" }}>{college.branch}</p>
        <p className="text-[10px] mb-3" style={{ color: "var(--slate-light)" }}>Code: {college.college_code}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-box">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate)" }}>Cutoff Rank</div>
            <div className="text-lg font-bold" style={{ color: t.bar, fontFamily: "var(--font-playfair)" }}>
            {/* Uses != null so that a rank of 0 is shown correctly rather
                than being treated as falsy and displaying "—". */}
              {college.cutoff_rank != null ? college.cutoff_rank.toLocaleString() : "—"}
            </div>
          </div>
          <div className="stat-box">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate)" }}>Percentile</div>
            <div className="text-lg font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
              {Number(college.cutoff_percentile).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
