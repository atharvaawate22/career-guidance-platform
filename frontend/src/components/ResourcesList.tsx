"use client";

import { useEffect, useMemo, useState } from "react";
import { publicGet } from "@/lib/api";
import ScrollReveal from "@/components/ScrollReveal";
import type { Resource } from "@/lib/serverContent";

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Seat Matrix":           { bg: "var(--primary-50)", color: "var(--primary-700)", border: "var(--primary-200)" },
  "Previous Year Cutoffs": { bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
  "Government Circulars":  { bg: "var(--warning-50)", color: "var(--warning-700)", border: "var(--warning-200)" },
  "Exam Guidelines":       { bg: "var(--success-50)", color: "var(--success-700)", border: "var(--success-200)" },
  Others:                  { bg: "var(--slate-100)", color: "var(--slate-600)", border: "var(--slate-200)" },
};

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/** Year named in the title ("MHT-CET 2026 ...", "2026-27"); newest first. 0 when none. */
function titleYear(title: string): number {
  const m = title.match(/\b(20\d\d)\b/);
  return m ? Number(m[1]) : 0;
}

/** CAP round named in the title ("Round III"), so a year's rounds list I -> IV. */
function titleRound(title: string): number {
  const m = title.match(/\bRound\s+(IV|III|II|I)\b/);
  return m ? ROMAN[m[1]] : 0;
}

/**
 * Newest year first, then category, then CAP round in order. The API returns
 * items in the order they were added, which mixed 2023 cutoffs between 2026
 * notices.
 */
function sortResources(list: Resource[]): Resource[] {
  return [...list].sort(
    (a, b) =>
      titleYear(b.title) - titleYear(a.title) ||
      a.category.localeCompare(b.category) ||
      titleRound(a.title) - titleRound(b.title) ||
      a.title.localeCompare(b.title),
  );
}

/** Several resources are official portals, not files — don't call those "Download PDF". */
function isFileLink(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

/**
 * Category tabs + cards. The list arrives server-rendered (app/resources/page.tsx),
 * so every title and description is in the HTML; the client fetch is only a
 * fallback for when the server fetch came back empty.
 */
export default function ResourcesList({ initialResources }: { initialResources: Resource[] }) {
  const [resources, setResources] = useState<Resource[]>(() => sortResources(initialResources));
  const [loading, setLoading] = useState(initialResources.length === 0);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (initialResources.length > 0) return;
    (async () => {
      try {
        const res = await publicGet("resources");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setResources(sortResources(data.data));
        else setError("Resources are temporarily unavailable.");
      } catch {
        setError("Resources are temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    })();
    // initialResources is fixed for the page's lifetime; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(resources.map((r) => r.category))).sort()],
    [resources],
  );
  const filtered = activeCategory === "All" ? resources : resources.filter((r) => r.category === activeCategory);
  const countFor = (cat: string) => (cat === "All" ? resources.length : resources.filter((r) => r.category === cat).length);

  if (error) {
    return (
      <div className="rounded-xl p-4 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
        {error}
      </div>
    );
  }

  return (
    <>
      {/* Category tabs — only once there is something to filter (no "All 0") */}
      {resources.length > 0 && (
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200"
              style={{
                background: isActive ? "var(--primary-600)" : "var(--bg-primary)",
                color: isActive ? "#ffffff" : "var(--slate-600)",
                borderColor: isActive ? "var(--primary-600)" : "var(--slate-200)",
              }}
            >
              {cat}
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold"
                style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : "var(--slate-100)",
                  color: isActive ? "#ffffff" : "var(--slate-500)",
                }}
              >
                {countFor(cat)}
              </span>
            </button>
          );
        })}
      </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border p-6" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
              <div className="shimmer-light h-5 rounded-lg w-1/3 mb-4" />
              <div className="shimmer-light h-5 rounded-lg w-3/4 mb-2" />
              <div className="shimmer-light h-3 rounded-lg w-full mb-5" />
              <div className="shimmer-light h-10 rounded-lg w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center text-sm" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: "var(--slate-500)" }}>
          No resources here yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((resource, i) => {
            const colors = CATEGORY_COLORS[resource.category] ?? CATEGORY_COLORS.Others;
            const isFile = isFileLink(resource.file_url);
            return (
              <ScrollReveal key={resource.id} animation="fade-up" delay={Math.min(i, 6) * 60}>
                <div
                  className="rounded-2xl border p-6 h-full flex flex-col"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-xs)" }}
                >
                  <span
                    className="self-start inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold mb-3"
                    style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
                  >
                    {resource.category}
                  </span>
                  <h3 className="text-lg font-bold mb-2 leading-snug" style={{ color: "var(--slate-900)" }}>
                    {resource.title}
                  </h3>
                  <p className="text-sm mb-5 flex-1 leading-relaxed" style={{ color: "var(--slate-500)" }}>
                    {resource.description}
                  </p>
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={isFile
                      ? "flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                      : "flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold border"}
                    style={isFile
                      ? { background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))" }
                      : { color: "var(--primary-700)", borderColor: "var(--primary-200)", background: "var(--primary-50)" }}
                  >
                    {isFile ? "Download PDF" : "Open official website"}
                    <span aria-hidden="true">{isFile ? "↓" : "↗"}</span>
                  </a>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </>
  );
}
