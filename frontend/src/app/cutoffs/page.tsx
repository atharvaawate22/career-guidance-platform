"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import ComboBox from "@/components/ComboBox";
import MultiSelect from "@/components/MultiSelect";
import CutoffResultCard from "@/components/CutoffResultCard";
import { CANDIDATE_GENDER_OPTIONS } from "@/lib/candidateGender";
import { CUTOFF_CATEGORIES, CUTOFF_STAGES } from "@/lib/cutoffOptions";
import {
  getMinorityGroupOptions,
  MINORITY_TYPE_OPTIONS,
  getMinorityTypesForGroups,
} from "@/lib/minorityStatus";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

const DEFAULT_META_YEAR = "2025";

interface CutoffData {
  id: string; year: number;
  college_code: string | null; college_name: string;
  branch_code: string | null; branch: string;
  category: string; gender: string | null;
  college_status: string | null; stage: string | null;
  percentile: number; cutoff_rank: number | null;
}

interface CollegeOption { code: string | null; name: string; }
interface CutoffMeta {
  colleges: CollegeOption[];
  branches: string[];
  cities: string[];
}

type SortOption = "percentile-desc" | "percentile-asc" | "rank-asc" | "rank-desc" | "college-asc" | "branch-asc" | "round-asc";

function formatRound(stage: string | null) {
  if (!stage) return "—";
  const n = stage.trim().toUpperCase();
  const map: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };
  if (map[n]) return `CAP Round ${map[n]}`;
  if (n.includes("ROUND") || n.includes("CAP")) return stage;
  return `Round ${stage}`;
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--slate)" }}>{children}</label>;
}

function Divider() {
  return <div style={{ borderTop: "1px dashed var(--border)", margin: "1.25rem 0" }} />;
}

