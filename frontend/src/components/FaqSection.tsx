"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

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
        const r = await fetch(`${API_BASE_URL}/api/faqs`, { cache: "no-store" });
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
    <section className="py-20" style={{ background: "var(--ice)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-3xl mx-auto px-6 lg:px-8">

        <div className="text-center mb-12">
          <p className="section-label mb-3">FAQ</p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-3" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
            Got questions? We&apos;ve got answers
          </h2>
          <p className="text-base" style={{ color: "var(--slate)" }}>
            Quick answers for the most common doubts around predictions, cutoffs, CAP rounds, and planning your strategy.
          </p>
        </div>

        {isLoading ? (
          <div className="card px-6 py-10 text-center">
            <div className="inline-block animate-spin w-6 h-6 rounded-full border-2 border-t-transparent mr-2 align-middle"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--gold)" }} />
            <span style={{ color: "var(--slate)" }}>Loading FAQs…</span>
          </div>
        ) : loadError ? (
          <div className="card px-6 py-10 text-center text-sm" style={{ color: "#DC2626" }}>{loadError}</div>
        ) : faqs.length === 0 ? (
          <div className="card px-6 py-10 text-center text-sm" style={{ color: "var(--slate)" }}>No FAQs available right now.</div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openId === faq.id;
              return (
                <article key={faq.id} className="card transition-all duration-200"
                  style={{ borderColor: isOpen ? "var(--gold)" : "var(--border)", borderRadius: ".75rem" }}>
                  <button type="button" onClick={() => setOpenId(isOpen ? "" : faq.id)}
                    className="w-full px-5 py-4 text-left flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-xs font-bold mt-0.5"
                        style={{ background: isOpen ? "var(--gold)" : "var(--ice-mid)", color: isOpen ? "var(--navy)" : "var(--slate)" }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h4 className="text-sm sm:text-base font-semibold leading-snug pt-0.5" style={{ color: "var(--ink)" }}>
                        {faq.question}
                      </h4>
                    </div>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-base transition-transform duration-200 mt-0.5"
                      style={{
                        background: isOpen ? "var(--gold)" : "var(--ice-mid)",
                        color: isOpen ? "var(--navy)" : "var(--slate)",
                        transform: isOpen ? "rotate(45deg)" : "none",
                      }}>
                      +
                    </span>
                  </button>
                  <div className="faq-answer-grid" data-open={isOpen}>
                    <div className="faq-answer-inner">
                      <div className="px-5 pb-5 pl-16">
                        <p className="text-sm leading-relaxed" style={{ color: "var(--slate)", borderLeft: "2px solid var(--gold)", paddingLeft: "1rem" }}>
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
