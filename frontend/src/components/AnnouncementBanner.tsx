"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { publicGet } from "@/lib/api";
import type { AnnouncementConfig } from "@/lib/serverAnnouncement";

const DISMISSED_KEY = "cethub-announcement-dismissed-version";

export default function AnnouncementBanner({
  initialConfig = null,
}: {
  /** Server-rendered by RootLayout via fetchAnnouncement(), so the banner
   *  can paint on first render instead of waiting on a client-side fetch. */
  initialConfig?: AnnouncementConfig | null;
}) {
  const [config, setConfig] = useState<AnnouncementConfig | null>(initialConfig);
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Dismissal lives in localStorage, so it has to be checked here even
    // when initialConfig already arrived server-rendered.
    if (initialConfig?.version !== undefined) {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === String(initialConfig.version)) {
          setVisible(false);
        }
      } catch { /* localStorage unavailable */ }
    }

    // Re-fetch on mount to catch edits made after the SSR response was
    // cached (see ANNOUNCEMENT_REVALIDATE_SECONDS) and to cover the case
    // where the server-side fetch failed (initialConfig === null).
    publicGet("announcement")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setConfig(d.data);
          try {
            if (localStorage.getItem(DISMISSED_KEY) === String(d.data.version ?? 0)) {
              setVisible(false);
            }
          } catch { /* localStorage unavailable */ }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showOnCurrentPage = !config || !config.pages || config.pages.length === 0 || config.pages.includes("*") || config.pages.includes("all") || config.pages.includes(pathname);
  const isBannerActive = config && config.enabled && config.text && visible && showOnCurrentPage;

  useEffect(() => {
    if (isBannerActive) {
      document.documentElement.style.setProperty("--banner-height", "40px");
    } else {
      document.documentElement.style.setProperty("--banner-height", "0px");
    }
    return () => {
      document.documentElement.style.setProperty("--banner-height", "0px");
    };
  }, [isBannerActive]);

  if (!isBannerActive || !config) return null;

  // Frosted-glass look: a translucent tinted background (with backdrop-blur set
  // on the element below) and a soft light border. Opacity stays high enough
  // that white text remains WCAG-AA legible over any page content behind it.
  // Matched case-insensitively; unknown types fall back to a neutral info bar.
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    info:    { bg: "rgba(67, 56, 202, 0.85)", border: "rgba(255,255,255,0.22)", text: "#ffffff" },
    success: { bg: "rgba(6, 95, 70, 0.88)",   border: "rgba(255,255,255,0.22)", text: "#ffffff" },
    warning: { bg: "rgba(185, 28, 28, 0.86)", border: "rgba(255,255,255,0.22)", text: "#ffffff" },
    error:   { bg: "rgba(185, 28, 28, 0.86)", border: "rgba(255,255,255,0.22)", text: "#ffffff" },
  };

  const s = styles[(config.type || "info").trim().toLowerCase()] || styles.info;

  return (
    <div
      role="region"
      aria-label="Site announcement"
      className="px-4 py-2 fixed left-0 right-0 z-30 flex items-center justify-center text-sm font-semibold transition-all backdrop-blur-lg"
      style={{
        top: "var(--navbar-height)",
        height: "40px",
        background: s.bg,
        borderBottom: `1px solid ${s.border}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        color: s.text,
      }}
    >
      <span className="mr-8 text-center truncate" title={config.text}>{config.text}</span>
      <button
        onClick={() => {
          setVisible(false);
          try { localStorage.setItem(DISMISSED_KEY, String(config.version ?? 0)); } catch { /* ignore */ }
        }}
        className="absolute right-4 p-1 rounded transition-colors"
        style={{
          color: s.text,
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        aria-label="Close announcement"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
