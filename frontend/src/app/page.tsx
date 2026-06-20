"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import FaqSection from "@/components/FaqSection";
import LatestUpdates from "@/components/LatestUpdates";
import QuickPredict from "@/components/QuickPredict";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/* ── Feature cards data ──────────────────────────────────────────── */
const features = [
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
    desc: "Access comprehensive cutoff data for 300+ colleges across all CAP rounds.",
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
  {
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
  },
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

const steps = [
  {
    n: 1,
    title: "Enter your score",
    desc: "Provide your MHT-CET percentile or official CAP rank along with your reservation category.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Explore predictions",
    desc: "Instantly see Safe, Target, and Dream college options — powered by 90,000+ actual 2025 CAP cutoff records.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Finalise & book",
    desc: "Still have doubts? Book a free one-on-one session with our expert counselors.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

/* ── Arrow icon ──────────────────────────────────────────────────── */
function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ── Feature Card with tilt effect ───────────────────────────────── */
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) card.style.transform = "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
  };

  return (
    <ScrollReveal animation="fade-up" delay={index * 80}>
      <Link
        ref={cardRef}
        href={feature.href}
        className="group block rounded-2xl p-6 border transition-all duration-300"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--slate-200)",
          boxShadow: "var(--shadow-xs)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = feature.borderHover;
          e.currentTarget.style.boxShadow = "var(--shadow-lg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--slate-200)";
          e.currentTarget.style.boxShadow = "var(--shadow-xs)";
          handleMouseLeave();
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
          style={{ background: feature.gradient, color: feature.iconColor }}
        >
          {feature.icon}
        </div>

        {/* Content */}
        <h3
          className="text-[17px] font-bold mb-2 transition-colors"
          style={{ color: "var(--slate-900)" }}
        >
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--slate-500)" }}>
          {feature.desc}
        </p>

        {/* Link indicator */}
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 group-hover:gap-2.5"
          style={{ color: feature.iconColor }}
        >
          Explore
          <ArrowRight size={14} />
        </span>
      </Link>
    </ScrollReveal>
  );
}

/* ── Homepage ────────────────────────────────────────────────────── */
export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"loading" | "connected" | "disconnected">("loading");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      fetch(`${API_BASE_URL}/api/v1/health`)
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then((d: { status: string }) => {
          if (!active) return;
          if (d.status === "ok") setBackendStatus("connected");
          else { setBackendStatus("disconnected"); timer = setTimeout(check, 5000); }
        })
        .catch(() => {
          // The free-tier backend may be cold-starting — keep retrying so the
          // pill recovers to "connected" instead of showing a scary error.
          if (active) { setBackendStatus("disconnected"); timer = setTimeout(check, 5000); }
        });
    };
    check();
    return () => { active = false; clearTimeout(timer); };
  }, []);

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
              {/* Status pill */}
              <div
                className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-semibold"
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
                    background: backendStatus === "connected" ? "#22C55E" : "#F59E0B",
                    boxShadow: backendStatus === "connected" ? "0 0 8px rgba(34,197,94,0.5)" : "none",
                  }}
                />
                {backendStatus === "connected" ? "Platform Live · 2025 Data Ready" : backendStatus === "loading" ? "Connecting…" : "Reconnecting…"}
              </div>

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
                Data-driven college predictions, real 2025 CAP cutoffs, and expert one-on-one guidance —
                everything you need for Maharashtra engineering admissions.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                  }}
                >
                  Book a Free Session <ArrowRight />
                </Link>
                <Link
                  href="/cutoffs"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                >
                  Browse Cutoffs
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

      {/* STATS — platform credibility, moved out of the hero */}
      <section className="py-12 lg:py-16" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--slate-100)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { val: 90000, suffix: "+", label: "Cutoff Records" },
                { val: 300, suffix: "+", label: "Colleges Covered" },
                { val: 4, suffix: "", label: "CAP Rounds" },
                { val: 0, suffix: "", label: "Expert Sessions", display: "Free" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border p-5 text-center"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--slate-200)" }}
                >
                  <div className="text-3xl font-bold mb-1" style={{ color: "var(--primary-600)", fontFamily: "var(--font-mono)" }}>
                    {s.display ? s.display : <AnimatedCounter target={s.val} suffix={s.suffix} />}
                  </div>
                  <div className="text-sm" style={{ color: "var(--slate-600)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: "var(--slate-500)" }}>
              Powered by official 2025 Maharashtra CAP data
            </p>
          </ScrollReveal>
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

      {/* HOW IT WORKS — the process, after the feature overview */}
      <section className="py-20 lg:py-28" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="section-label mb-3">The Process</p>
              <h2
                className="text-3xl lg:text-4xl font-bold"
                style={{ color: "var(--slate-900)", fontFamily: "var(--font-display)" }}
              >
                How it works
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connecting line (desktop) */}
            <div
              className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px"
              style={{ background: "var(--slate-200)" }}
            />

            {steps.map((step, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 150}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 relative z-10 transition-transform duration-300 hover:scale-105"
                    style={{
                      background: "var(--bg-primary)",
                      border: "2px solid var(--primary-200)",
                      color: "var(--primary-600)",
                      boxShadow: "0 0 0 6px var(--bg-secondary), var(--shadow-md)",
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: "var(--primary-500)" }}
                  >
                    Step {step.n}
                  </span>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--slate-900)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--slate-500)" }}>
                    {step.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ══════════════════════════════════════════ */}
      <FaqSection />

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
              Make a confident, data-driven choice with real 2025 CAP cutoffs,
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
                href="/book"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
              >
                Book Free Session
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
