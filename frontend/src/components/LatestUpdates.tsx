"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import ScrollReveal from "@/components/ScrollReveal";

interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
}

/** Split a "[Category] Title" string into its badge + title parts. */
function parseTitle(raw: string): { category: string | null; title: string } {
  const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
  return m ? { category: m[1], title: m[2] } : { category: null, title: raw };
}

/**
 * Compact "Latest Updates" strip for the homepage — surfaces the 3 most recent
 * official MHT-CET notices so returning visitors see fresh news immediately,
 * with a link through to the full /updates feed. Renders nothing if there is
 * no data (keeps the homepage clean on error/empty instead of a broken block).
 */
export default function LatestUpdates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/updates`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (!active) return;
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          const sorted = [...(d.data as Update[])].sort(
            (a, b) =>
              new Date(b.published_date).getTime() -
              new Date(a.published_date).getTime(),
          );
          setUpdates(sorted.slice(0, 3));
          setStatus("ready");
        } else {
          setStatus("empty");
        }
      } catch {
        if (active) setStatus("empty");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (status === "empty") return null;

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <section
      className="py-16 lg:py-20"
      style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--slate-100)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="section-label mb-2">News</p>
              <h2
                className="text-2xl lg:text-3xl font-bold"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
              >
                Latest MHT-CET Updates
              </h2>
            </div>
            <Link
              href="/updates"
              className="inline-flex items-center gap-1.5 text-sm font-semibold shrink-0 transition-all duration-200 hover:gap-2.5"
              style={{ color: "var(--primary-600)" }}
            >
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {status === "loading"
            ? [1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border p-5" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
                  <div className="shimmer-light h-3 rounded-lg w-24 mb-3" />
                  <div className="shimmer-light h-4 rounded-lg w-3/4 mb-2" />
                  <div className="shimmer-light h-4 rounded-lg w-1/2" />
                </div>
              ))
            : updates.map((u, i) => {
                const { category, title } = parseTitle(u.title);
                return (
                  <ScrollReveal key={u.id} animation="fade-up" delay={i * 80}>
                    <Link
                      href="/updates"
                      className="group block rounded-2xl border p-5 h-full transition-all duration-300"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-xs)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary-200)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--slate-200)"; e.currentTarget.style.boxShadow = "var(--shadow-xs)"; }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {category && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-50)", color: "var(--primary-600)" }}>
                            {category}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--slate-400)" }}>{fmtDate(u.published_date)}</span>
                      </div>
                      <h3 className="text-[15px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--slate-900)" }}>
                        {title}
                      </h3>
                    </Link>
                  </ScrollReveal>
                );
              })}
        </div>
      </div>
    </section>
  );
}
