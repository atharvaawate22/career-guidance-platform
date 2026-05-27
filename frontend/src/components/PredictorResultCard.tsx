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
  safe:   { bar: "var(--success-600)", badge: { bg: "var(--success-50)", color: "var(--success-700)" }, label: "Safe" },
  target: { bar: "var(--warning-500)", badge: { bg: "var(--warning-50)", color: "var(--warning-700)" }, label: "Target" },
  dream:  { bar: "var(--primary-500)", badge: { bg: "var(--primary-50)", color: "var(--primary-700)" }, label: "Dream" },
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
    <article
      className="relative overflow-hidden rounded-2xl border transition-all duration-200"
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
      {/* Tier bar */}
      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: t.bar }} />

      <div className="pl-5 pr-4 py-4">
        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide"
            style={{ background: t.badge.bg, color: t.badge.color }}
          >
            {t.label}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${getCutoffCategoryColor(college.category)}`}>
            {college.category}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-1 rounded-lg"
            style={{ background: "var(--slate-100)", color: "var(--slate-600)", border: "1px solid var(--slate-200)" }}
          >
            {formatRound(college.stage)}
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

        {/* College name + branch */}
        <h4 className="text-sm font-bold leading-snug mb-0.5" style={{ color: "var(--slate-900)" }}>
          {college.college_name}
        </h4>
        <p className="text-xs mb-1" style={{ color: "var(--slate-600)" }}>{college.branch}</p>
        <p className="text-[10px] mb-3" style={{ color: "var(--slate-400)" }}>Code: {college.college_code}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--slate-50)", border: "1px solid var(--slate-100)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate-500)" }}>Cutoff Rank</div>
            <div className="text-lg font-bold" style={{ color: t.bar, fontFamily: "var(--font-mono)" }}>
              {college.cutoff_rank != null ? college.cutoff_rank.toLocaleString() : "—"}
            </div>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--slate-50)", border: "1px solid var(--slate-100)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--slate-500)" }}>Percentile</div>
            <div className="text-lg font-bold" style={{ color: "var(--slate-900)", fontFamily: "var(--font-mono)" }}>
              {Number(college.cutoff_percentile).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
