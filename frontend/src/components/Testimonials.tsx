"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import ScrollReveal from "@/components/ScrollReveal";

interface Testimonial {
  id: string;
  name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= rating ? "var(--primary-500)" : "none"}
          stroke={n <= rating ? "var(--primary-500)" : "var(--slate-300)"}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/testimonials`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setTestimonials(d.data);
        else throw new Error("Invalid response");
      })
      .catch(() => setError("Testimonials are temporarily unavailable."))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setName(""); setEmail(""); setRating(5); setHoverRating(0);
    setReviewText(""); setWebsite(""); setSubmitError("");
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/testimonials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, rating, review_text: reviewText, website }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setTestimonials((prev) => [data.data, ...prev]);
        handleClose();
      } else {
        setSubmitError(data.error?.message || "Failed to submit your review. Please try again.");
      }
    } catch {
      setSubmitError("Error connecting to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-20 lg:py-28" style={{ background: "var(--bg-primary)", borderTop: "1px solid var(--slate-100)" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <div>
              <p className="section-label mb-3">Real Stories</p>
              <h2
                className="text-3xl lg:text-4xl font-bold"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
              >
                What Students Say
              </h2>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
              }}
            >
              Share Your Experience
            </button>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border p-6" style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)" }}>
                <div className="shimmer-light h-4 rounded-lg w-24 mb-4" />
                <div className="shimmer-light h-3 rounded-lg w-full mb-2" />
                <div className="shimmer-light h-3 rounded-lg w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm" style={{ color: "var(--slate-500)" }}>{error}</p>
        ) : testimonials.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--slate-200)" }}
          >
            <p className="text-base font-semibold mb-1" style={{ color: "var(--slate-900)" }}>
              Be the first to share your experience
            </p>
            <p className="text-sm" style={{ color: "var(--slate-500)" }}>
              Your review helps other MHT-CET aspirants.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.id} animation="fade-up" delay={i * 60}>
                <div
                  className="rounded-2xl border p-6 h-full flex flex-col"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--slate-200)", boxShadow: "var(--shadow-xs)" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--primary-500), var(--primary-700))" }}
                    >
                      {t.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--slate-900)" }}>{t.name}</p>
                      <Stars rating={t.rating} size={13} />
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--slate-600)" }}>
                    &ldquo;{t.review_text}&rdquo;
                  </p>
                  <p className="text-xs mt-4" style={{ color: "var(--slate-400)" }}>
                    {format(parseISO(t.created_at), "dd MMM yyyy")}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>

      {/* Share Your Experience Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="rounded-2xl max-w-md w-full p-7 animate-scale-in max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--slate-200)", boxShadow: "var(--shadow-xl)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--slate-900)" }}>
              Share Your Experience
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--slate-500)" }}>
              Your review is published right away — positive or negative, all honest feedback is welcome, just keep it respectful.
            </p>

            {submitError && (
              <div
                className="rounded-xl p-3 text-sm mb-4"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot — hidden from real users via off-screen styling, not display:none (some bots skip display:none fields) */}
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              />

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--slate-700)" }}>
                  Your Rating <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      aria-label={`Rate ${n} out of 5`}
                      className="p-0.5"
                    >
                      <svg
                        width="26" height="26" viewBox="0 0 24 24"
                        fill={n <= (hoverRating || rating) ? "var(--primary-500)" : "none"}
                        stroke={n <= (hoverRating || rating) ? "var(--primary-500)" : "var(--slate-300)"}
                        strokeWidth="1.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--slate-700)" }}>
                  Name <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--slate-700)" }}>
                  Email <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="your.email@gmail.com"
                />
                <p className="text-xs mt-1" style={{ color: "var(--slate-400)" }}>
                  Never shown publicly — for our reference only.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--slate-700)" }}>
                  Your Review <span style={{ color: "var(--danger-500)" }}>*</span>
                </label>
                <textarea
                  required
                  minLength={10}
                  maxLength={800}
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="input-base resize-y"
                  placeholder="Tell other students about your experience…"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="btn-outline flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
