"use client";

import { getCutoffCategoryColor } from "@/lib/cutoffCategoryColors";
import { getMinorityStatusLabel } from "@/lib/minorityStatus";

interface CutoffResultCardProps {
  cutoff: {
    id: string;
    year: number;
    college_code: string | null;
    college_name: string;
    branch: string;
    category: string;
    college_status: string | null;
    stage: string | null;
    percentile: number;
    cutoff_rank: number | null;
  };
}

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

  if (normalized.includes("ROUND") || normalized.includes("CAP")) {
    return stage;
  }

  return `Round ${stage}`;
}

export default function CutoffResultCard({ cutoff }: CutoffResultCardProps) {
  const minorityLabel = getMinorityStatusLabel(cutoff.college_status);

  return (
    <article className="rounded-2xl border border-gray-200 bg-linear-to-br from-white via-white to-purple-50/40 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                {cutoff.year}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getCutoffCategoryColor(
                  cutoff.category
                )}`}
              >
                {cutoff.category}
              </span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                {formatRound(cutoff.stage)}
              </span>
            </div>

            <h3 className="text-lg font-bold leading-snug text-gray-900">
              {cutoff.college_name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{cutoff.branch}</p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-purple-500">
              Percentile
            </div>
            <div className="mt-1 text-2xl font-bold text-purple-700">
              {Number(cutoff.percentile).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {cutoff.college_code && <span>Code: {cutoff.college_code}</span>}
          {minorityLabel && (
            <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 font-medium text-fuchsia-700">
              {minorityLabel}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Cutoff Rank
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">
              {cutoff.cutoff_rank ? cutoff.cutoff_rank.toLocaleString() : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Round
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {formatRound(cutoff.stage)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
