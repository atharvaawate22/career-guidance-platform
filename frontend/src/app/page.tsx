import Link from "next/link";
import { CUTOFF_YEAR } from "@/lib/dataYear";
import { COLLEGE_COUNT } from "@/lib/siteStats";
import FaqSection from "@/components/FaqSection";
import { fetchFaqs } from "@/lib/serverFaqs";
import LatestUpdates from "@/components/LatestUpdates";
import Testimonials from "@/components/Testimonials";
import QuickPredict from "@/components/QuickPredict";
import ScrollReveal from "@/components/ScrollReveal";
import ArrowRight from "@/components/ArrowRight";
import FeatureCard, { type Feature } from "@/components/FeatureCard";
import { BOOKINGS_ENABLED } from "@/lib/features";

/* ── Feature cards data ──────────────────────────────────────────── */
const features: Feature[] = [
  {
    title: "College Predictor",
    desc: "Get accurate college predictions based on your MHT-CET rank, category, and preferences.",
    href: "/predictor",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, var(--primary-50), var(--primary-100))",
    iconColor: "var(--primary-600)",
    borderHover: "var(--primary-200)",
  },
  {
    title: "Cutoff Explorer",
    desc: `Access comprehensive cutoff data for ${COLLEGE_COUNT} colleges across all CAP rounds.`,
    href: "/cutoffs",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, var(--accent-50), var(--accent-100))",
    iconColor: "var(--accent-600)",
    borderHover: "var(--accent-200)",
  },
  ...(BOOKINGS_ENABLED ? [{
    title: "Book a Session",
    desc: "Schedule one-on-one sessions with experienced career counselors — completely free.",
    href: "/book",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    iconColor: "var(--success-600)",
    borderHover: "#bbf7d0",
  }] : []),
  {
    title: "Admission Guides",
    desc: "Explore detailed guides covering career paths, courses, and admission strategies.",
    href: "/guides",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #fdf4ff, #fae8ff)",
    iconColor: "#a855f7",
    borderHover: "#e9d5ff",
  },
  {
    title: "Resources",
    desc: "Download seat matrices, government circulars, and previous year cutoff PDFs.",
    href: "/resources",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #fff7ed, #ffedd5)",
    iconColor: "#ea580c",
    borderHover: "#fed7aa",
  },
  {
    title: "Latest Updates",
    desc: "Stay informed with the latest MHT-CET news, notifications, and key dates.",
    href: "/updates",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #fef2f2, #fecaca40)",
    iconColor: "#dc2626",
    borderHover: "#fecaca",
  },
];

/* ── Homepage ────────────────────────────────────────────────────── */
// ISR: the FAQ section is server-rendered from the backend (see lib/serverFaqs.ts);
// refresh hourly so admin FAQ edits show up the same day.
export const revalidate = 3600;

