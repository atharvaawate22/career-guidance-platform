"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

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
      <div className="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-pink-50" />
      <div className="absolute top-16 right-12 w-72 h-72 rounded-full bg-blue-200/20 blur-3xl" />
      <div className="absolute bottom-10 left-12 w-80 h-80 rounded-full bg-pink-200/25 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-sm font-bold tracking-[0.2em] text-blue-600 uppercase mb-4">
            FAQ
          </h2>
          <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Questions students ask us all the time
          </h3>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Quick answers for the most common doubts around predictions,
            cutoffs, CAP rounds, and planning your admission strategy.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white/80 px-6 py-10 text-center text-gray-500 shadow-sm">
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
          <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id;

            return (
              <article
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 shadow-sm ${
                  isOpen
                    ? "border-blue-200 bg-white shadow-lg"
                    : "border-gray-200 bg-white/80 hover:border-blue-100 hover:bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : faq.id)}
                  className="w-full px-6 py-5 text-left flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white shadow-sm">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {faq.question}
                      </h4>
                    </div>
                  </div>
                  <span
                    className={`mt-1 text-2xl leading-none text-blue-600 transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6">
                    <div className="ml-12 border-l-2 border-blue-100 pl-5 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}