export default function CutoffsPage() {
  const [cutoffs, setCutoffs] = useState<CutoffData[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("percentile-desc");

  const [collegeName, setCollegeName] = useState("");
  const [collegeCode, setCollegeCode] = useState<string | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [selectedMinorityTypes, setSelectedMinorityTypes] = useState<string[]>([]);
  const [selectedMinorityGroups, setSelectedMinorityGroups] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [includeTfws, setIncludeTfws] = useState(false);
  const [meta, setMeta] = useState<CutoffMeta>({
    colleges: [],
    branches: [],
    cities: [],
  });

  const collegeMapByName = useMemo(
    () => new Map(meta.colleges.map(c => [c.name, c])), [meta.colleges]
  );

  const collegeOptions = meta.colleges;
  const branchOptions = meta.branches;
  const cityOptions = meta.cities;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.append("year", DEFAULT_META_YEAR);
    selectedBranches.forEach(b => params.append("branch", b));
    selectedCities.forEach(c => params.append("city", c));
    if (collegeCode) params.append("college_code", collegeCode);
    else if (collegeName) params.append("college_name", collegeName);

    fetch(`${API_BASE_URL}/api/v1/cutoffs/meta?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) setMeta(data.data);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load filters");
      });

    return () => controller.abort();
  }, [collegeCode, collegeName, selectedBranches, selectedCities]);

  useEffect(() => {
    if (collegeCode && collegeName && !collegeOptions.some(c => c.name === collegeName)) {
      setCollegeName(""); setCollegeCode(null);
    }
  }, [collegeCode, collegeName, collegeOptions]);

  useEffect(() => {
    if (selectedBranches.length === 0) return;
    const allowed = new Set(branchOptions);
    const next = selectedBranches.filter(b => allowed.has(b));
    if (next.length !== selectedBranches.length) setSelectedBranches(next);
  }, [branchOptions, selectedBranches]);

  useEffect(() => {
    if (selectedCities.length === 0) return;
    const allowed = new Set(cityOptions);
    const next = selectedCities.filter(c => allowed.has(c));
    if (next.length !== selectedCities.length) setSelectedCities(next);
  }, [cityOptions, selectedCities]);

  // Minority group clearing when types are deselected is handled directly in
  // the MultiSelect onChange below to avoid a dependency-cycle useEffect.

  const handleCollegeChange = (v: string) => {
    setCollegeName(v);
    setCollegeCode(collegeMapByName.get(v)?.code ?? null);
  };

  const handleSearch = async () => {
    if (!gender) {
      setGenderError("Please select a gender — it determines which seats you are eligible for.");
      return;
    }
    setGenderError("");
    setLoading(true); setError(""); setHasSearched(true);
    try {
      const params = new URLSearchParams();
      params.append("year", DEFAULT_META_YEAR);
      selectedBranches.forEach(b => params.append("branch", b));
      if (category) params.append("category", category);
      if (includeTfws && category !== "TFWS") params.append("include_tfws", "true");
      if (gender) params.append("gender", gender);
      selectedMinorityTypes.forEach(t => params.append("minority_type", t));
      selectedMinorityGroups.forEach(g => params.append("minority_group", g));
      if (stage) params.append("stage", stage);
      if (collegeCode) params.append("college_code", collegeCode);
      else if (collegeName) params.append("college_name", collegeName);
      selectedCities.forEach(c => params.append("city", c));
      const response = await fetch(`${API_BASE_URL}/api/v1/cutoffs?${params.toString()}`);
      if (!response.ok) {
        // Surface HTTP-level errors (proxy failures, 5xx, etc.) explicitly
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      if (data.success) { setCutoffs(data.data); setTotal(data.total); }
      else setError(data.error?.message || "Failed to fetch cutoffs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setSelectedBranches([]); setCategory(""); setIncludeTfws(false);
    setGender(""); setSelectedMinorityTypes([]); setSelectedMinorityGroups([]);
    setStage(""); setCollegeName(""); setCollegeCode(null);
    setSelectedCities([]); setCutoffs([]); setTotal(null);
    setError(""); setGenderError(""); setHasSearched(false); setSortBy("percentile-desc");
  };

  const sortedCutoffs = [...cutoffs].sort((a, b) => {
    switch (sortBy) {
      case "percentile-asc":  return Number(a.percentile) - Number(b.percentile);
      case "percentile-desc": return Number(b.percentile) - Number(a.percentile);
      case "rank-asc":  return (Number(a.cutoff_rank ?? Number.MAX_SAFE_INTEGER)) - (Number(b.cutoff_rank ?? Number.MAX_SAFE_INTEGER));
      case "rank-desc": return (Number(b.cutoff_rank ?? -1)) - (Number(a.cutoff_rank ?? -1));
      case "college-asc": return a.college_name.localeCompare(b.college_name);
      case "branch-asc":  return a.branch.localeCompare(b.branch);
      case "round-asc":   return formatRound(a.stage).localeCompare(formatRound(b.stage), undefined, { numeric: true });
      default: return 0;
    }
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">MHT-CET 2025</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
            Cutoff Explorer
          </h1>
          <p className="text-sm" style={{ color: "var(--slate)" }}>
            Search MHT-CET cutoff data — ranks and percentiles by college, branch & category.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[280px_1fr] gap-6 items-start">

          {/* ── Filter panel ── */}
          <div className="card mb-6 lg:mb-0 lg:sticky lg:top-4" style={{ borderRadius: "1rem", overflow: "hidden" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--ice)" }}>
              <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>Filters</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--slate)" }}>2025 cutoff data only</p>
            </div>
            <div className="p-5 space-y-0">

              {/* Search scope */}
              <p className="section-label mb-3">Search Scope</p>
              <div className="space-y-3">
                <div>
                  <FilterLabel>CAP Round</FilterLabel>
                  <CustomSelect id="stage" value={stage} onChange={setStage}
                    options={[{ value: "", label: "All CAP Rounds" }, ...CUTOFF_STAGES.map(s => ({ value: s, label: formatRound(s) }))]} />
                </div>
                <div>
                  <FilterLabel>College</FilterLabel>
                  <ComboBox id="collegeName" value={collegeName} onChange={handleCollegeChange}
                    options={collegeOptions.map(c => c.name)} placeholder="All Colleges" maxLength={200} />
                </div>
                <div>
                  <FilterLabel>City / Location</FilterLabel>
                  <MultiSelect id="cities" value={selectedCities} onChange={v => setSelectedCities(v)}
                    options={cityOptions} placeholder="All Cities" />
                </div>
              </div>

              <Divider />

              {/* Seat criteria */}
              <p className="section-label mb-3">Seat Criteria</p>
              <div className="space-y-3">
                <div>
                  <FilterLabel>Branch</FilterLabel>
                  <MultiSelect id="branch" value={selectedBranches} onChange={v => setSelectedBranches(v)}
                    options={branchOptions} placeholder="All Branches" />
                </div>
                <div>
                  <FilterLabel>Category</FilterLabel>
                  <CustomSelect id="category" value={category}
                    onChange={v => { setCategory(v); if (v === "TFWS") setIncludeTfws(false); }}
                    options={[{ value: "", label: "All Categories" }, ...CUTOFF_CATEGORIES.filter(c => c !== "TFWS").map(c => ({ value: c, label: c }))]} />
                </div>
                <div>
                  <FilterLabel>Gender <span style={{ color: "#EF4444" }}>*</span></FilterLabel>
                  <CustomSelect id="gender" value={gender} onChange={(v) => { setGender(v); setGenderError(""); }}
                    options={[...CANDIDATE_GENDER_OPTIONS]} placeholder="Select Gender" />
                  {genderError && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: "#DC2626" }}>{genderError}</p>
                  )}
                </div>
                <div>
                  <FilterLabel>Minority Type</FilterLabel>
                  <MultiSelect id="minorityType" value={selectedMinorityTypes} onChange={vals => {
                    setSelectedMinorityTypes(vals);
                    // Clear groups whenever types are cleared, inline rather than
                    // via useEffect to avoid a dependency-cycle render.
                    if (vals.length === 0) setSelectedMinorityGroups([]);
                  }}
                  options={MINORITY_TYPE_OPTIONS} placeholder="All Minority Types" />
                </div>
                <div>
                  <FilterLabel>Minority Group</FilterLabel>
                  <MultiSelect id="minorityGroup" value={selectedMinorityGroups}
                    onChange={vals => {
                      if (selectedMinorityTypes.length === 0) return;
                      setSelectedMinorityGroups(vals);
                      setSelectedMinorityTypes(cur => Array.from(new Set([...cur, ...getMinorityTypesForGroups(vals)])));
                    }}
                    options={selectedMinorityTypes.length > 0 ? getMinorityGroupOptions(selectedMinorityTypes) : []}
                    placeholder={selectedMinorityTypes.length > 0 ? "All Minority Groups" : "Select type first"}
                    disabled={selectedMinorityTypes.length === 0} />
                </div>

                {category !== "TFWS" && (
                  <label className="flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer select-none transition-all"
                    style={{ border: `1px solid ${includeTfws ? "var(--gold)" : "var(--border)"}`, background: includeTfws ? "rgb(201 168 76 / .07)" : "var(--white)" }}>
                    <input type="checkbox" checked={includeTfws} onChange={e => setIncludeTfws(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: "var(--gold)" }} />
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                        Include <span style={{ color: "var(--gold)", fontWeight: 700 }}>TFWS</span> seats
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: "var(--slate)" }}>Tuition Fee Waiver Scheme seats</p>
                    </div>
                  </label>
                )}
              </div>

              <Divider />

              <div className="flex gap-2">
                <button onClick={handleSearch} disabled={loading} className="btn-gold flex-1 justify-center"
                  style={{ opacity: loading ? .6 : 1, fontSize: ".85rem", padding: ".6rem 1rem" }}>
                  {loading ? "Searching…" : "Search"}
                </button>
                <button onClick={handleReset} className="btn-outline"
                  style={{ padding: ".6rem 1rem", fontSize: ".85rem" }}>
                  Reset
                </button>
              </div>

              <p className="text-xs mt-3 text-center" style={{ color: "var(--slate-light)" }}>
                Previous year data?{" "}
                <Link href="/resources" style={{ color: "var(--gold)" }}>Resources →</Link>
              </p>
            </div>
          </div>

          {/* ── Results area ── */}
          <div>
            {loading ? (
              <div className="card flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-full border-4 animate-spin mb-4"
                  style={{ borderColor: "var(--border)", borderTopColor: "var(--gold)" }} />
                <p className="text-sm" style={{ color: "var(--slate)" }}>Loading cutoffs…</p>
              </div>
            ) : error ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>{error}</div>
            ) : !hasSearched ? (
              <div className="card py-20 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg font-semibold mb-1" style={{ color: "var(--ink)" }}>Set filters and search</p>
                <p className="text-sm" style={{ color: "var(--slate)" }}>Search across 2025 CAP Rounds 1–4</p>
              </div>
            ) : cutoffs.length === 0 ? (
              <div className="card py-20 text-center">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-base" style={{ color: "var(--slate)" }}>No results found. Try different filters.</p>
              </div>
            ) : (
              <div className="card" style={{ overflow: "hidden" }}>
                {/* Result bar */}
                <div className="px-5 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderBottom: "1px solid var(--border)", background: "var(--ice)" }}>
                  <span className="text-sm" style={{ color: "var(--slate)" }}>
                    Showing <strong style={{ color: "var(--ink)" }}>{cutoffs.length}</strong> of{" "}
                    <strong style={{ color: "var(--ink)" }}>{total?.toLocaleString()}</strong> results
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label htmlFor="cutoff-sort" className="text-xs font-medium" style={{ color: "var(--slate)" }}>Sort</label>
                      <select id="cutoff-sort" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                        className="text-xs rounded-lg px-2.5 py-1.5 pr-7"
                        style={{ border: "1px solid var(--border)", background: "var(--white)", color: "var(--ink)", outline: "none" }}>
                        <option value="percentile-desc">Percentile: High → Low</option>
                        <option value="percentile-asc">Percentile: Low → High</option>
                        <option value="rank-asc">Rank: Low → High</option>
                        <option value="rank-desc">Rank: High → Low</option>
                        <option value="college-asc">College: A → Z</option>
                        <option value="branch-asc">Branch: A → Z</option>
                        <option value="round-asc">Round</option>
                      </select>
                    </div>
                    {total !== null && total > 500 && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
                        ⚠ First 500 shown — add filters
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {sortedCutoffs.map(c => <CutoffResultCard key={c.id} cutoff={c} />)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Schema.org Dataset structured markup for GEO and Google Dataset Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": "MHT-CET 2025 CAP Round Engineering Cutoff Dataset",
            "description": "Structured historical cutoff dataset containing 33,000+ percentile and rank admission records across engineering colleges, branches, categories, and rounds in Maharashtra.",
            "url": "https://cethub.in/cutoffs",
            "keywords": [
              "MHT-CET cutoffs",
              "engineering admission cutoffs Maharashtra",
              "CAP round",
              "CET percentile",
              "CET rank"
            ],
            "creator": {
              "@type": "Organization",
              "name": "CETHub",
              "url": "https://cethub.in"
            },
            "distribution": [
              {
                "@type": "DataDownload",
                "encodingFormat": "application/json",
                "contentUrl": "https://cethub.in/api/v1/cutoffs"
              }
            ],
            "temporalCoverage": "2025",
            "spatialCoverage": "Maharashtra, India"
          })
        }}
      />
    </div>
  );
}
