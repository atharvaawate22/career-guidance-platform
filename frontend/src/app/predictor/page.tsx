"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import MultiSelect from "@/components/MultiSelect";
import PredictorResultCard from "@/components/PredictorResultCard";
import {
  CANDIDATE_GENDER_OPTIONS,
} from "@/lib/candidateGender";
import { CUTOFF_CATEGORIES } from "@/lib/cutoffOptions";
import {
  getMinorityGroupOptions,
  MINORITY_TYPE_OPTIONS,
  getMinorityTypesForGroups,
} from "@/lib/minorityStatus";
import {
  STATIC_CUTOFF_BRANCHES,
  STATIC_CUTOFF_CITIES_CLEAN,
} from "@/lib/cutoffStaticMeta";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";
const PREDICTOR_YEAR = 2025;

/** Mirrors backend getDynamicThresholds — keep in sync */
function getThresholds(rank: number) {
  const h = Math.round(50 * Math.sqrt(rank));
  const targetAbove = Math.round(0.5 * h);
  const targetBelow = Math.round(0.3 * h);
  const floorGap = h;
  const ceilGap = h;
  return { targetAbove, targetBelow, floorGap, ceilGap };
}

interface CollegeOption {
  id: string;
  college_code: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  college_status: string | null;
  stage: string;
  cutoff_rank: number | null;
  cutoff_percentile: number;
  year: number;
}

interface PredictionResults {
  safe: CollegeOption[];
  target: CollegeOption[];
  dream: CollegeOption[];
  meta?: {
    inputMode: "rank" | "percentile";
    effectiveRank: number;
    inputPercentile?: number;
  };
}