export default async function Home() {
  const faqs = await fetchFaqs();
  // The status pill used to poll /api/v1/health on mount, retrying every 5s
  // until it succeeded. That endpoint runs SELECT 1 plus a Redis PING, is
  // deliberately uncacheable, and carries no rate limiter — so the highest
  // traffic page on the site spent one uncached origin request, one DB round
  // trip and one Redis round trip per pageview, on a free-tier instance whose
  // entire caching architecture exists to avoid exactly that. It also inverted
  // its own purpose: the pill only turned green after the cold start it had
  // just triggered finished, so a first-time visitor watched a trust signal
  // say "Connecting…" for 30 seconds. The data year is known at build time,
  // so the pill is now static.

  return (
    <div style={{ background: "var(--bg-primary)" }}>

      {/* ═══════════════ HERO ═══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--primary-950) 0%, var(--slate-900) 50%, var(--primary-900) 100%)",
          minHeight: "min(100vh, 800px)",
        }}
      >
        {/* Mesh gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, var(--primary-500), transparent 70%)",
              animation: "float 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, var(--accent-500), transparent 70%)",
              animation: "float 10s ease-in-out infinite reverse",
            }}
          />
          <div
            className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, var(--primary-400), transparent 70%)",
              animation: "float 6s ease-in-out infinite 2s",
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 lg:pt-32 pb-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Text */}
            <div className="animate-fade-up">
              {/* Status pill — what's current: the finished CAP dataset, and a
                  pointer to the next exam cycle's official notices. */}
              <Link
                href="/updates"
                className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-semibold hover:opacity-90"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--slate-300)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    background: "#22C55E",
                    boxShadow: "0 0 8px rgba(34,197,94,0.5)",
                  }}
                />
                {CUTOFF_YEAR} CAP data complete · MHT-CET {Number(CUTOFF_YEAR) + 1} updates
                <span aria-hidden="true">→</span>
              </Link>

              {/* Heading */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] mb-6"
                style={{ fontFamily: "var(--font-display)", color: "#ffffff" }}
              >
                Navigate Your{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, var(--primary-300), var(--accent-300))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Engineering
                </span>
                <br />
                Future
              </h1>

              <p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: "var(--slate-300)" }}>
                Data-driven college predictions, real {CUTOFF_YEAR} CAP cutoffs, and expert one-on-one guidance —
                everything you need for Maharashtra engineering admissions.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={BOOKINGS_ENABLED ? "/book" : "/cutoffs"}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                  }}
                >
                  {BOOKINGS_ENABLED ? <>Book a Free Session <ArrowRight /></> : <>Browse Cutoffs <ArrowRight /></>}
                </Link>
                <Link
                  href={BOOKINGS_ENABLED ? "/cutoffs" : "/guides"}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] backdrop-blur-[8px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)]"
                >
                  {BOOKINGS_ENABLED ? "Browse Cutoffs" : "View Admission Guides"}
                </Link>
              </div>
            </div>

            {/* Right — Quick Predict (primary action, above the fold) */}
            <div className="animate-fade-up-2 w-full max-w-md mx-auto lg:ml-auto">
              <QuickPredict />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="hidden lg:flex justify-center mt-16">
            <div
              className="w-6 h-10 rounded-full border-2 flex items-start justify-center pt-2"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              <div
                className="w-1 h-2.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.4)",
                  animation: "scrollBounce 2s infinite",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* LATEST UPDATES — fresh official notices, surfaced high on the page */}
      <LatestUpdates />

      {/* FEATURES — what we offer (shown before "how it works") */}
      <section className="py-20 lg:py-28" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-14">
              <p className="section-label mb-3">What We Offer</p>
              <h2
                className="text-3xl lg:text-4xl font-bold"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
              >
                Everything You Need
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.href} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — real student reviews, high up while engagement is
          still strong (and clear of the FAQ/CTA close, which read as the
          page's natural wrap-up) */}
      <Testimonials />

      {/* ═══════════════ FAQ ══════════════════════════════════════════ */}
      <FaqSection initialFaqs={faqs} />

      {/* ═══════════════ CTA ══════════════════════════════════════════ */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--primary-950), var(--slate-900))",
        }}
      >
        {/* Decorative gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--primary-500), transparent 70%)" }}
          />
        </div>

        <ScrollReveal>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--primary-300)" }}>
              Get Started Today
            </p>
            <h2
              className="text-3xl lg:text-4xl font-bold mb-5"
              style={{ color: "#ffffff", fontFamily: "var(--font-display)" }}
            >
              Ready to find your college?
            </h2>
            <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: "var(--slate-300)" }}>
              Make a confident, data-driven choice with real {CUTOFF_YEAR} CAP cutoffs,
              college predictions, and free expert guidance.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/predictor"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
                  boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                }}
              >
                Start Predictor <ArrowRight />
              </Link>
              <Link
                href={BOOKINGS_ENABLED ? "/book" : "/cutoffs"}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.12)]"
              >
                {BOOKINGS_ENABLED ? "Book Free Session" : "Browse Cutoffs"}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
