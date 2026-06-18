"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import ScrollReveal from "@/components/ScrollReveal";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const RESOURCES_CACHE_KEY = "resources:v1";
const RESOURCES_CACHE_TTL_MS = 10 * 60 * 1000;

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Seat Matrix":           { bg: "var(--primary-50)", color: "var(--primary-700)", border: "var(--primary-200)" },
  "Previous Year Cutoffs": { bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
  "Government Circulars":  { bg: "var(--warning-50)", color: "var(--warning-700)", border: "var(--warning-200)" },
  "Exam Guidelines":       { bg: "var(--success-50)", color: "var(--success-700)", border: "var(--success-200)" },
  Others:                  { bg: "var(--slate-100)", color: "var(--slate-600)", border: "var(--slate-200)" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Seat Matrix": "🏫",
  "Previous Year Cutoffs": "📊",
  "Government Circulars": "🏛️",
  "Exam Guidelines": "📋",
  Others: "📄",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(resources.map((r) => r.category))).sort();
    return ["All", ...unique];
  }, [resources]);

  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [categories, activeCategory]);

  const fetchResources = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/api/v1/resources`);
      const data = await response.json();
      if (data.success) {
        setResources(data.data);
        try {
          localStorage.setItem(
            RESOURCES_CACHE_KEY,
            JSON.stringify({ data: data.data, timestamp: Date.now() })
          );
        } catch {
          // Ignore cache write errors.
        }
      } else {
        setError("Failed to fetch resources.");
      }
    } catch {
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let shouldShowLoader = true;
    try {
      const cached = localStorage.getItem(RESOURCES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: Resource[]; timestamp: number };
        if (Array.isArray(parsed.data) && Date.now() - parsed.timestamp < RESOURCES_CACHE_TTL_MS) {
          setResources(parsed.data);
          setLoading(false);
          shouldShowLoader = false;
        }
      }
    } catch {
      // Ignore cache read errors.
    }
    fetchResources(shouldShowLoader);
  }, [fetchResources]);

  const filteredResources = activeCategory === "All"
    ? resources
    : resources.filter((r) => r.category === activeCategory);

  const countFor = (cat: string) =>
    cat === "All" ? resources.length : resources.filter((r) => r.category === cat).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Header */}
        <ScrollReveal>
          <div className="mb-8">
            <p className="section-label mb-2">Downloads</p>
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
            >
              Resources
            </h1>
            <p className="text-sm max-w-xl" style={{ color: "var(--slate-500)" }}>
              Download seat matrices, previous year cutoffs, government circulars, and more — all in one place.
            </p>
          </div>
        </ScrollReveal>

        {error && (
          <div
            className="rounded-xl p-4 text-sm mb-6"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
          >
            {error}
          </div>
        )}

        {/* Category tabs */}
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => {
              const count = countFor(cat);
              if (cat !== "All" && count === 0) return null;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200"
                  style={{
                    background: isActive ? "var(--primary-600)" : "var(--bg-primary)",
                    color: isActive ? "#ffffff" : "var(--slate-600)",
                    borderColor: isActive ? "var(--primary-600)" : "var(--slate-200)",
                    boxShadow: isActive ? "0 2px 8px rgba(79,70,229,0.25)" : "none",
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
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl border p-6" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
                <div className="shimmer-light h-5 rounded-lg w-1/3 mb-4" />
                <div className="shimmer-light h-5 rounded-lg w-3/4 mb-2" />
                <div className="shimmer-light h-3 rounded-lg w-full mb-2" />
                <div className="shimmer-light h-3 rounded-lg w-2/3 mb-5" />
                <div className="shimmer-light h-10 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}
          >
            <div className="text-4xl mb-3">📭</div>
            <p className="text-base font-semibold mb-1" style={{ color: "var(--slate-900)" }}>
              {activeCategory === "All"
                ? "No resources available yet"
                : `No resources in "${activeCategory}"`}
            </p>
            <p className="text-sm" style={{ color: "var(--slate-500)" }}>
              Check back soon for new resources.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((resource, i) => {
              const colors = CATEGORY_COLORS[resource.category] ?? CATEGORY_COLORS["Others"];
              const icon = CATEGORY_ICONS[resource.category] ?? CATEGORY_ICONS["Others"];

              return (
                <ScrollReveal key={resource.id} animation="fade-up" delay={i * 60}>
                  <div
                    className="rounded-2xl border p-6 transition-all duration-300 h-full flex flex-col"
                    style={{
                      background: "var(--bg-primary)",
                      borderColor: "var(--slate-200)",
                      boxShadow: "var(--shadow-xs)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                      e.currentTarget.style.borderColor = "var(--slate-200)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Category + date */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
                      >
                        <span>{icon}</span>
                        {resource.category}
                      </span>
                      <span className="text-xs" style={{ color: "var(--slate-400)" }}>
                        {new Date(resource.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>

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
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                        boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {resources.length > 0 && (
          <p className="mt-8 text-center text-xs" style={{ color: "var(--slate-400)" }}>
            All resources are provided for reference. Contact the counsellor if you need assistance.
          </p>
        )}
      </div>
    </div>
  );
}
