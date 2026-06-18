"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/* ── SVG Icons ────────────────────────────────────────────────────── */
function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Nav Links ────────────────────────────────────────────────────── */
const navLinks = [
  { name: "Home", href: "/" },
  { name: "Predictor", href: "/predictor" },
  { name: "Cutoffs", href: "/cutoffs" },
  { name: "Guides", href: "/guides" },
  { name: "Resources", href: "/resources" },
  { name: "Updates", href: "/updates" },
];

/* ── Navbar ───────────────────────────────────────────────────────── */
export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  /* Scroll detection for glass morphism */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* Lock body when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* Close mobile menu on Escape */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  /* Check admin session */
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/admin/session`, { credentials: "include" });
        if (!r.ok) { setIsAdmin(false); return; }
        const d = await r.json();
        setIsAdmin(d.success && d.data?.authenticated === true);
      } catch { setIsAdmin(false); }
    };
    void check();
    window.addEventListener("adminAuthChange", check);
    return () => window.removeEventListener("adminAuthChange", check);
  }, []);

  const isHomepage = pathname === "/";

  return (
    <>
      {/* ── Desktop / Mobile Navbar ─────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrolled
            ? "rgba(255,255,255,0.85)"
            : isHomepage
              ? "transparent"
              : "rgba(255,255,255,0.85)",
          backdropFilter: scrolled || !isHomepage ? "blur(16px) saturate(1.8)" : "none",
          WebkitBackdropFilter: scrolled || !isHomepage ? "blur(16px) saturate(1.8)" : "none",
          borderBottom: scrolled || !isHomepage
            ? "1px solid rgba(226,232,240,0.6)"
            : "1px solid transparent",
          boxShadow: scrolled
            ? "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)"
            : "none",
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                  boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
                }}
              >
                C
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="text-[17px] font-bold tracking-tight"
                  style={{ color: "var(--slate-900)" }}
                >
                  CET<span style={{ color: "var(--primary-600)" }}>Hub</span>
                </span>
                <span className="text-[10px] font-medium mt-0.5" style={{ color: "var(--slate-400)" }}>
                  cethub.in
                </span>
              </div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      color: isActive ? "var(--primary-600)" : "var(--slate-600)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = "var(--slate-900)";
                      e.currentTarget.style.background = "var(--slate-50)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = "var(--slate-600)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {link.name}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                        style={{ background: "var(--primary-600)" }}
                      />
                    )}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{ color: "var(--slate-600)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--slate-900)";
                    e.currentTarget.style.background = "var(--slate-50)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--slate-600)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                  boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(79,70,229,0.35)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(79,70,229,0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Book a Session
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
              style={{
                color: "var(--slate-700)",
                background: mobileOpen ? "var(--slate-100)" : "transparent",
              }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile menu overlay ─────────────────────────────────── */}
      <div
        className="fixed inset-0 z-30 lg:hidden transition-all duration-300"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        style={{
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex flex-col h-full pt-20 pb-8 px-6">
          <nav className="flex-1 flex flex-col gap-1 pt-4">
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-lg font-medium transition-all duration-200"
                  style={{
                    color: isActive ? "var(--primary-600)" : "var(--slate-700)",
                    background: isActive ? "var(--primary-50)" : "transparent",
                    animationDelay: `${i * 50}ms`,
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.name}
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full ml-auto"
                      style={{ background: "var(--primary-600)" }}
                    />
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-lg font-medium"
                style={{ color: "var(--slate-700)" }}
                onClick={() => setMobileOpen(false)}
              >
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Mobile CTA */}
          <div className="mt-auto pt-6" style={{ borderTop: "1px solid var(--slate-200)" }}>
            <Link
              href="/book"
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl text-base font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
                boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
              }}
              onClick={() => setMobileOpen(false)}
            >
              Book a Free Session
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <p className="text-xs text-center mt-4" style={{ color: "var(--slate-400)" }}>
              © {new Date().getFullYear()} CETHub · Data: 2025 CAP
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
