"use client";

import { useEffect, useState } from "react";
import { publicGet, publicPost } from "@/lib/api";
import ScrollReveal from "@/components/ScrollReveal";
import type { Guide } from "@/lib/serverContent";

/**
 * Guide cards. The list arrives server-rendered (app/guides/page.tsx), so every
 * title and description is in the HTML; the client fetch is only a fallback.
 * No search box: with a handful of guides it was clutter. Bring one back if
 * the list grows past roughly eight.
 */
export default function GuidesList({ initialGuides }: { initialGuides: Guide[] }) {
  const [guides, setGuides] = useState<Guide[]>(initialGuides);
  const [loading, setLoading] = useState(initialGuides.length === 0);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialGuides.length > 0) return;
    (async () => {
      try {
        const res = await publicGet("guides");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setGuides(data.data);
        else setError("Guides are temporarily unavailable.");
      } catch {
        setError("Guides are temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    })();
    // initialGuides is fixed for the page's lifetime; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens the file immediately — no form, no gate. The download is still
  // logged (fire-and-forget, guide_id only) so the admin panel keeps an
  // accurate download count per guide.
  const handleDownload = (guide: Guide) => {
    window.open(guide.file_url, "_blank");
    setDownloadingId(guide.id);
    publicPost("/api/v1/guides/download", { guide_id: guide.id })
      .catch(() => {})
      .finally(() => setDownloadingId(null));
  };

  if (error) {
    return (
      <div className="rounded-xl p-4 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border p-6" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
            <div className="shimmer-light h-5 rounded-lg w-3/4 mb-3" />
            <div className="shimmer-light h-3 rounded-lg w-full mb-5" />
            <div className="shimmer-light h-10 rounded-lg w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <div className="rounded-2xl border p-10 text-center text-sm" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: "var(--slate-500)" }}>
        No guides available right now.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {guides.map((guide, i) => (
        <ScrollReveal key={guide.id} animation="fade-up" delay={i * 80}>
          <div
            className="rounded-2xl border p-6 h-full flex flex-col"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-xs)" }}
          >
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--slate-900)" }}>
              {guide.title}
            </h2>
            <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: "var(--slate-500)" }}>
              {guide.description}
            </p>
            <button
              type="button"
              onClick={() => handleDownload(guide)}
              disabled={downloadingId === guide.id}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))" }}
            >
              Download guide (PDF)
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
