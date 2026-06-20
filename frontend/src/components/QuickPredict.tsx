"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CUTOFF_CATEGORIES } from "@/lib/cutoffOptions";

const GENDERS = ["Male", "Female"] as const;

/**
 * Compact homepage "quick predict" — captures the minimum a valid MHT-CET
 * prediction needs (score + category + gender) and deep-links into /predictor,
 * which reads the query params, prefills the full form, and auto-runs. Lowers
 * friction to the platform's primary, highest-value tool. Built with native
 * <select> + associated labels so it is accessible without extra ARIA wiring.
 */
export default function QuickPredict() {
  const router = useRouter();
  const [mode, setMode] = useState<"percentile" | "rank">("percentile");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(value);
    if (!value || Number.isNaN(num)) { setError(`Please enter your ${mode}.`); return; }
    if (mode === "percentile" && (num < 0 || num > 100)) { setError("Percentile must be between 0 and 100."); return; }
    if (mode === "rank" && num < 1) { setError("Rank must be a positive number."); return; }
    if (!category) { setError("Please select your category."); return; }
    if (!gender) { setError("Please select your gender."); return; }
    setError("");
    const qs = new URLSearchParams({ [mode]: String(num), category, gender });
    router.push(`/predictor?${qs.toString()}`);
  };

  const toggleBtn = (m: "percentile" | "rank", label: string) => {
    const active = mode === m;
    return (
      <button
        type="button"
        onClick={() => setMode(m)}
        aria-pressed={active}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        style={{
          background: active ? "var(--primary-600)" : "var(--bg-secondary)",
          color: active ? "#ffffff" : "var(--slate-600)",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="rounded-2xl border p-6 lg:p-7"
      style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-xl)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
            Predict your college in seconds
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--slate-500)" }}>
            Score, category &amp; gender — instant Safe / Target / Dream colleges.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-4" role="group" aria-label="Score type">
        {toggleBtn("percentile", "Percentile")}
        {toggleBtn("rank", "Rank")}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="qp-value" className="sr-only">{mode === "percentile" ? "Percentile" : "Rank"}</label>
          <input
            id="qp-value"
            type="number"
            inputMode="decimal"
            step={mode === "percentile" ? "0.0000001" : "1"}
            min={mode === "percentile" ? 0 : 1}
            max={mode === "percentile" ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "percentile" ? "Your percentile (e.g. 95.5)" : "Your CET rank (e.g. 12000)"}
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: "var(--slate-900)" }}
          />
        </div>

        <div>
          <label htmlFor="qp-category" className="sr-only">Category</label>
          <select
            id="qp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: category ? "var(--slate-900)" : "var(--slate-600)" }}
          >
            <option value="" disabled>Category</option>
            {CUTOFF_CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ color: "var(--slate-900)" }}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="qp-gender" className="sr-only">Gender</label>
          <select
            id="qp-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: gender ? "var(--slate-900)" : "var(--slate-600)" }}
          >
            <option value="" disabled>Gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g} style={{ color: "var(--slate-900)" }}>{g}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))" }}
        >
          Predict my colleges →
        </button>
      </form>

      {error && (
        <p role="alert" className="text-xs mt-3" style={{ color: "#DC2626" }}>{error}</p>
      )}
    </div>
  );
}
