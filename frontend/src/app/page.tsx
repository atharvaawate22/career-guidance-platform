"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FaqSection from "@/components/FaqSection";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/* ─── Feature cards data ─────────────────────────────────────────── */
const features = [
  {
    num: "01", title: "College Predictor",
    desc: "Get accurate college predictions based on your MHT-CET rank, category, and preferences.",
    href: "/predictor", accent: "#4F46E5",
  },
  {
    num: "02", title: "Cutoff Explorer",
    desc: "Access comprehensive cutoff data and trends for 300+ colleges across all CAP rounds.",
    href: "/cutoffs", accent: "#0891B2",
  },
  {
    num: "03", title: "Admission Guides",
    desc: "Explore detailed guides covering career paths, courses, and admission strategies.",
    href: "/guides", accent: "#059669",
  },
  {
    num: "04", title: "Resources",
    desc: "Download seat matrices, government circulars, and previous year cutoff PDFs.",
    href: "/resources", accent: "#D97706",
  },
  {
    num: "05", title: "Book a Session",
    desc: "Schedule one-on-one sessions with experienced career counselors — completely free.",
    href: "/book", accent: "#7C3AED",
  },
  {
    num: "06", title: "Latest Updates",
    desc: "Stay informed with the latest MHT-CET news, notifications, and key dates.",
    href: "/updates", accent: "#DB2777",
  },
];

const steps = [
  {
    n: "01", title: "Enter your score",
    desc: "Provide your MHT-CET percentile or official CAP rank along with your reservation category.",
  },
  {
    n: "02", title: "Explore predictions",
    desc: "Instantly see Safe, Target, and Dream college options — powered by 33,497 actual 2025 CAP records.",
  },
  {
    n: "03", title: "Finalise & book",
    desc: "Still have doubts? Book a free one-on-one session with our expert counselors.",
  },
];

