"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export default function FaqSection() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const response = await fetch(`${API_BASE_URL}/api/faqs`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`FAQ request failed with HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setFaqs(data.data);
          setOpenId(data.data[0]?.id ?? "");
        } else {
          throw new Error("Invalid FAQ response");
        }
      } catch (error) {
        console.error("Failed to load FAQs:", error);
        setFaqs([]);
        setOpenId("");
        setLoadError("FAQs are temporarily unavailable.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaqs();
  }, []);

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-purple-50/60 via-white to-pink-50/60" />
      <div className="absolute top-16 right-12 w-72 h-72 rounded-full bg-purple-200/20 blur-3xl" />
      <div className="absolute bottom-10 left-12 w-80 h-80 rounded-full bg-pink-200/25 blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-sm font-bold tracking-[0.2em] text-purple-600 uppercase mb-4">
            Frequently Asked Questions
          </h2>
          <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Got questions? We&apos;ve got answers
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Quick answers for the most common doubts around predictions,
            cutoffs, CAP rounds, and planning your admission strategy.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white/80 px-6 py-10 text-center text-gray-500 shadow-sm">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-purple-200 border-t-purple-600 mr-3 align-middle" />
            Loading FAQs...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700 shadow-sm">
            {loadError}
          </div>
        ) : faqs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white/80 px-6 py-10 text-center text-gray-500 shadow-sm">
            No FAQs are available right now.
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openId === faq.id;

              return (
                <article
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isOpen
                      ? "border-purple-200 bg-white shadow-lg"
                      : "border-gray-200 bg-white/80 hover:border-purple-100 hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? "" : faq.id)}
                    className="w-full px-6 py-5 text-left flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-pink-500 text-sm font-bold text-white shadow-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                          {faq.question}
                        </h4>
                      </div>
                    </div>
                    <span
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-all duration-200 ${
                        isOpen
                          ? "rotate-45 bg-purple-600 text-white border-purple-600"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      +
                    </span>
                  </button>

                  {/* Animated accordion body */}
                  <div className="faq-answer-grid" data-open={isOpen}>
                    <div className="faq-answer-inner">
                      <div className="px-6 pb-6">
                        <div className="ml-12 border-l-2 border-purple-100 pl-5 text-gray-600 leading-relaxed text-sm sm:text-base">
                          {faq.answer}
                        </div>
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
