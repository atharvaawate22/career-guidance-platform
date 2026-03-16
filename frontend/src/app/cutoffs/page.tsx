"use client";

import { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";
import ComboBox from "@/components/ComboBox";
import MultiSelect from "@/components/MultiSelect";
import { CUTOFF_CATEGORIES, CUTOFF_LEVELS } from "@/lib/cutoffOptions";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";
const DEFAULT_META_YEAR = "2025";

const fetchWithTimeout = async (url: string, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

interface CutoffData {
  id: string;
  year: number;
  college_code: string | null;
  college_name: string;
  branch_code: string | null;
  branch: string;
  category: string;
  gender: string | null;
  college_status: string | null;
  stage: string | null;
  level: string | null;
  percentile: number;
  cutoff_rank: number | null;
}

interface CollegeOption {
  code: string | null;
  name: string;
}

interface CutoffMetaResponse {
  colleges?: CollegeOption[];
  branches?: string[];
  cities?: string[];
}

type SortOption =
  | "percentile-desc"
  | "percentile-asc"
  | "rank-asc"
  | "rank-desc"
  | "college-asc"
  | "branch-asc"
  | "round-asc";

function formatRound(stage: string | null) {
  if (!stage) return "—";

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
export default function CutoffsPage() {
  const [cutoffs, setCutoffs] = useState<CutoffData[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("percentile-desc");

  // Filter state — declared BEFORE the useEffect that depends on 'year'
  const [year, setYear] = useState(DEFAULT_META_YEAR);
  const [collegeName, setCollegeName] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [level, setLevel] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Autocomplete state
  const [collegeOptions, setCollegeOptions] = useState<CollegeOption[]>([]);
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  // Stable DTE college_code for the currently selected college (null = free-text)
  const [collegeCode, setCollegeCode] = useState<string | null>(null);

  // v2 cache key — stores CollegeOption[] (code+name) instead of plain string[]
  const metaCacheKey = (yearValue: string) =>
    `cutoffs:meta:v2:${yearValue || "all"}`;  

  const fetchMeta = async (opts?: {
    college?: string;
    branches?: string[];
    cities?: string[];
  }) => {
    const params = new URLSearchParams();
    const isBaseMetaRequest =
      !opts?.college &&
      !(opts?.branches?.length ?? 0) &&
      !(opts?.cities?.length ?? 0);

    // Avoid expensive all-years metadata by default; use latest year metadata for quick dropdown UX.
    const metadataYear = year || DEFAULT_META_YEAR;
    if (metadataYear) params.set("year", metadataYear);
    if (opts?.college) params.set("college_name", opts.college);
    opts?.branches?.forEach((b) => params.append("branch", b));
    opts?.cities?.forEach((c) => params.append("city", c));

    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetchWithTimeout(
            `${API_BASE_URL}/api/cutoffs/meta?${params.toString()}`
          );
          if (!res.ok) {
            throw new Error(`Meta fetch failed with status ${res.status}`);
          }

          const data = await res.json();
          if (!data.success) {
            throw new Error("Meta endpoint returned unsuccessful response");
          }

          let colleges: CollegeOption[] = data.data.colleges ?? [];
          let branches = data.data.branches ?? [];
          let cities = data.data.cities ?? [];

          // If a year-specific query returns empty metadata, fallback to all-years list.
          if (
            isBaseMetaRequest &&
            metadataYear &&
            colleges.length === 0 &&
            branches.length === 0 &&
            cities.length === 0
          ) {
            const fallbackRes = await fetchWithTimeout(
              `${API_BASE_URL}/api/cutoffs/meta?year=${DEFAULT_META_YEAR}`
            );
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (fallbackData.success) {
                colleges = (fallbackData.data.colleges as CollegeOption[]) ?? [];
                branches = fallbackData.data.branches ?? [];
                cities = fallbackData.data.cities ?? [];
              }
            }
          }

          if (!opts?.college) setCollegeOptions(colleges);
          if (!opts?.branches?.length) setBranchOptions(branches);
          if (!opts?.college && !opts?.branches?.length) {
            setCityOptions(cities);
          }

          // Cache only base metadata (no narrowing filters) for instant next load.
          if (!opts) {
            localStorage.setItem(
              metaCacheKey(year),
              JSON.stringify({
                colleges,
                branches,
                cities,
              })
            );
          }

          return;
        } catch {
          if (attempt === 3)
            throw new Error("Failed to load dropdown metadata");
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    } catch {
      // Keep existing cached values; this avoids blank dropdowns on transient failures.
    }
  };

  const prefetchYearMeta = async (yearValue: string) => {
    try {
      const params = new URLSearchParams();
      if (yearValue) params.set("year", yearValue);
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/api/cutoffs/meta?${params.toString()}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      localStorage.setItem(
        metaCacheKey(yearValue),
        JSON.stringify({
          colleges: data.data.colleges ?? [],
          branches: data.data.branches ?? [],
          cities: data.data.cities ?? [],
        })
      );
    } catch {
      // Ignore prefetch failures.
    }
  };

  // Fetch full meta on year change (resets both lists)
  useEffect(() => {
    // Load cached base metadata immediately for snappy dropdowns.
    try {
      const cached = localStorage.getItem(metaCacheKey(year));
      if (cached) {
        const parsed = JSON.parse(cached) as CutoffMetaResponse;
        setCollegeOptions(parsed.colleges ?? []);
        setBranchOptions(parsed.branches ?? []);
        setCityOptions(parsed.cities ?? []);
      }
    } catch {
      // Ignore cache parse errors and continue with network fetch.
    }

    // Refresh from network in background.
    fetchMeta();
    setCollegeName("");
    setCollegeCode(null);
    setSelectedBranches([]);
    setSelectedCities([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Preload key years in background once for faster year switches.
  useEffect(() => {
    prefetchYearMeta("2025");
    prefetchYearMeta("2022");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When college changes: narrow branches to only those in that college
  const handleCollegeChange = (value: string) => {
    setCollegeName(value);
    // When the user picks a name from the dropdown, store its DTE code so the
    // search can filter by college_code (exact, year-stable) rather than by
    // college_name ILIKE (which breaks when names differ slightly across years).
    const match = collegeOptions.find((c) => c.name === value);
    setCollegeCode(match?.code ?? null);
    if (value) {
      fetchMeta({ college: value });
    } else {
      fetchMeta(
        selectedBranches.length || selectedCities.length
          ? {
              branches: selectedBranches.length ? selectedBranches : undefined,
              cities: selectedCities.length ? selectedCities : undefined,
            }
          : undefined
      );
    }
  };

  // When branches change: narrow colleges to those that have at least one selected branch
  const handleBranchesChange = (values: string[]) => {
    setSelectedBranches(values);
    fetchMeta({
      branches: values.length ? values : undefined,
      cities: selectedCities.length ? selectedCities : undefined,
    });
  };

  // When cities change: narrow colleges to those in selected cities
  const handleCitiesChange = (values: string[]) => {
    setSelectedCities(values);
    fetchMeta({
      branches: selectedBranches.length ? selectedBranches : undefined,
      cities: values.length ? values : undefined,
    });
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (year) params.append("year", year);
      selectedBranches.forEach((b) => params.append("branch", b));
      if (category) params.append("category", category);
      if (gender) params.append("gender", gender);
      // Prefer college_code (stable across years) over name-based ILIKE matching
      if (collegeCode) params.append("college_code", collegeCode);
      else if (collegeName) params.append("college_name", collegeName);
      if (level) params.append("level", level);
      selectedCities.forEach((c) => params.append("city", c));

      const response = await fetch(
        `${API_BASE_URL}/api/cutoffs?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setCutoffs(data.data);
        setTotal(data.total);
      } else {
        setError("Failed to fetch cutoffs");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setYear(DEFAULT_META_YEAR);
    setSelectedBranches([]);
    setCategory("");
    setGender("");
    setCollegeName("");
    setCollegeCode(null);
    setLevel("");
    setSelectedCities([]);
    setCutoffs([]);
    setTotal(null);
    setError("");
    setHasSearched(false);
    fetchMeta();
  };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      OPEN: "bg-blue-100 text-blue-700",
      SC: "bg-green-100 text-green-700",
      ST: "bg-orange-100 text-orange-700",
      OBC: "bg-yellow-100 text-yellow-700",
      EWS: "bg-teal-100 text-teal-700",
      TFWS: "bg-purple-100 text-purple-700",
    };
    return map[cat] ?? "bg-gray-100 text-gray-700";
  };

  const sortedCutoffs = [...cutoffs].sort((left, right) => {
    switch (sortBy) {
      case "percentile-asc":
        return Number(left.percentile) - Number(right.percentile);
      case "percentile-desc":
        return Number(right.percentile) - Number(left.percentile);
      case "rank-asc":
        return (
          Number(left.cutoff_rank ?? Number.MAX_SAFE_INTEGER) -
          Number(right.cutoff_rank ?? Number.MAX_SAFE_INTEGER)
        );
      case "rank-desc":
        return Number(right.cutoff_rank ?? -1) - Number(left.cutoff_rank ?? -1);
      case "college-asc":
        return left.college_name.localeCompare(right.college_name);
      case "branch-asc":
        return left.branch.localeCompare(right.branch);
      case "round-asc":
        return formatRound(left.stage).localeCompare(
          formatRound(right.stage),
          undefined,
          { numeric: true }
        );
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Cutoff Explorer
          </h1>
          <p className="text-gray-600 text-lg">
            Search MHT-CET cutoff data — ranks and percentiles by college,
            branch &amp; category
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8 relative z-10">
          <div className="bg-linear-to-r from-purple-50 via-white to-pink-50 px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Filters</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Start with search scope, then narrow by seat criteria
            </p>
          </div>

          <div className="p-6">
            {/* Step 1: Search Scope */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                  1
                </span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Search Scope
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Year */}
                <div>
                  <label
                    htmlFor="year"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Year
                  </label>
                  <CustomSelect
                    id="year"
                    value={year}
                    onChange={setYear}
                    options={[
                      { value: "", label: "All Years" },
                      { value: "2025", label: "2025 (CAP Round 1)" },
                      { value: "2022", label: "2022 (CAP Rounds 1, 2, 3)" },
                    ]}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leaving this as All Years searches all years, while option lists are loaded from 2025 for speed.
                  </p>
                </div>

                {/* College Name */}
                <div>
                  <label
                    htmlFor="collegeName"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    College Name
                  </label>
                  <ComboBox
                    id="collegeName"
                    value={collegeName}
                    onChange={handleCollegeChange}
                    options={collegeOptions.map((c) => c.name)}
                    placeholder="All Colleges"
                    maxLength={200}
                  />
                </div>

                {/* City filter */}
                <div>
                  <label
                    htmlFor="cities"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    City / Location
                  </label>
                  <MultiSelect
                    id="cities"
                    value={selectedCities}
                    onChange={handleCitiesChange}
                    options={cityOptions}
                    placeholder="All Cities"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 mb-6" />

            {/* Step 2: Seat Criteria */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                  2
                </span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Seat Criteria
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Branch */}
                <div className="lg:col-span-2">
                  <label
                    htmlFor="branch"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Branch
                  </label>
                  <MultiSelect
                    id="branch"
                    value={selectedBranches}
                    onChange={handleBranchesChange}
                    options={branchOptions}
                    placeholder="All Branches"
                  />
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
                    options={[
                      { value: "", label: "All Categories" },
                      ...CUTOFF_CATEGORIES.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </div>

                {/* Seat Type */}
                <div>
                  <label
                    htmlFor="gender"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Seat Type
                  </label>
                  <CustomSelect
                    id="gender"
                    value={gender}
                    onChange={setGender}
                    options={[
                      { value: "", label: "All Seat Types" },
                      {
                        value: "All",
                        label: "Gender-Neutral Seats Only",
                      },
                      {
                        value: "Female",
                        label: "Ladies Seats Only",
                      },
                    ]}
                  />
                </div>

                {/* Level */}
                <div className="md:col-start-2 lg:col-start-auto">
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
                    options={[
                      { value: "", label: "All Levels" },
                      ...CUTOFF_LEVELS.map((l) => ({ value: l, label: l })),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 mb-5">
              Tip: Start broad, then add branch and category filters to narrow faster.
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-7 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {loading ? "Searching..." : "Search Cutoffs"}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4" />
            <div className="text-xl text-gray-700 font-medium">
              Loading cutoffs...
            </div>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-xl text-gray-600 font-medium">
              Set your filters and click Search
            </div>
            <div className="text-gray-500 mt-2 text-sm">
              33,497 cutoff records available for 2025 CAP Round 1
            </div>
          </div>
        ) : cutoffs.length === 0 ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-xl text-gray-600">
              No results found. Try different filters.
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Result summary bar */}
            <div className="px-5 py-3 bg-linear-to-r from-purple-50 to-pink-50 flex items-center justify-between border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Showing <strong>{cutoffs.length}</strong> of{" "}
                <strong>{total?.toLocaleString()}</strong> results
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="cutoff-sort"
                    className="text-sm font-medium text-gray-600"
                  >
                    Sort by
                  </label>
                  <select
                    id="cutoff-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="percentile-desc">
                      Percentile: High to Low
                    </option>
                    <option value="percentile-asc">
                      Percentile: Low to High
                    </option>
                    <option value="rank-asc">Rank: Low to High</option>
                    <option value="rank-desc">Rank: High to Low</option>
                    <option value="college-asc">College Name: A to Z</option>
                    <option value="branch-asc">Branch: A to Z</option>
                    <option value="round-asc">Round</option>
                  </select>
                </div>
                {total !== null && total > 500 && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full border border-yellow-200">
                    ⚠ Showing first 500 — add more filters to narrow results
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Year
                    </th>
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
                      Gender
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Round
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Percentile
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCutoffs.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-gray-100 hover:bg-purple-50/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {c.year}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium min-w-72 align-top">
                        <div className="whitespace-normal wrap-break-word leading-snug">
                          {c.college_name}
                        </div>
                        {c.college_code && (
                          <div className="text-xs text-gray-400">
                            Code: {c.college_code}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 min-w-64 align-top">
                        <div className="whitespace-normal wrap-break-word leading-snug">
                          {c.branch}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColor(c.category)}`}
                        >
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {c.gender || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-35">
                        <div className="truncate" title={c.level || ""}>
                          {c.level || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {formatRound(c.stage)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-800">
                        {c.cutoff_rank ? c.cutoff_rank.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-600">
                        {Number(c.percentile).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
