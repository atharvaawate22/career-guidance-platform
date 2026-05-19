"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import MultiSelect from "@/components/MultiSelect";
import PredictorResultCard from "@/components/PredictorResultCard";
import { CANDIDATE_GENDER_OPTIONS } from "@/lib/candidateGender";
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
import { API_BASE_URL } from "@/lib/apiBaseUrl";

const PREDICTOR_YEAR = parseInt(
  process.env.NEXT_PUBLIC_PREDICTOR_YEAR || "2025",
  10
);

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
    windowFloor: number;
    windowCeil: number;
  };
}

function SectionLabel({ n, label, optional }: { n: number; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
        style={{ background: "var(--gold)", color: "var(--navy)" }}>
        {n}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--slate)" }}>
        {label}{optional && <span className="ml-1.5 normal-case font-normal tracking-normal" style={{ color: "var(--slate-light)" }}>— optional</span>}
      </span>
    </div>
  );
}

export default function PredictorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PredictionResults | null>(null);

  const [inputMode, setInputMode] = useState<"percentile" | "rank">("percentile");
  const [percentile, setPercentile] = useState("");
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("");
  const [includeTfws, setIncludeTfws] = useState(false);
  const [gender, setGender] = useState("");
  const [genderError, setGenderError] = useState("");
  const [selectedMinorityTypes, setSelectedMinorityTypes] = useState<string[]>([]);
  const [selectedMinorityGroups, setSelectedMinorityGroups] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const branchOptions = STATIC_CUTOFF_BRANCHES;
  const cityOptions = STATIC_CUTOFF_CITIES_CLEAN;

  // When minority types are cleared, also clear the minority groups.
  // This is handled directly in the onChange for selectedMinorityTypes rather
  // than via a useEffect, to avoid the dependency cycle that arises from
  // having selectedMinorityGroups in the deps array while also setting it inside.
  // (The effect below is therefore intentionally removed.)

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === "percentile" && !percentile) { setError("Please enter your percentile."); return; }
    if (inputMode === "rank" && !rank) { setError("Please enter your rank."); return; }
    if (!gender) {
      setGenderError("Please select your gender — it determines which seats you are eligible for.");
      return;
    }
    setGenderError("");
    setLoading(true); setError(""); setResults(null);
    try {
      const body: Record<string, unknown> = { year: PREDICTOR_YEAR, category, gender, include_tfws: includeTfws };
      if (selectedMinorityTypes.length > 0) body.minority_types = selectedMinorityTypes;
      if (selectedMinorityGroups.length > 0) body.minority_groups = selectedMinorityGroups;
      if (inputMode === "percentile") body.percentile = Number(percentile);
      if (inputMode === "rank") body.rank = Number(rank);
      if (selectedBranches.length > 0) body.preferred_branches = selectedBranches;
      if (selectedCities.length > 0) body.cities = selectedCities;
      const res = await fetch(`${API_BASE_URL}/api/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) setResults(data.data);
      else setError(data.error?.message || "Failed to get predictions");
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  };

  const totalResults = results ? results.safe.length + results.target.length + results.dream.length : 0;

  const renderSection = (colleges: CollegeOption[], tier: "safe" | "target" | "dream", title: string) => {
    const colors = { safe: "var(--gold)", target: "#F59E0B", dream: "#3B82F6" };
    return (
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-6 rounded-full shrink-0" style={{ background: colors[tier] }} />
          <h3 className="text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>{title}</h3>
          <span className="text-sm ml-1" style={{ color: "var(--slate)" }}>({colleges.length})</span>
        </div>
        {colleges.length === 0 ? (
          <div className="card p-6 text-center text-sm" style={{ color: "var(--slate)" }}>
            No {title.toLowerCase()} found with these filters.
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {colleges.slice(0, 100).map(c => <PredictorResultCard key={c.id} college={c} tier={tier} />)}
            </div>
            {colleges.length > 100 && (
              <p className="mt-3 text-xs text-center px-4 py-2 rounded-lg" style={{ background: "var(--ice-mid)", color: "var(--slate)" }}>
                Showing top 100 of {colleges.length} — add more filters to narrow down
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Page header */}
        <div className="mb-8">
          <p className="section-label mb-2">MHT-CET 2025</p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
            College Predictor
          </h1>
          <p className="text-sm" style={{ color: "var(--slate)" }}>
            Based on 2025 CAP Round I cutoffs. Enter your percentile or rank to see eligible colleges.
            Results are indicative, not guaranteed.
          </p>
        </div>

        {/* Form card */}
        <div className="card mb-8" style={{ borderRadius: "1rem", overflow: "hidden" }}>
          {/* Step header strip */}
          <div className="step-indicator">
            {["Your Score", "Candidate Profile", "Preferences"].map((s, i) => (
              <div key={s} className="flex items-center flex-1 min-w-0">
                {i > 0 && <div className="step-line" />}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`step-dot active`}>{i + 1}</div>
                  <span className="text-xs font-semibold hidden sm:block" style={{ color: "var(--slate)" }}>{s}</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handlePredict} className="p-6 space-y-8">

            {/* Step 1 */}
            <div>
              <SectionLabel n={1} label="Your Score" />
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Toggle */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Input Type</label>
                  <div className="flex rounded-lg p-1 gap-1" style={{ background: "var(--ice-mid)", border: "1px solid var(--border)" }}>
                    {(["percentile", "rank"] as const).map(m => (
                      <button key={m} type="button" onClick={() => { setInputMode(m); setError(""); }}
                        className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all"
                        style={{
                          background: inputMode === m ? "var(--white)" : "transparent",
                          color: inputMode === m ? "var(--ink)" : "var(--slate)",
                          boxShadow: inputMode === m ? "var(--shadow-sm)" : "none",
                        }}>
                        {m === "percentile" ? "Percentile" : <>Rank <span className="text-xs font-normal" style={{ color: "#22C55E" }}>(accurate)</span></>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Score input */}
                {inputMode === "percentile" ? (
                  <div>
                    <label htmlFor="percentile" className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>
                      Percentile <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input id="percentile" type="number" value={percentile} onChange={e => setPercentile(e.target.value)}
                      min="0" max="100" step="0.0001" required={inputMode === "percentile"}
                      placeholder="e.g. 96.5000" className="input-base" />
                    <p className="text-xs mt-1.5" style={{ color: "var(--slate-light)" }}>Rank is estimated from percentile data</p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="rank" className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>
                      Rank <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input id="rank" type="number" value={rank} onChange={e => setRank(e.target.value)}
                      min="1" max="500000" step="1" required={inputMode === "rank"}
                      placeholder="e.g. 5000" className="input-base" />
                    <p className="text-xs mt-1.5" style={{ color: "var(--slate-light)" }}>Best once your official rank is published</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px dashed var(--border)" }} />

            {/* Step 2 */}
            <div>
              <SectionLabel n={2} label="Candidate Profile" />
              <div className="rounded-xl p-5" style={{ background: "var(--ice)", border: "1px solid var(--border)" }}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                  <div className="xl:col-span-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Category</label>
                    <CustomSelect id="category" value={category}
                      onChange={v => { setCategory(v); if (v === "TFWS") setIncludeTfws(false); }}
                      options={[{ value: "", label: "All Categories" }, ...CUTOFF_CATEGORIES.filter(c => c !== "TFWS").map(c => ({ value: c, label: c }))]} />
                  </div>
                  <div className="xl:col-span-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Gender <span style={{ color: "#EF4444" }}>*</span></label>
                    <CustomSelect id="gender" value={gender} onChange={(v) => { setGender(v); setGenderError(""); }}
                      options={[...CANDIDATE_GENDER_OPTIONS]} placeholder="Select Gender" />
                    {genderError && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "#DC2626" }}>{genderError}</p>
                    )}
                  </div>
                  <div className="xl:col-span-4">
                    <span className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Seat Options</span>
                    {category !== "TFWS" ? (
                      <label className={`flex h-11 items-center gap-3 rounded-lg px-4 cursor-pointer select-none transition-all`}
                        style={{
                          border: `1px solid ${includeTfws ? "var(--gold)" : "var(--border)"}`,
                          background: includeTfws ? "rgb(201 168 76 / .07)" : "var(--white)",
                        }}>
                        <input type="checkbox" checked={includeTfws} onChange={e => setIncludeTfws(e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded" style={{ accentColor: "var(--gold)" }} />
                        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                          Include <span style={{ color: "var(--gold)", fontWeight: 700 }}>TFWS</span> seats
                        </span>
                      </label>
                    ) : (
                      <div className="flex h-11 items-center rounded-lg px-4 text-sm" style={{ border: "1px solid var(--border)", color: "var(--slate)" }}>
                        TFWS already selected
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-6">
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Minority Type</label>
                    <MultiSelect id="minorityType" value={selectedMinorityTypes} onChange={values => {
                        setSelectedMinorityTypes(values);
                        // Clear groups whenever types are cleared, inline rather than
                        // via useEffect to avoid a dependency-cycle render.
                        if (values.length === 0) setSelectedMinorityGroups([]);
                      }}
                      options={MINORITY_TYPE_OPTIONS} placeholder="All Minority Types" />
                  </div>
                  <div className="xl:col-span-6">
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Minority Group</label>
                    <MultiSelect id="minorityGroup" value={selectedMinorityGroups}
                      onChange={values => {
                        if (selectedMinorityTypes.length === 0) return;
                        setSelectedMinorityGroups(values);
                        setSelectedMinorityTypes(cur => Array.from(new Set([...cur, ...getMinorityTypesForGroups(values)])));
                      }}
                      options={selectedMinorityTypes.length > 0 ? getMinorityGroupOptions(selectedMinorityTypes) : []}
                      placeholder={selectedMinorityTypes.length > 0 ? "All Minority Groups" : "Select minority type first"}
                      disabled={selectedMinorityTypes.length === 0} />
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "rgb(201 168 76 / .08)", border: "1px solid rgb(201 168 76 / .2)", color: "var(--ink-mid)" }}>
                    <span className="font-semibold" style={{ color: "var(--gold)" }}>Seat rule:</span>{" "}
                    Male → gender-neutral seats only. Female → gender-neutral + ladies seats.
                  </div>
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--ice)", border: "1px solid var(--border)", color: "var(--slate)" }}>
                    <span className="font-semibold" style={{ color: "var(--ink-mid)" }}>Minority:</span>{" "}
                    Add type/group only if applicable. Groups require a type selection first.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px dashed var(--border)" }} />

            {/* Step 3 */}
            <div>
              <SectionLabel n={3} label="Preferences" optional />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Preferred Branches</label>
                  <MultiSelect id="branches" value={selectedBranches} onChange={setSelectedBranches}
                    options={branchOptions} placeholder="All Branches" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--ink-mid)" }}>Preferred Cities</label>
                  <MultiSelect id="cities" value={selectedCities} onChange={setSelectedCities}
                    options={cityOptions} placeholder="All Cities" />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg p-3 text-sm flex items-center gap-2"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            {/* Guidance banner */}
            <div className="rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ background: "var(--navy)", border: "1px solid var(--navy-border)" }}>
              <p className="text-sm" style={{ color: "var(--slate-light)" }}>
                For in-depth personalised guidance, book a free counseling session.
              </p>
              <Link href="/book"
                className="text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                style={{ background: "var(--gold)", color: "var(--navy)" }}>
                Book Free Session
              </Link>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-gold" style={{ opacity: loading ? .6 : 1 }}>
                {loading ? "Predicting…" : "Predict Colleges"}
              </button>
              <button type="button" className="btn-outline"
                onClick={() => {
                  setInputMode("percentile"); setPercentile(""); setRank(""); setCategory("");
                  setIncludeTfws(false); setGender(""); setSelectedMinorityTypes([]);
                  setSelectedMinorityGroups([]); setSelectedBranches([]); setSelectedCities([]);
                  setResults(null); setError(""); setGenderError("");
                }}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--gold)" }} />
            <p className="text-base font-medium" style={{ color: "var(--slate)" }}>Analysing 2025 cutoffs…</p>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div className="animate-fade-up">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {[
                { val: totalResults, label: "Total Options", accent: "var(--ink)" },
                { val: results.safe.length, label: "Safe Colleges", accent: "#16A34A" },
                { val: results.target.length, label: "Target Colleges", accent: "#D97706" },
                { val: results.dream.length, label: "Dream Colleges", accent: "#2563EB" },
              ].map(s => (
                <div key={s.label} className="card p-4 sm:p-5 text-center">
                  <div className="text-3xl font-bold" style={{ color: s.accent, fontFamily: "var(--font-playfair)" }}>{s.val}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--slate)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Legend / meta */}
            {results.meta?.windowFloor != null && (
              <div className="card p-4 mb-8">
                {results.meta.inputMode === "percentile" && (
                  <p className="text-sm mb-2" style={{ color: "var(--ink-mid)" }}>
                    Estimated rank for your percentile:{" "}
                    <strong style={{ color: "var(--gold)" }}>{results.meta.effectiveRank.toLocaleString()}</strong>
                    {results.meta.inputPercentile !== undefined && (
                      <span style={{ color: "var(--slate)" }}> (from {results.meta.inputPercentile.toFixed(4)} percentile)</span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm mb-3">
                  <span><strong style={{ color: "#16A34A" }}>Safe</strong> — comfortably competitive</span>
                  <span><strong style={{ color: "#D97706" }}>Target</strong> — realistic, worth considering</span>
                  <span><strong style={{ color: "#2563EB" }}>Dream</strong> — competitive but worth a try</span>
                </div>
                <p className="text-xs" style={{ color: "var(--slate-light)", borderTop: "1px solid var(--border)", paddingTop: ".5rem" }}>
                  Showing colleges with cutoff ranks between{" "}
                  <strong>{results.meta.windowFloor.toLocaleString()}</strong> and{" "}
                  <strong>{results.meta.windowCeil.toLocaleString()}</strong>
                </p>
              </div>
            )}

            {renderSection(results.safe, "safe", "Safe Colleges")}
            {renderSection(results.target, "target", "Target Colleges")}
            {renderSection(results.dream, "dream", "Dream Colleges")}

            {totalResults === 0 && (
              <div className="card py-14 text-center">
                <p className="text-base" style={{ color: "var(--slate)" }}>No colleges found. Try adjusting category or branch filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