/* ─── Arrow SVG ──────────────────────────────────────────────────── */
function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"loading" | "connected" | "disconnected">("loading");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/health`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { status: string }) => setBackendStatus(d.status === "ok" ? "connected" : "disconnected"))
      .catch(() => setBackendStatus("disconnected"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)" }}>

      {/* ═══════════════════════ HERO ══════════════════════════════ */}
      <section style={{ background: "var(--white)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — text */}
            <div className="animate-fade-up">
              {/* Status pill */}
              <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "var(--ice-mid)", border: "1px solid var(--border)", color: "var(--slate)" }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{
                    background: backendStatus === "connected" ? "#22C55E" : backendStatus === "loading" ? "#F59E0B" : "#EF4444",
                    boxShadow: backendStatus === "connected" ? "0 0 0 3px rgb(34 197 94 / .2)" : "none",
                  }} />
                {backendStatus === "connected" ? "Platform Live · 2025 Data Ready" : backendStatus === "loading" ? "Connecting…" : "Service Unavailable"}
              </div>

              {/* Heading */}
              <h1 className="font-display text-5xl lg:text-6xl font-bold leading-[1.1] mb-5"
                style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                Navigate Your<br />
                <span className="gold-shimmer">Engineering</span><br />
                Future
              </h1>

              <p className="text-lg leading-relaxed mb-8 max-w-lg" style={{ color: "var(--slate)" }}>
                Data-driven college predictions, real 2025 CAP cutoffs, and expert one-on-one guidance —
                everything you need for Maharashtra engineering admissions.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/predictor" className="btn-gold">
                  Predict My College <ArrowRight />
                </Link>
                <Link href="/cutoffs" className="btn-outline">
                  Browse Cutoffs
                </Link>
              </div>
            </div>

            {/* Right — stats card */}
            <div className="animate-fade-up-2 lg:pl-8">
              <div className="rounded-2xl p-8" style={{ background: "var(--navy)", border: "1px solid var(--navy-border)" }}>
                <p className="section-label mb-6" style={{ color: "var(--gold)" }}>Platform at a Glance</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { val: "33,497", label: "Cutoff Records" },
                    { val: "300+",   label: "Colleges Covered" },
                    { val: "4",      label: "CAP Rounds" },
                    { val: "Free",   label: "Expert Sessions" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--navy-light)", border: "1px solid var(--navy-border)" }}>
                      <div className="text-2xl font-bold mb-0.5" style={{ color: "var(--gold)", fontFamily: "var(--font-playfair)" }}>{s.val}</div>
                      <div className="text-xs" style={{ color: "var(--slate-light)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl p-4 flex items-center gap-3" style={{ background: "rgb(201 168 76 / .08)", border: "1px solid rgb(201 168 76 / .18)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-sm" style={{ color: "var(--slate-light)" }}>
                    Powered by official 2025 Maharashtra CAP data
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section className="py-20" style={{ background: "var(--ice)" }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <p className="section-label mb-3">The Process</p>
            <h2 className="text-3xl lg:text-4xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
              How it works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px" style={{ background: "var(--border)" }} />

            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center px-6 pb-8 md:pb-0">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold mb-5 relative z-10"
                  style={{
                    background: "var(--white)",
                    border: "2px solid var(--gold)",
                    color: "var(--gold)",
                    fontFamily: "var(--font-playfair)",
                    boxShadow: "0 0 0 4px var(--ice)",
                  }}
                >
                  {step.n}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--ink)" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--slate)" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ SERVICES ══════════════════════════ */}
      <section className="py-20" style={{ background: "var(--white)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="section-label mb-2">What We Offer</p>
              <h2 className="text-3xl lg:text-4xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                Our Services
              </h2>
            </div>
            <p className="text-sm max-w-xs text-right" style={{ color: "var(--slate)" }}>
              Everything you need for a successful engineering admission journey.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <Link
                key={f.href}
                href={f.href}
                className="group card card-hover block p-6 rounded-xl"
                style={{ textDecoration: "none" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-bold tracking-widest" style={{ color: "var(--slate-light)" }}>{f.num}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
                    style={{ background: f.accent + "14", color: f.accent }}>
                    Explore →
                  </span>
                </div>
                <div className="w-8 h-1 rounded-full mb-4 transition-all duration-300 group-hover:w-12" style={{ background: f.accent }} />
                <h3 className="text-base font-bold mb-2 transition-colors" style={{ color: "var(--ink)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--slate)" }}>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FAQ ════════════════════════════════ */}
      <FaqSection />

      {/* ═══════════════════════ CTA ════════════════════════════════ */}
      <section className="py-20" style={{ background: "var(--navy)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Get Started Today</p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: "var(--white)", fontFamily: "var(--font-playfair)" }}>
            Ready to find your college?
          </h2>
          <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "var(--slate-light)" }}>
            Join thousands of students who have successfully navigated their admission journey with data-driven predictions and expert guidance.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/predictor" className="btn-gold">
              Start Predictor <ArrowRight />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
              style={{ background: "rgb(255 255 255 / .08)", color: "var(--white)", border: "1.5px solid var(--navy-border)" }}
            >
              Book Free Session
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ════════════════════════════ */}
      <footer style={{ background: "var(--navy-mid)", borderTop: "1px solid var(--navy-border)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {[
              { heading: "Tools", links: [{ label: "College Predictor", href: "/predictor" }, { label: "Cutoff Explorer", href: "/cutoffs" }] },
              { heading: "Learn",   links: [{ label: "Admission Guides", href: "/guides" }, { label: "Resources", href: "/resources" }] },
              { heading: "Connect", links: [{ label: "Book a Session", href: "/book" }, { label: "Latest Updates", href: "/updates" }] },
              { heading: "About",   links: [] },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--slate-light)" }}>{col.heading}</h4>
                {col.links.length > 0 ? (
                  <ul className="space-y-2">
                    {col.links.map(l => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-sm transition-colors" style={{ color: "var(--slate-light)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--slate-light)")}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--slate)" }}>
                    Helping MHT-CET aspirants make data-driven admission decisions since 2025.
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid var(--navy-border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--white)" }}>
              © 2026 <span style={{ color: "var(--gold)" }}>CETHub</span>
            </p>
            <p className="text-xs" style={{ color: "var(--slate)" }}>Empowering students to achieve their academic goals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}