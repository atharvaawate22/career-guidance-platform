"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  type: string;
  pages?: string[];
}

export default function AnnouncementBanner() {
  const [config, setConfig] = useState<AnnouncementConfig | null>(null);
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/settings/announcement`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setConfig(d.data);
          try {
            if (localStorage.getItem("cethub-announcement-dismissed") === d.data.text) {
              setVisible(false);
            }
          } catch { /* localStorage unavailable */ }
        }
      })
      .catch(() => {});
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

  const styles: Record<string, { bg: string; border: string; text: string }> = {
    info:    { bg: "var(--primary-600)", border: "var(--primary-700)", text: "#ffffff" },
    warning: { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", text: "#991b1b" },
    success: { bg: "var(--success-600)", border: "var(--success-700)", text: "#ffffff" },
  };

  const s = styles[config.type] || {
    bg: "rgba(99, 102, 241, 0.15)",
    border: "rgba(99, 102, 241, 0.3)",
    text: "var(--primary-700)",
  };

  return (
    <div
      role="region"
      aria-label="Site announcement"
      className="px-4 py-2 fixed left-0 right-0 z-30 flex items-center justify-center text-sm font-semibold transition-all backdrop-blur-md"
      style={{
        top: "var(--navbar-height)",
        height: "40px",
        background: s.bg,
        borderBottom: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      <span className="mr-8 text-center truncate" title={config.text}>{config.text}</span>
      <button
        onClick={() => {
          setVisible(false);
          try { localStorage.setItem("cethub-announcement-dismissed", config.text); } catch { /* ignore */ }
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
