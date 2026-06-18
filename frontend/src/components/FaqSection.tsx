"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import ScrollReveal from "@/components/ScrollReveal";

interface Faq { id: string; question: string; answer: string; display_order: number; }

export default function FaqSection() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetch_ = async () => {
      try {
        setIsLoading(true); setLoadError("");
        const r = await fetch(`${API_BASE_URL}/api/v1/faqs`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (d.success && Array.isArray(d.data)) {
          setFaqs(d.data);
          setOpenId(d.data[0]?.id ?? "");
        } else throw new Error("Invalid response");
      } catch (err) {
        console.error("FAQ load failed:", err);
        setFaqs([]); setOpenId("");
        setLoadError("FAQs are temporarily unavailable.");
      } finally { setIsLoading(false); }
    };
    fetch_();
  }, []);

  return (
    <section className="py-20 lg:py-28" style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--slate-100)" }}>
      <div className="max-w-3xl mx-auto px-6 lg:px-8">

        <ScrollReveal>
          <div className="text-center mb-14">
            <p className="section-label mb-3">FAQ</p>
            <h2 className="text-3xl lg:text-4xl font-bold mb-3" style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>
              Got questions? We&apos;ve got answers
            </h2>
            <p className="text-base" style={{ color: "var(--slate-500)" }}>
              Quick answers for the most common doubts around predictions, cutoffs, CAP rounds, and planning your strategy.
            </p>
          </div>
        </ScrollReveal>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border p-5" style={{ borderColor: "var(--slate-200)", background: "var(--bg-primary)" }}>
                <div className="shimmer-light h-5 rounded-lg w-3/4 mb-2" />
                <div className="shimmer-light h-3 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl p-6 text-center text-sm border" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#DC2626" }}>{loadError}</div>
        ) : faqs.length === 0 ? (
          <div className="rounded-2xl p-6 text-center text-sm border" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", color: "var(--slate-500)" }}>No FAQs available right now.</div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openId === faq.id;
              return (
                <ScrollReveal key={faq.id} animation="fade-up" delay={idx * 60}>
                  <article
                    className="rounded-2xl border transition-all duration-300"
                    style={{
                      background: "var(--bg-primary)",
                      borderColor: isOpen ? "var(--primary-200)" : "var(--slate-200)",
                      boxShadow: isOpen ? "0 0 0 1px var(--primary-100), var(--shadow-sm)" : "var(--shadow-xs)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? "" : faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${faq.id}`}
                      className="w-full px-5 py-4 text-left flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 text-xs font-bold mt-0.5 transition-colors duration-200"
                          style={{
                            background: isOpen ? "var(--primary-600)" : "var(--slate-100)",
                            color: isOpen ? "#ffffff" : "var(--slate-500)",
                          }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h4 className="text-sm sm:text-[15px] font-semibold leading-snug pt-1" style={{ color: "var(--slate-900)" }}>
                          {faq.question}
                        </h4>
                      </div>
                      <span
                        aria-hidden="true"
                        className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-base transition-all duration-300 mt-0.5"
                        style={{
                          background: isOpen ? "var(--primary-50)" : "var(--slate-100)",
                          color: isOpen ? "var(--primary-600)" : "var(--slate-400)",
                          transform: isOpen ? "rotate(45deg)" : "none",
                        }}
                      >
                        +
                      </span>
                    </button>
                    <div id={`faq-panel-${faq.id}`} role="region" className="faq-answer-grid" data-open={isOpen}>
                      <div className="faq-answer-inner">
                        <div className="px-5 pb-5 pl-[4.5rem]">
                          <p
                            className="text-sm leading-relaxed"
                            style={{
                              color: "var(--slate-500)",
                              borderLeft: "2px solid var(--primary-300)",
                              paddingLeft: "1rem",
                            }}
                          >
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic AEO/GEO FAQPage Schema Markup */}
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })
          }}
        />
      )}
    </section>
  );
}
