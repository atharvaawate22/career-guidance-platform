"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/* ─── SVG Icon Components ─────────────────────────────────────────── */
function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconPredictor() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconCutoffs() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconGuides() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}
function IconResources() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconUpdates() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function IconAdmin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/* ─── Nav items ───────────────────────────────────────────────────── */
interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  { name: "Home",         href: "/",          icon: <IconHome />,       description: "Dashboard" },
  { name: "Predictor",   href: "/predictor",  icon: <IconPredictor />,  description: "Find colleges" },
  { name: "Cutoffs",     href: "/cutoffs",    icon: <IconCutoffs />,    description: "Browse data" },
  { name: "Guides",      href: "/guides",     icon: <IconGuides />,     description: "Admission guides" },
  { name: "Resources",   href: "/resources",  icon: <IconResources />,  description: "PDFs & docs" },
  { name: "Book Session",href: "/book",       icon: <IconBook />,       description: "Counseling" },
  { name: "Updates",     href: "/updates",    icon: <IconUpdates />,    description: "Latest news" },
];

/* ─── Sidebar ─────────────────────────────────────────────────────── */
export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setIsCollapsed(window.innerWidth < 1024);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useLayoutEffect(() => {
    const computeOffset = () => {
      if (window.innerWidth < 1024) return "0px";
      return isCollapsed ? "64px" : "240px";
    };
    const offset = computeOffset();
    const visible = !(pathname === "/admin" && !isAdmin);
    const applied = visible ? offset : "0px";
    document.documentElement.style.setProperty("--sidebar-offset", applied);
    window.dispatchEvent(new CustomEvent("sidebarToggle", { detail: { collapsed: isCollapsed, offset: applied, visible } }));
  }, [isCollapsed, isAdmin, pathname]);

  // The first useLayoutEffect above already handles the admin route case
  // by setting --sidebar-offset to "0px" when pathname === "/admin" && !isAdmin.
  // A separate effect is not needed.

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/v1/admin/session`, { credentials: "include" });
        setIsAdmin(r.ok);
      } catch { setIsAdmin(false); }
    };
    void check();
    window.addEventListener("adminAuthChange", check);
    return () => window.removeEventListener("adminAuthChange", check);
  }, []);

  if (pathname === "/admin" && !isAdmin) {
    // The useLayoutEffect above already sets --sidebar-offset to "0px".
    // Do not mutate DOM here during render; effects handle it.
    return null;
  }

  const displayNav: NavItem[] = isAdmin && pathname !== "/admin"
    ? [...navItems, { name: "Admin", href: "/admin", icon: <IconAdmin />, description: "Control panel" }]
    : navItems;

  const w = isCollapsed ? "64px" : "240px";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsCollapsed(false)}
        className="lg:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg shadow-lg"
        style={{ background: "var(--navy)", color: "var(--white)" }}
        aria-label="Open menu"
      >
        <IconMenu />
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: w,
          background: "var(--navy)",
          borderRight: "1px solid var(--navy-border)",
          transition: "width .28s cubic-bezier(.4,0,.2,1)",
        }}
        className="fixed top-0 left-0 h-screen z-40 flex flex-col overflow-hidden shadow-2xl"
        data-collapsed={isCollapsed}
      >
        {/* Logo */}
        <div
          className="flex items-center h-16 px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--navy-border)" }}
        >
          {/* Logo mark */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 font-bold text-sm"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            C
          </div>

          {!isCollapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="text-white font-bold text-base leading-none whitespace-nowrap" style={{ fontFamily: "var(--font-inter)" }}>
                CET<span style={{ color: "var(--gold)" }}>Hub</span>
              </div>
              <div className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "var(--slate-light)" }}>cethub.in</div>
            </div>
          )}

          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex ml-auto items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: "var(--slate-light)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--navy-light)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {displayNav.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => { if (window.innerWidth < 1024) setIsCollapsed(true); }}
                    title={isCollapsed ? item.name : undefined}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg relative group transition-all duration-150"
                    style={{
                      color: active ? "var(--gold)" : "var(--slate-light)",
                      background: active ? "rgb(201 168 76 / .10)" : "transparent",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--navy-light)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Gold left bar */}
                    {active && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                        style={{ background: "var(--gold)" }}
                      />
                    )}
                    <span className="shrink-0">{item.icon}</span>

                    {!isCollapsed && (
                      <span className="overflow-hidden">
                        <span className="block text-sm font-semibold leading-none whitespace-nowrap" style={{ color: active ? "var(--gold)" : "var(--white)" }}>
                          {item.name}
                        </span>
                        <span className="block text-xs mt-0.5 whitespace-nowrap" style={{ color: "var(--slate-light)" }}>
                          {item.description}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="px-4 py-3 text-xs" style={{ borderTop: "1px solid var(--navy-border)", color: "var(--slate-light)" }}>
            <p className="font-semibold" style={{ color: "var(--white)" }}>© 2026 CETHub</p>
            <p className="mt-0.5">v1.0.0 · Data: 2025 CAP</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/privacy" style={{ color: "var(--slate-light)" }}>
                Privacy Policy
              </Link>
              <Link href="/terms" style={{ color: "var(--slate-light)" }}>
                Terms of Service
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div className="lg:hidden fixed inset-0 z-30" style={{ background: "rgb(0 0 0 / .55)" }} onClick={() => setIsCollapsed(true)}>
          <button
            className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: "var(--navy-light)", color: "var(--white)" }}
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>
      )}
    </>
  );
}
