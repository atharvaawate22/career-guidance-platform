"use client";

import { useEffect, useMemo, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import ComboBox from "@/components/ComboBox";
import MultiSelect from "@/components/MultiSelect";
import { getCutoffCategoryColor } from "@/lib/cutoffCategoryColors";
import { CUTOFF_CATEGORIES, CUTOFF_LEVELS } from "@/lib/cutoffOptions";
import {
  STATIC_CUTOFF_COLLEGES,
  STATIC_CUTOFF_RELATIONS,
} from "@/lib/cutoffStaticMeta";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";
const DEFAULT_META_YEAR = "2025";

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

function formatCompactLevel(level: string | null) {
  if (!level) return "—";

  return level
    .replace("Home University Level", "Home Univ.")
    .replace("Other Than Home University Level", "Other Than Home")
    .replace("State Level", "State");
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

  const collegeMapByName = useMemo(
    () =>
      new Map(STATIC_CUTOFF_COLLEGES.map((college) => [college.name, college])),
    []
  );

  const collegeOptions: CollegeOption[] = useMemo(() => {
    const citySet = selectedCities.length ? new Set(selectedCities) : null;
    const branchSet = selectedBranches.length
      ? new Set(selectedBranches)
      : null;

    const names = new Set<string>();
    for (const relation of STATIC_CUTOFF_RELATIONS) {
      if (citySet && !citySet.has(relation.city)) continue;
      if (branchSet && !branchSet.has(relation.branch)) continue;
      names.add(relation.collegeName);
    }

    return Array.from(names)
      .map((name) => collegeMapByName.get(name))
      .filter((college): college is CollegeOption => Boolean(college))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [collegeMapByName, selectedBranches, selectedCities]);

  const branchOptions: string[] = useMemo(() => {
    const citySet = selectedCities.length ? new Set(selectedCities) : null;
    const branchSet = new Set<string>();

    for (const relation of STATIC_CUTOFF_RELATIONS) {
      if (collegeName && relation.collegeName !== collegeName) continue;
      if (citySet && !citySet.has(relation.city)) continue;
      branchSet.add(relation.branch);
    }

    return Array.from(branchSet).sort((left, right) =>
      left.localeCompare(right)
    );
  }, [collegeName, selectedCities]);

  const cityOptions: string[] = useMemo(() => {
    const branchSet = selectedBranches.length
      ? new Set(selectedBranches)
      : null;
    const citySet = new Set<string>();

    for (const relation of STATIC_CUTOFF_RELATIONS) {
      if (collegeName && relation.collegeName !== collegeName) continue;
      if (branchSet && !branchSet.has(relation.branch)) continue;
      citySet.add(relation.city);
    }

    return Array.from(citySet).sort((left, right) => left.localeCompare(right));
  }, [collegeName, selectedBranches]);

  useEffect(() => {
    if (
      collegeName &&
      !collegeOptions.some((college) => college.name === collegeName)
    ) {
      setCollegeName("");
      setCollegeCode(null);
    }
  }, [collegeName, collegeOptions]);

  useEffect(() => {
    if (selectedBranches.length === 0) return;
    const allowed = new Set(branchOptions);
    const next = selectedBranches.filter((branch) => allowed.has(branch));
    if (next.length !== selectedBranches.length) {
      setSelectedBranches(next);
    }
  }, [branchOptions, selectedBranches]);

  useEffect(() => {
    if (selectedCities.length === 0) return;
    const allowed = new Set(cityOptions);
    const next = selectedCities.filter((city) => allowed.has(city));
    if (next.length !== selectedCities.length) {
      setSelectedCities(next);
    }
  }, [cityOptions, selectedCities]);

  // Stable DTE college_code for the currently selected college (null = free-text)
  const [collegeCode, setCollegeCode] = useState<string | null>(null);

  // When college changes: narrow branches to only those in that college
  const handleCollegeChange = (value: string) => {
    setCollegeName(value);
    const match = collegeMapByName.get(value);
    setCollegeCode(match?.code ?? null);
  };

  // Static dropdowns: selected values filter server query only.
  const handleBranchesChange = (values: string[]) => {
    setSelectedBranches(values);
  };

  // Static dropdowns: selected values filter server query only.
  const handleCitiesChange = (values: string[]) => {
    setSelectedCities(values);
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
                    options={[{ value: "2025", label: "2025 (CAP Round 1)" }]}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Dropdown values are preloaded from the 2025 CAP Round 1
                    dataset for instant loading.
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
              Tip: Start broad, then add branch and category filters to narrow
              faster.
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
            <div className="px-5 py-3 bg-linear-to-r from-purple-50 to-pink-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Showing <strong>{cutoffs.length}</strong> of{" "}
                <strong>{total?.toLocaleString()}</strong> results
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
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

            <div className="divide-y divide-gray-100 md:hidden">
              {sortedCutoffs.map((c) => (
                <article key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 wrap-break-word">
                        {c.college_name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 wrap-break-word">
                        {c.branch}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] uppercase tracking-wide text-purple-500">
                        %ile
                      </div>
                      <div className="text-lg font-bold text-purple-700">
                        {Number(c.percentile).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                      {c.year}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${getCutoffCategoryColor(c.category)}`}
                    >
                      {c.category}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700">
                      {formatRound(c.stage)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                      {c.gender || "All"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-500">Rank</div>
                    <div className="text-right font-mono text-gray-700">
                      {c.cutoff_rank ? c.cutoff_rank.toLocaleString() : "—"}
                    </div>
                    <div className="text-gray-500">Level</div>
                    <div className="text-right text-gray-700 wrap-break-word">
                      {formatCompactLevel(c.level)}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden w-full md:block">
              <table className="w-full table-fixed text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-2 py-3 w-14 text-left">Year</th>
                    <th className="px-2 py-3 w-[24%] text-left">College</th>
                    <th className="px-2 py-3 w-[18%] text-left">Branch</th>
                    <th className="px-2 py-3 w-20 text-left">Category</th>
                    <th className="px-2 py-3 w-20 text-left">Seat Type</th>
                    <th className="px-2 py-3 w-[15%] text-left">Level</th>
                    <th className="px-2 py-3 w-24 text-left">Round</th>
                    <th className="px-2 py-3 w-24 text-right">Rank</th>
                    <th className="px-2 py-3 w-28 text-right">Percentile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedCutoffs.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-purple-50/40 transition-colors align-top"
                    >
                      <td className="px-2 py-3 font-medium">{c.year}</td>
                      <td className="px-2 py-3">
                        <div className="wrap-break-word leading-snug">
                          {c.college_name}
                        </div>
                        {c.college_code && (
                          <div className="text-[11px] text-gray-400 mt-1">
                            Code: {c.college_code}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 wrap-break-word leading-snug">
                        {c.branch}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-semibold ${getCutoffCategoryColor(c.category)}`}
                        >
                          {c.category}
                        </span>
                      </td>
                      <td className="px-2 py-3">{c.gender || "All"}</td>
                      <td className="px-2 py-3 wrap-break-word">
                        {formatCompactLevel(c.level)}
                      </td>
                      <td className="px-2 py-3">{formatRound(c.stage)}</td>
                      <td className="px-2 py-3 text-right font-mono">
                        {c.cutoff_rank ? c.cutoff_rank.toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-purple-700">
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
