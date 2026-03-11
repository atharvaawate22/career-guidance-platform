"use client";

import { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";
import MultiSelect from "@/components/MultiSelect";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const CATEGORIES = [
  "OPEN",
  "SC",
  "ST",
  "VJ",
  "NT1",
  "NT2",
  "NT3",
  "OBC",
  "EWS",
  "TFWS",
  "DEF_OPEN",
  "DEF_OBC",
  "PWD_OPEN",
];

const LEVELS = [
  { value: "State Level", label: "State Level (All India Seats)" },
  { value: "Home University Level", label: "Home University Level" },
  {
    value: "Other Than Home University Level",
    label: "Other Than Home University Level",
  },
];

interface CollegeOption {
  id: string;
  college_code: string;
  college_name: string;
  branch: string;
  category: string;
  gender: string | null;
  level: string;
  stage: string;
  cutoff_rank: number | null;
  cutoff_percentile: number;
  year: number;
}

interface PredictionResults {
  safe: CollegeOption[];
  target: CollegeOption[];
  dream: CollegeOption[];
}

export default function PredictorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PredictionResults | null>(null);

  // Form state
  const [percentile, setPercentile] = useState("");
  const [year, setYear] = useState("2022");
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("All");
  const [level, setLevel] = useState("State Level");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  // Branch autocomplete
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${NEXT_PUBLIC_API_BASE_URL}/api/cutoffs/meta?year=${year}`
        );
        const d = await res.json();
        if (d.success) setBranchOptions(d.data.branches);
      } catch {
        /* ignore */
      }
    };
    load();
  }, [year]);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!percentile) {
      setError("Percentile is required");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const preferred_branches = selectedBranches;

      const body: Record<string, unknown> = {
        percentile: Number(percentile),
        year: Number(year),
        category,
        gender,
        level,
      };
      if (preferred_branches.length > 0)
        body.preferred_branches = preferred_branches;

      const res = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/api/predict`, {
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

  const renderBadge = (tier: "safe" | "target" | "dream") => {
    const map = {
      safe: {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-200",
        dot: "bg-green-500",
        label: "Safe",
      },
      target: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        border: "border-yellow-200",
        dot: "bg-yellow-500",
        label: "Target",
      },
      dream: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
        label: "Dream",
      },
    };
    const s = map[tier];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 ${s.bg} ${s.text} rounded-full text-xs font-medium border ${s.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  const renderSection = (
    colleges: CollegeOption[],
    tier: "safe" | "target" | "dream",
    title: string,
    accent: string
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`bg-linear-to-r ${accent}`}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      College
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Branch
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Level
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Cutoff %
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Rank
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colleges.slice(0, 100).map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-gray-100 hover:bg-purple-50/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {c.college_name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Code: {c.college_code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.branch}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {c.level}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-700">
                        {Number(c.cutoff_percentile).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {c.cutoff_rank ? c.cutoff_rank.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {colleges.length > 100 && (
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td
                        colSpan={6}
                        className="px-4 py-3 text-center text-sm text-gray-500"
                      >
                        Showing top 100 of {colleges.length} results — add more
                        filters to narrow down
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalResults = results
    ? results.safe.length + results.target.length + results.dream.length
    : 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            College Predictor
          </h1>
          <p className="text-gray-600 text-lg">
            Based on MHT-CET 2022 CAP Round I cutoffs — enter your percentile to
            see eligible colleges
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-5 text-gray-800">
            Your Details
          </h2>
          <form onSubmit={handlePredict}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              {/* Percentile */}
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
                  required
                  placeholder="e.g., 92.5000"
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  4 decimal places (as on your scorecard)
                </p>
              </div>

              {/* Year */}
              <div>
                <label
                  htmlFor="year"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Year <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  id="year"
                  value={year}
                  onChange={setYear}
                  options={[{ value: "2022", label: "2022" }]}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  More years coming soon
                </p>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <CustomSelect
                  id="category"
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
              </div>

              {/* Gender */}
              <div>
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
                  options={[
                    { value: "All", label: "All (General seats)" },
                    { value: "Female", label: "Female (Ladies seats only)" },
                  ]}
                />
              </div>

              {/* Level */}
              <div>
                <label
                  htmlFor="level"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Seat Level
                </label>
                <CustomSelect
                  id="level"
                  value={level}
                  onChange={setLevel}
                  options={LEVELS.map((l) => ({
                    value: l.value,
                    label: l.label,
                  }))}
                />
              </div>

              {/* Preferred Branches */}
              <div>
                <label
                  htmlFor="branches"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Preferred Branches (Optional)
                </label>
                <MultiSelect
                  id="branches"
                  value={selectedBranches}
                  onChange={setSelectedBranches}
                  options={branchOptions}
                  placeholder="Search and select branches..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Select one or more. Leave blank for all branches.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? "Predicting..." : "Predict Colleges"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPercentile("");
                  setCategory("OPEN");
                  setGender("All");
                  setLevel("State Level");
                  setSelectedBranches([]);
                  setResults(null);
                  setError("");
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
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
              Analysing 14,000+ cutoffs...
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div>
            {/* Summary Banner */}
            <div className="flex gap-4 mb-8 flex-wrap">
              <div className="flex-1 min-w-40 bg-white/80 rounded-2xl p-5 border border-gray-200 shadow text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {totalResults}
                </div>
                <div className="text-sm text-gray-500 mt-1">Total Options</div>
              </div>
              <div className="flex-1 min-w-40 bg-green-50 rounded-2xl p-5 border border-green-200 shadow text-center">
                <div className="text-3xl font-bold text-green-700">
                  {results.safe.length}
                </div>
                <div className="text-sm text-green-600 mt-1">Safe Colleges</div>
              </div>
              <div className="flex-1 min-w-40 bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {results.target.length}
                </div>
                <div className="text-sm text-amber-600 mt-1">
                  Target Colleges
                </div>
              </div>
              <div className="flex-1 min-w-40 bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {results.dream.length}
                </div>
                <div className="text-sm text-blue-600 mt-1">Dream Colleges</div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white/70 rounded-xl p-4 border border-gray-200 mb-8 flex gap-6 flex-wrap text-sm">
              <div>
                <span className="font-semibold text-green-600">Safe</span> —
                Your percentile is ≥ 3% above cutoff
              </div>
              <div>
                <span className="font-semibold text-amber-600">Target</span> —
                Your percentile is within 3% of cutoff
              </div>
              <div>
                <span className="font-semibold text-blue-600">Dream</span> —
                Your percentile is below the cutoff
              </div>
            </div>

            {renderSection(
              results.safe,
              "safe",
              "🟢 Safe Colleges",
              "from-green-50 to-emerald-50"
            )}
            {renderSection(
              results.target,
              "target",
              "🎯 Target Colleges",
              "from-amber-50 to-yellow-50"
            )}
            {renderSection(
              results.dream,
              "dream",
              "⭐ Dream Colleges",
              "from-blue-50 to-indigo-50"
            )}

            {totalResults === 0 && (
              <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl">
                <div className="text-xl text-gray-600">
                  No colleges found. Try adjusting category, level, or branch
                  filters.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
