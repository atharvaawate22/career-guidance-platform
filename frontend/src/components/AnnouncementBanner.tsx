"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  type: "info" | "warning" | "success";
}

export default function AnnouncementBanner() {
  const [config, setConfig] = useState<AnnouncementConfig | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/settings/announcement`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setConfig(d.data);
        }
      })
      .catch(() => {});
  }, []);

  if (!config || !config.enabled || !config.text || !visible) return null;

  const styles: Record<string, { bg: string; border: string }> = {
    info:    { bg: "var(--primary-600)", border: "var(--primary-700)" },
    warning: { bg: "var(--warning-500)", border: "var(--warning-600)" },
    success: { bg: "var(--success-600)", border: "var(--success-700)" },
  };

  const s = styles[config.type] || styles.info;

  return (
    <div
      className="text-white px-4 py-2 relative flex items-center justify-center text-sm font-medium z-50"
      style={{ background: s.bg, borderBottom: `1px solid ${s.border}` }}
    >
      <span className="mr-8 text-center">{config.text}</span>
      <button 
        onClick={() => setVisible(false)}
        className="absolute right-4 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Close announcement"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
