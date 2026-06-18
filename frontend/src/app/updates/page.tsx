"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import ScrollReveal from "@/components/ScrollReveal";

interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/updates`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setUpdates(data.data);
          setError("");
        } else {
          setError("Invalid response format from backend");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch updates");
      } finally {
        setLoading(false);
      }
    };
    fetchUpdates();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMonthGroup = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "long",
      year: "numeric",
    });
  };

  // Group updates by month
  const groupedUpdates = updates.reduce<Map<string, Update[]>>((acc, update) => {
    const key = formatMonthGroup(update.published_date);
    const existing = acc.get(key) || [];
    existing.push(update);
    acc.set(key, existing);
    return acc;
  }, new Map());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-secondary)" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Header */}
        <ScrollReveal>
          <div className="mb-10">
            <p className="section-label mb-2">News</p>
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
            >
              Latest Updates
            </h1>
            <p className="text-sm max-w-lg" style={{ color: "var(--slate-500)" }}>
              Stay updated with the latest MHT-CET news, notifications, and important dates.
            </p>
          </div>
        </ScrollReveal>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0 w-8">
                  <div className="shimmer-light w-3 h-3 rounded-full" />
                  <div className="shimmer-light w-px flex-1 mt-1" />
                </div>
                <div className="flex-1 rounded-2xl border p-5 mb-2" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
                  <div className="shimmer-light h-3 rounded-lg w-24 mb-3" />
                  <div className="shimmer-light h-5 rounded-lg w-3/4 mb-2" />
                  <div className="shimmer-light h-3 rounded-lg w-full mb-1" />
                  <div className="shimmer-light h-3 rounded-lg w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
          >
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && updates.length === 0 && (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}
          >
            <div className="text-4xl mb-3">📭</div>
            <p className="text-base font-semibold" style={{ color: "var(--slate-900)" }}>No updates available</p>
            <p className="text-sm mt-1" style={{ color: "var(--slate-500)" }}>Check back later for the latest news.</p>
          </div>
        )}

        {/* Timeline */}
        {!loading && !error && updates.length > 0 && (
          <div className="space-y-10">
            {Array.from(groupedUpdates.entries()).map(([monthLabel, monthUpdates], gi) => (
              <ScrollReveal key={monthLabel} animation="fade-up" delay={gi * 100}>
                <div>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-5">
                    <span
                      className="text-sm font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--primary-50)", color: "var(--primary-700)", border: "1px solid var(--primary-200)" }}
                    >
                      {monthLabel}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--slate-200)" }} />
                  </div>

                  {/* Updates in this month */}
                  <div className="space-y-0 pl-3">
                    {monthUpdates.map((update, i) => {
                      const isExpanded = expandedIds.has(update.id);
                      const isLong = update.content.length > 300;

                      return (
                        <div key={update.id} className="relative flex gap-4 group">
                          {/* Timeline line + dot */}
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className="w-3 h-3 rounded-full border-2 mt-1.5 z-10 transition-colors"
                              style={{
                                borderColor: "var(--primary-500)",
                                background: i === 0 && gi === 0 ? "var(--primary-500)" : "var(--bg-primary)",
                              }}
                            />
                            {i < monthUpdates.length - 1 && (
                              <div className="w-px flex-1 -mb-1" style={{ background: "var(--slate-200)" }} />
                            )}
                          </div>

                          {/* Card */}
                          <div
                            className="flex-1 rounded-2xl border p-5 mb-4 transition-all duration-200"
                            style={{
                              background: "var(--bg-primary)",
                              borderColor: "var(--slate-200)",
                              boxShadow: "var(--shadow-xs)",
                            }}
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs font-medium" style={{ color: "var(--slate-400)" }}>
                                {formatDate(update.published_date)}
                              </span>
                              {update.edited_at && (
                                <span
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                                  style={{ background: "var(--warning-50)", color: "var(--warning-700)", border: "1px solid var(--warning-200)" }}
                                >
                                  Edited
                                </span>
                              )}
                            </div>
                            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--slate-900)" }}>
                              {update.title}
                            </h2>
                            <div className="relative">
                              <p
                                className="text-sm leading-relaxed"
                                style={{
                                  color: "var(--slate-600)",
                                  maxHeight: !isExpanded && isLong ? "4.5rem" : "none",
                                  overflow: "hidden",
                                  transition: "max-height 0.3s ease",
                                }}
                              >
                                {update.content}
                              </p>
                              {isLong && !isExpanded && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-8"
                                  style={{ background: "linear-gradient(transparent, var(--bg-primary))" }}
                                />
                              )}
                            </div>
                            {isLong && (
                              <button
                                onClick={() => toggleExpand(update.id)}
                                className="text-xs font-semibold mt-2 transition-colors"
                                style={{ color: "var(--primary-600)" }}
                              >
                                {isExpanded ? "Show less" : "Read more"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>

      {/* Schema.org NewsArticle ItemList structured markup */}
      {updates.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              "itemListElement": updates.map((update, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "NewsArticle",
                  "headline": update.title,
                  "description": update.content.substring(0, 160) + (update.content.length > 160 ? "..." : ""),
                  "datePublished": update.published_date,
                  "dateModified": update.edited_at || update.published_date,
                  "author": {
                    "@type": "Organization",
                    "name": "CETHub",
                    "url": "https://cethub.in"
                  },
                  "publisher": {
                    "@type": "Organization",
                    "name": "CETHub",
                    "url": "https://cethub.in",
                    "logo": {
                      "@type": "ImageObject",
                      "url": "https://cethub.in/favicon.ico"
                    }
                  },
                  "mainEntityOfPage": "https://cethub.in/updates"
                }
              }))
            })
          }}
        />
      )}
    </div>
  );
}