export default function PredictorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PredictionResults | null>(null);

  // Form state
  const [inputMode, setInputMode] = useState<"percentile" | "rank">(
    "percentile"
  );
  const [percentile, setPercentile] = useState("");
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [includeTfws, setIncludeTfws] = useState(false);
  const [gender, setGender] = useState("");
  const [selectedMinorityTypes, setSelectedMinorityTypes] = useState<string[]>(
    []
  );
  const [selectedMinorityGroups, setSelectedMinorityGroups] = useState<
    string[]
  >([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Branch autocomplete
  const branchOptions = STATIC_CUTOFF_BRANCHES;
  const cityOptions = STATIC_CUTOFF_CITIES_CLEAN;

  useEffect(() => {
    if (selectedMinorityTypes.length > 0) return;
    if (selectedMinorityGroups.length > 0) {
      setSelectedMinorityGroups([]);
    }
  }, [selectedMinorityGroups, selectedMinorityTypes]);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === "percentile" && !percentile) {
      setError("Percentile is required");
      return;
    }
    if (inputMode === "rank" && !rank) {
      setError("Rank is required");
      return;
    }
    if (!gender) {
      setError("Please select gender to apply the correct seat rule.");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const preferred_branches = selectedBranches;

      const body: Record<string, unknown> = {
        year: PREDICTOR_YEAR,
        category,
        gender,
        include_tfws: includeTfws,
      };
      if (selectedMinorityTypes.length > 0) {
        body.minority_types = selectedMinorityTypes;
      }
      if (selectedMinorityGroups.length > 0) {
        body.minority_groups = selectedMinorityGroups;
      }
      if (inputMode === "percentile") body.percentile = Number(percentile);
      if (inputMode === "rank") body.rank = Number(rank);
      if (preferred_branches.length > 0)
        body.preferred_branches = preferred_branches;
      if (selectedCities.length > 0) body.cities = selectedCities;

      const res = await fetch(`${API_BASE_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) setResults(data.data);
      else setError(data.error?.message || "Failed to get predictions");
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (
    colleges: CollegeOption[],
    tier: "safe" | "target" | "dream",
    title: string
  ) => {
    const headingColors = {
      safe: "text-green-600",
      target: "text-amber-600",
      dream: "text-blue-600",
    };
    return (
      <div className="mb-10">
        <h3
          className={`text-2xl font-bold mb-4 flex items-center gap-3 ${headingColors[tier]}`}
        >
          {title}
          <span className="text-base font-medium text-gray-500">
            ({colleges.length} options)
          </span>
        </h3>
        {colleges.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl text-center text-gray-500 border border-gray-200">
            No {title.toLowerCase()} found with these filters
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {colleges.slice(0, 100).map((college) => (
                <PredictorResultCard
                  key={college.id}
                  college={college}
                  tier={tier}
                />
              ))}
            </div>
            {colleges.length > 100 && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
                Showing top 100 of {colleges.length} results - add more filters
                to narrow down
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const totalResults = results
    ? results.safe.length + results.target.length + results.dream.length
    : 0;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            College Predictor
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Based on MHT-CET 2025 CAP Round I cutoffs — enter your percentile or
            rank to see eligible colleges
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Predictions are generated from historical cutoff data (2025 CAP
            Round 1 dataset). Results are indicative, not guaranteed.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          {/* Card header */}
          <div className="bg-linear-to-r from-purple-50 via-white to-pink-50 px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Your Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Fill in your score and preferences to find matching colleges
            </p>
          </div>

          <form onSubmit={handlePredict} className="p-6 space-y-0">
            {/* ── Step 1: Your Score ──────────────────────────────── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                  1
                </span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Your Score
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input mode segmented control */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Input Type
                  </label>
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setInputMode("percentile")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                        inputMode === "percentile"
                          ? "bg-white shadow text-purple-700 font-semibold"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Percentile
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("rank")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                        inputMode === "rank"
                          ? "bg-white shadow text-purple-700 font-semibold"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Rank
                      <span className="ml-1 text-xs text-green-600 font-normal">
                        (more accurate)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Score input */}
                {inputMode === "percentile" ? (
                  <div>
                    <label
                      htmlFor="percentile"
                      className="block mb-2 text-sm font-medium text-gray-700"
                    >
                      Percentile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="percentile"
                      value={percentile}
                      onChange={(e) => setPercentile(e.target.value)}
                      min="0"
                      max="100"
                      step="0.0001"
                      required={inputMode === "percentile"}
                      placeholder="e.g., 96.5000"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Rank is estimated from available percentile data
                    </p>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="rank"
                      className="block mb-2 text-sm font-medium text-gray-700"
                    >
                      Rank <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="rank"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      min="1"
                      max="500000"
                      step="1"
                      required={inputMode === "rank"}
                      placeholder="e.g., 5000"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Best once your official rank is published
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 mb-6" />

            {/* ── Step 2: Candidate Profile ───────────────────────── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                  2
                </span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Candidate Profile
                </h3>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-linear-to-br from-white via-white to-purple-50/50 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                {/* Category */}
                <div className="xl:col-span-4">
                  <label
                    htmlFor="category"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>
                  <CustomSelect
                    id="category"
                    value={category}
                    onChange={(val) => {
                      setCategory(val);
                      if (val === "TFWS") setIncludeTfws(false);
                    }}
                    options={[
                      { value: "", label: "All Categories" },
                      ...CUTOFF_CATEGORIES.filter((c) => c !== "TFWS").map(
                        (c) => ({ value: c, label: c })
                      ),
                    ]}
                  />
                </div>

                {/* Gender */}
                <div className="xl:col-span-4">
                  <label
                    htmlFor="gender"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Gender
                  </label>
                  <CustomSelect
                    id="gender"
                    value={gender}
                    onChange={setGender}
                    options={[...CANDIDATE_GENDER_OPTIONS]}
                    placeholder="Select Gender"
                  />
                </div>

                <div className="xl:col-span-6">
                  <label
                    htmlFor="minorityType"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Minority Type
                  </label>
                  <MultiSelect
                    id="minorityType"
                    value={selectedMinorityTypes}
                    onChange={setSelectedMinorityTypes}
                    options={MINORITY_TYPE_OPTIONS}
                    placeholder="All Minority Types"
                  />
                </div>

                <div className="xl:col-span-6">
                  <label
                    htmlFor="minorityGroup"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Minority Group
                  </label>
                  <MultiSelect
                    id="minorityGroup"
                    value={selectedMinorityGroups}
                    onChange={(values) => {
                      if (selectedMinorityTypes.length === 0) return;
                      setSelectedMinorityGroups(values);
                      const impliedTypes = getMinorityTypesForGroups(values);
                      setSelectedMinorityTypes((current) =>
                        Array.from(new Set([...current, ...impliedTypes]))
                      );
                    }}
                    options={
                      selectedMinorityTypes.length > 0
                        ? getMinorityGroupOptions(selectedMinorityTypes)
                        : []
                    }
                    placeholder={
                      selectedMinorityTypes.length > 0
                        ? "All Minority Groups"
                        : "Select minority type first"
                    }
                    disabled={selectedMinorityTypes.length === 0}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Minority groups are available after selecting at least one
                    minority type.
                  </p>
                </div>

              </div>

              {/* TFWS toggle — styled card row */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              {category !== "TFWS" && (
                <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer select-none transition-all duration-150 md:col-span-2 xl:col-span-4 ${
                    includeTfws
                      ? "border-purple-300 bg-purple-50"
                      : "border-gray-200 bg-gray-50 hover:border-purple-200 hover:bg-purple-50/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={includeTfws}
                    onChange={(e) => setIncludeTfws(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-purple-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      Also include{" "}
                      <span className="text-purple-700 font-semibold">
                        TFWS
                      </span>{" "}
                      seats
                    </span>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Tuition Fee Waiver Scheme — for economically weaker
                      sections (income-based eligibility)
                    </p>
                  </div>
                </label>
              )}
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 px-4 py-3 text-sm text-gray-700 md:col-span-2 xl:col-span-4">
                <span className="font-semibold text-purple-700">
                  Seat rule:
                </span>{" "}
                Male candidates see gender-neutral seats only. Female
                candidates see gender-neutral and ladies seats.
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-gray-700 md:col-span-2 xl:col-span-4">
                <span className="font-semibold text-indigo-700">
                  Minority filters:
                </span>{" "}
                Add one or more minority types or groups only if they apply to
                you. Groups can be combined when eligible.
              </div>
              </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 mb-6" />

            {/* ── Step 3: Preferences ─────────────────────────────── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-white text-xs font-bold shrink-0">
                  3
                </span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Preferences
                </h3>
                <span className="text-xs text-gray-400 font-normal">
                  — optional, leave blank for all
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="branches"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Preferred Branches
                  </label>
                  <MultiSelect
                    id="branches"
                    value={selectedBranches}
                    onChange={setSelectedBranches}
                    options={branchOptions}
                    placeholder="All Branches"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cities"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Preferred Cities
                  </label>
                  <MultiSelect
                    id="cities"
                    value={selectedCities}
                    onChange={setSelectedCities}
                    options={cityOptions}
                    placeholder="All Cities"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-5 text-sm">
                {error}
              </div>
            )}

            {/* CTA banner */}
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center justify-between gap-3">
              <span>
                Results are purely cutoff-data based. For more accurate
                end-to-end guidance, book a consultation session.
              </span>
              <Link
                href="/book"
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors shrink-0"
              >
                Book a Session Now
              </Link>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? "Predicting…" : "Predict Colleges"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("percentile");
                  setPercentile("");
                  setRank("");
                  setCategory("");
                  setIncludeTfws(false);
                  setGender("");
                  setSelectedMinorityTypes([]);
                  setSelectedMinorityGroups([]);
                  setSelectedBranches([]);
                  setSelectedCities([]);
                  setResults(null);
                  setError("");
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4" />
            <div className="text-xl text-gray-700 font-medium">
              Analysing 2025 cutoffs...
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div>
            {/* Summary Banner */}
            <div className="grid grid-cols-2 gap-3 mb-8 sm:gap-4 lg:grid-cols-4">
              <div className="bg-white/80 rounded-2xl p-4 sm:p-5 border border-gray-200 shadow text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {totalResults}
                </div>
                <div className="text-sm text-gray-500 mt-1">Total Options</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 sm:p-5 border border-green-200 shadow text-center">
                <div className="text-3xl font-bold text-green-700">
                  {results.safe.length}
                </div>
                <div className="text-sm text-green-600 mt-1">Safe Colleges</div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 border border-amber-200 shadow text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {results.target.length}
                </div>
                <div className="text-sm text-amber-600 mt-1">
                  Target Colleges
                </div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 sm:p-5 border border-blue-200 shadow text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {results.dream.length}
                </div>
                <div className="text-sm text-blue-600 mt-1">Dream Colleges</div>
              </div>
            </div>

            {/* Legend – thresholds shown are dynamic based on the effective rank */}
            {(() => {
              const resolvedRank =
                results?.meta?.effectiveRank ??
                (inputMode === "rank" ? Number(rank) : Number.NaN);
              const r = resolvedRank;
              if (!Number.isFinite(r) || r <= 0) return null;
              const { floorGap, ceilGap } = getThresholds(r);
              const floorVal = Math.max(1, r - ceilGap).toLocaleString();
              const ceilVal = (r + floorGap).toLocaleString();
              return (
                <div className="bg-white/70 rounded-xl p-4 border border-gray-200 mb-8 flex flex-col gap-3 text-sm">
                  {results?.meta?.inputMode === "percentile" && (
                    <div className="text-purple-700 font-medium">
                      Your rank is likely to be around or slightly above{" "}
                      <span className="font-bold">
                        {results.meta.effectiveRank.toLocaleString()}
                      </span>
                      {results.meta.inputPercentile !== undefined && (
                        <span className="text-gray-500 font-normal">
                          {" "}
                          (from {results.meta.inputPercentile.toFixed(4)}{" "}
                          percentile)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-6 flex-wrap">
                    <div>
                      <span className="font-semibold text-green-600">Safe</span>{" "}
                      - colleges where your profile looks comfortably
                      competitive
                    </div>
                    <div>
                      <span className="font-semibold text-amber-600">
                        Target
                      </span>{" "}
                      - colleges that look realistic and worth strongly
                      considering
                    </div>
                    <div>
                      <span className="font-semibold text-blue-600">Dream</span>{" "}
                      - more competitive colleges that are still worth a try
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs border-t border-gray-100 pt-2">
                    Only colleges with cutoff ranks between{" "}
                    <span className="font-medium text-gray-500">
                      {floorVal}
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-gray-500">{ceilVal}</span>{" "}
                    are shown — colleges far outside this range are not relevant
                    for your rank basis.
                  </div>
                </div>
              );
            })()}

            {renderSection(
              results.safe,
              "safe",
              "Safe Colleges"
            )}
            {renderSection(
              results.target,
              "target",
              "Target Colleges"
            )}
            {renderSection(
              results.dream,
              "dream",
              "Dream Colleges"
            )}

            {totalResults === 0 && (
              <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl">
                <div className="text-xl text-gray-600">
                  No colleges found. Try adjusting category or branch filters.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
