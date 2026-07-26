"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import ScrollReveal from "@/components/ScrollReveal";

interface Guide {
  id: string;
  title: string;
  description: string;
  file_url: string;
  is_active: boolean;
  created_at: string;
}

const GUIDES_CACHE_KEY = "guides:v1";
const GUIDES_CACHE_TTL_MS = 10 * 60 * 1000;

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchGuides = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/api/v1/guides`);
      const data = await response.json();

      if (data.success) {
        setGuides(data.data);
        try {
          localStorage.setItem(
            GUIDES_CACHE_KEY,
            JSON.stringify({ data: data.data, timestamp: Date.now() })
          );
        } catch {
          // Ignore cache write errors.
        }
      } else {
        setError("Failed to fetch guides");
      }
    } catch {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }, []); // no state deps — only uses setter functions which are stable

  useEffect(() => {
    let shouldShowLoader = true;
    try {
      const cached = localStorage.getItem(GUIDES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          data: Guide[];
          timestamp: number;
        };
        if (
          Array.isArray(parsed.data) &&
          Date.now() - parsed.timestamp < GUIDES_CACHE_TTL_MS
        ) {
          setGuides(parsed.data);
          setLoading(false);
          shouldShowLoader = false;
        }
      }
    } catch {
      // Ignore cache read errors and continue with network fetch.
    }

    fetchGuides(shouldShowLoader);
  }, [fetchGuides]);

  // Opens the file immediately — no form, no gate. The download is still
  // logged (fire-and-forget, guide_id only) so the admin panel keeps an
  // accurate download count per guide.
  const handleDownload = (guide: Guide) => {
    window.open(guide.file_url, "_blank");
    setDownloadingId(guide.id);
    fetch(`${API_BASE_URL}/api/v1/guides/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guide_id: guide.id }),
    })
      .catch(() => {})
      .finally(() => setDownloadingId(null));
  };

  const filteredGuides = search.trim()
    ? guides.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()))
    : guides;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Header */}
        <ScrollReveal>
          <div className="mb-8">
            <p className="section-label mb-2">Learn</p>
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
            >
              Admission Guides
            </h1>
            <p className="text-sm max-w-xl" style={{ color: "var(--slate-500)" }}>
              Download comprehensive guides for MHT-CET admissions — free, no sign-up.
            </p>
          </div>
        </ScrollReveal>

        {/* Search */}
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="mb-6">
            <div className="relative max-w-md">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--slate-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search guides…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-10"
                style={{ maxWidth: "100%" }}
              />
            </div>
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl border p-6" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
                <div className="shimmer-light h-5 rounded-lg w-3/4 mb-3" />
                <div className="shimmer-light h-3 rounded-lg w-full mb-2" />
                <div className="shimmer-light h-3 rounded-lg w-2/3 mb-5" />
                <div className="shimmer-light h-10 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : filteredGuides.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}
          >
            <div className="text-4xl mb-3">📚</div>
            <p className="text-base font-semibold mb-1" style={{ color: "var(--slate-900)" }}>
              {search.trim() ? "No guides match your search" : "No guides available"}
            </p>
            <p className="text-sm" style={{ color: "var(--slate-500)" }}>
              {search.trim() ? "Try a different search term." : "Check back later for new admission guides."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGuides.map((guide, i) => (
              <ScrollReveal key={guide.id} animation="fade-up" delay={i * 80}>
                <div
                  className="rounded-2xl border p-6 transition-all duration-300 h-full flex flex-col"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--slate-200)",
                    boxShadow: "var(--shadow-xs)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                    e.currentTarget.style.borderColor = "var(--primary-200)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                    e.currentTarget.style.borderColor = "var(--slate-200)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* PDF icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "var(--primary-50)", color: "var(--primary-600)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>

                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--slate-900)" }}>
                    {guide.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: "var(--slate-500)" }}>
                    {guide.description}
                  </p>
                  <button
                    onClick={() => handleDownload(guide)}
                    disabled={downloadingId === guide.id}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                      boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Guide
                  </button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
