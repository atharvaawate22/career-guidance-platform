"use client";

import { getCutoffCategoryColor } from "@/lib/cutoffCategoryColors";
import { getMinorityStatusLabel } from "@/lib/minorityStatus";

interface PredictorResultCardProps {
  college: {
    id: string;
    college_code: string;
    college_name: string;
    branch: string;
    category: string;
    college_status: string | null;
    stage: string;
    cutoff_rank: number | null;
    cutoff_percentile: number;
  };
  tier: "safe" | "target" | "dream";
}

const TIER_STYLES = {
  safe: {
    shell: "border-green-200 bg-linear-to-br from-green-50 via-white to-emerald-50",
    accent: "bg-green-600",
    tag: "bg-green-100 text-green-700",
    label: "Safe Pick",
  },
  target: {
    shell: "border-amber-200 bg-linear-to-br from-amber-50 via-white to-yellow-50",
    accent: "bg-amber-500",
    tag: "bg-amber-100 text-amber-700",
    label: "Target Pick",
  },
  dream: {
    shell: "border-blue-200 bg-linear-to-br from-blue-50 via-white to-indigo-50",
    accent: "bg-blue-600",
    tag: "bg-blue-100 text-blue-700",
    label: "Dream Pick",
  },
} as const;

function formatRound(stage: string | null) {
  if (!stage) return "Round -";

  const normalized = stage.trim().toUpperCase();
  const romanToNumber: Record<string, string> = {
    I: "1",
    II: "2",
    III: "3",
    IV: "4",
  };

  if (romanToNumber[normalized]) {
    return `CAP Round ${romanToNumber[normalized]}`;
  }

  return stage;
}

export default function PredictorResultCard({
  college,
  tier,
}: PredictorResultCardProps) {
  const style = TIER_STYLES[tier];
  const minorityLabel = getMinorityStatusLabel(college.college_status);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg ${style.shell}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${style.accent}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style.tag}`}
              >
                {style.label}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getCutoffCategoryColor(
                  college.category
                )}`}
              >
                {college.category}
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-gray-600 border border-gray-200">
                {formatRound(college.stage)}
              </span>
            </div>

            <h4 className="text-lg font-bold leading-snug text-gray-900">
              {college.college_name}
            </h4>
            <p className="mt-1 text-sm text-gray-600">{college.branch}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Code: {college.college_code}</span>
              {minorityLabel && (
                <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 font-medium text-fuchsia-700">
                  {minorityLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Cutoff Rank
            </div>
            <div className="mt-1 text-xl font-bold text-purple-700">
              {college.cutoff_rank
                ? college.cutoff_rank.toLocaleString()
                : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Percentile
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">
              {Number(college.cutoff_percentile).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
