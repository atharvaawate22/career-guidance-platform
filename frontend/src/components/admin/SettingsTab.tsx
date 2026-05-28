"use client";

import { useState, useEffect } from "react";
import type { AdminTabProps, BookingSlotConfig, AnnouncementConfig, ContactInfoConfig } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PUBLIC_PAGES = [
  { path: "/", label: "Home Page" },
  { path: "/predictor", label: "College Predictor" },
  { path: "/book", label: "Book Consultation" },
  { path: "/cutoffs", label: "Cutoff Finder" },
  { path: "/resources", label: "Resources Hub" },
  { path: "/guides", label: "E-Books & Guides" },
  { path: "/updates", label: "MHT-CET Updates" },
  { path: "/terms", label: "Terms of Service" },
  { path: "/privacy", label: "Privacy Policy" },
];
const ALL_POSSIBLE_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30",
];

function formatSlot(s: string) {
  const [h, m] = s.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const d = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${d}:${String(m).padStart(2, "0")} ${p}`;
}

export default function SettingsTab({ adminFetch, adminWriteFetch, API_BASE_URL }: AdminTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [bookingSlots, setBookingSlots] = useState<BookingSlotConfig>({
    enabled: true, slot_duration_minutes: 30,
    slots: ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"],
    working_days: [1,2,3,4,5], special_open_dates: [], special_closed_dates: [],
  });
  const [announcement, setAnnouncement] = useState<AnnouncementConfig>({ enabled: false, text: "", type: "info", pages: [] });
  const [contactInfo, setContactInfo] = useState<ContactInfoConfig>({ email: "", phone: "" });
  const [newSpecialDate, setNewSpecialDate] = useState("");
  const [specialDateType, setSpecialDateType] = useState<"open" | "closed">("closed");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/settings`);
        const d = await r.json();
        if (d.success && d.data) {
          if (d.data.booking_slots) setBookingSlots(d.data.booking_slots);
          if (d.data.announcement) {
            setAnnouncement({
              enabled: d.data.announcement.enabled ?? false,
              text: d.data.announcement.text ?? "",
              type: d.data.announcement.type ?? "info",
              pages: d.data.announcement.pages ?? [],
            });
          }
          if (d.data.contact_info) setContactInfo(d.data.contact_info);
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    };
    load();
  }, [adminFetch, API_BASE_URL]);

  const save = async (key: string, value: unknown) => {
    setSaving(key); setError(""); setSuccess("");
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/settings/${key}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
      });
      const d = await r.json();
      if (d.success) setSuccess(`${key.replace(/_/g, " ")} saved!`);
      else setError(d.error?.message || "Failed to save");
    } catch { setError("Connection failed"); }
    finally { setSaving(null); }
  };

  const toggleSlot = (slot: string) => {
    setBookingSlots(prev => ({
      ...prev,
      slots: prev.slots.includes(slot) ? prev.slots.filter(s => s !== slot) : [...prev.slots, slot].sort(),
    }));
  };

  const toggleDay = (day: number) => {
    setBookingSlots(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day) ? prev.working_days.filter(d => d !== day) : [...prev.working_days, day].sort(),
    }));
  };

  const addSpecialDate = () => {
    if (!newSpecialDate) return;
    setBookingSlots(prev => {
      const key = specialDateType === "open" ? "special_open_dates" : "special_closed_dates";
      if (prev[key].includes(newSpecialDate)) return prev;
      return { ...prev, [key]: [...prev[key], newSpecialDate].sort() };
    });
    setNewSpecialDate("");
  };

  const removeSpecialDate = (date: string, type: "open" | "closed") => {
    const key = type === "open" ? "special_open_dates" : "special_closed_dates";
    setBookingSlots(prev => ({ ...prev, [key]: prev[key].filter(d => d !== date) }));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h2 className="text-2xl font-bold text-white">Platform Settings</h2><p className="text-slate-400 text-sm mt-1">Configure booking slots, announcements & more</p></div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm">{success}</div>}

      {/* ── Booking Slot Configuration ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Booking Slots</h3>
            <p className="text-sm text-slate-400 mt-0.5">Configure available time slots & working days</p>
          </div>
          <button onClick={() => save("booking_slots", bookingSlots)} disabled={saving === "booking_slots"} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {saving === "booking_slots" ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Master Toggle */}
        <div className="rounded-xl bg-slate-900/30 border border-slate-700/30 p-4 mb-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-white font-medium">Booking System</span>
              <p className="text-xs text-slate-500 mt-0.5">When disabled, students cannot book new sessions</p>
            </div>
            <div className="relative">
              <input type="checkbox" checked={bookingSlots.enabled} onChange={e => setBookingSlots(p => ({ ...p, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
            </div>
          </label>
        </div>

        {/* Working Days */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">Working Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAY_NAMES.map((name, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${bookingSlots.working_days.includes(i) ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"}`}>{name}</button>
            ))}
          </div>
        </div>

        {/* Time Slots Grid */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">Available Time Slots</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {ALL_POSSIBLE_SLOTS.map(slot => (
              <button key={slot} type="button" onClick={() => toggleSlot(slot)} className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all ${bookingSlots.slots.includes(slot) ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700/30 text-slate-500 border border-slate-700/30 hover:text-white hover:border-slate-500"}`}>{formatSlot(slot)}</button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">{bookingSlots.slots.length} slots enabled • Click to toggle</p>
        </div>

        {/* Special Dates */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Special Dates</label>
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <input type="date" value={newSpecialDate} onChange={e => setNewSpecialDate(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white text-sm focus:outline-none focus:border-violet-500" />
            <select value={specialDateType} onChange={e => setSpecialDateType(e.target.value as "open" | "closed")} className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white text-sm focus:outline-none focus:border-violet-500">
              <option value="closed">Force Closed (Holiday)</option>
              <option value="open">Force Open (Weekend Override)</option>
            </select>
            <button type="button" onClick={addSpecialDate} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors">Add</button>
          </div>
          {bookingSlots.special_closed_dates.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-slate-500 mb-1">Closed dates:</p>
              <div className="flex flex-wrap gap-2">{bookingSlots.special_closed_dates.map(d => (
                <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">{d}<button onClick={() => removeSpecialDate(d, "closed")} className="hover:text-white">×</button></span>
              ))}</div>
            </div>
          )}
          {bookingSlots.special_open_dates.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Open dates (overrides):</p>
              <div className="flex flex-wrap gap-2">{bookingSlots.special_open_dates.map(d => (
                <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">{d}<button onClick={() => removeSpecialDate(d, "open")} className="hover:text-white">×</button></span>
              ))}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Announcement Banner ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Site Announcement</h3>
            <p className="text-sm text-slate-400 mt-0.5">Display a banner across specific or all public pages</p>
          </div>
          <button onClick={() => save("announcement", announcement)} disabled={saving === "announcement"} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {saving === "announcement" ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer rounded-xl bg-slate-900/30 border border-slate-700/30 p-4">
            <span className="text-sm text-white font-medium">Show banner</span>
            <div className="relative">
              <input type="checkbox" checked={announcement.enabled} onChange={e => setAnnouncement(p => ({ ...p, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Message</label>
            <input type="text" value={announcement.text} onChange={e => setAnnouncement(p => ({ ...p, text: e.target.value }))} maxLength={500} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="Important announcement text..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
            <div className="flex gap-3 flex-wrap">
              {(["info", "warning", "success"] as const).map(t => (
                <button key={t} type="button" onClick={() => setAnnouncement(p => ({ ...p, type: t }))} className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${announcement.type === t ? t === "info" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : t === "warning" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700/30 text-slate-400 border border-slate-700/30"}`}>{t}</button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const custom = prompt("Enter custom announcement type:", "alert");
                  if (custom !== null) {
                    const cleaned = custom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
                    setAnnouncement(p => ({ ...p, type: cleaned || "other" }));
                  } else {
                    const isCustom = !["info", "warning", "success"].includes(announcement.type);
                    if (!isCustom) {
                      setAnnouncement(p => ({ ...p, type: "other" }));
                    }
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  !["info", "warning", "success"].includes(announcement.type)
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-slate-700/30 text-slate-400 border border-slate-700/30"
                }`}
              >
                {!["info", "warning", "success"].includes(announcement.type) && announcement.type ? `Other: ${announcement.type}` : "Other"}
              </button>
            </div>
          </div>

          {!["info", "warning", "success"].includes(announcement.type) && (
            <div className="mt-3 animate-fade-in">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Custom Type Name</label>
              <input
                type="text"
                value={announcement.type === "other" ? "" : announcement.type}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                  setAnnouncement(p => ({ ...p, type: val || "other" }));
                }}
                className="w-full px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all max-w-xs text-sm"
                placeholder="e.g. maintenance, alert, holiday..."
                maxLength={30}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Display Target</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setAnnouncement(p => ({ ...p, pages: [] }))}
                className={`p-4 rounded-xl border text-left transition-all ${
                  !announcement.pages || announcement.pages.length === 0 || announcement.pages.includes("*") || announcement.pages.includes("all")
                    ? "bg-violet-600/10 border-violet-500/50 text-white shadow-glow-primary"
                    : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="font-semibold text-sm">All Pages</div>
                <div className="text-xs text-slate-500 mt-1">Show the announcement banner across the entire public website.</div>
              </button>
              <button
                type="button"
                onClick={() => setAnnouncement(p => ({ ...p, pages: ["/"] }))}
                className={`p-4 rounded-xl border text-left transition-all ${
                  announcement.pages && announcement.pages.length > 0 && !announcement.pages.includes("*") && !announcement.pages.includes("all")
                    ? "bg-violet-600/10 border-violet-500/50 text-white shadow-glow-primary"
                    : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="font-semibold text-sm">Specific Pages</div>
                <div className="text-xs text-slate-500 mt-1">Select one or multiple public pages to target.</div>
              </button>
            </div>
          </div>

          {announcement.pages && announcement.pages.length > 0 && !announcement.pages.includes("*") && !announcement.pages.includes("all") && (
            <div className="animate-scale-in rounded-xl bg-slate-900/30 border border-slate-700/30 p-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Select Target Pages</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {PUBLIC_PAGES.map(page => {
                  const isChecked = announcement.pages?.includes(page.path);
                  return (
                    <label
                      key={page.path}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-slate-800 border-violet-500/40 text-white"
                          : "bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const activePages = announcement.pages || [];
                          let newPages = [];
                          if (e.target.checked) {
                            newPages = [...activePages.filter(p => p !== "*" && p !== "all"), page.path];
                          } else {
                            newPages = activePages.filter(p => p !== page.path);
                            if (newPages.length === 0) {
                              newPages = ["/"];
                            }
                          }
                          setAnnouncement(p => ({ ...p, pages: newPages }));
                        }}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-700 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-2"
                      />
                      <div>
                        <div className="text-sm font-medium">{page.label}</div>
                        <div className="text-xs text-slate-500 font-mono">{page.path}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          {announcement.enabled && announcement.text && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">Preview:</p>
              <div 
                className="px-4 py-3 rounded-xl text-sm font-semibold border backdrop-blur-md transition-all text-center"
                style={
                  announcement.type === "info" ? { background: "var(--primary-600)", borderColor: "var(--primary-700)", color: "#ffffff" }
                  : announcement.type === "warning" ? { background: "rgba(239, 68, 68, 0.15)", borderColor: "rgba(239, 68, 68, 0.3)", color: "#ef4444" }
                  : announcement.type === "success" ? { background: "var(--success-600)", borderColor: "var(--success-700)", color: "#ffffff" }
                  : { background: "rgba(99, 102, 241, 0.15)", borderColor: "rgba(99, 102, 241, 0.3)", color: "var(--primary-500)" }
                }
              >
                {announcement.text}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Contact Information ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Contact Information</h3>
            <p className="text-sm text-slate-400 mt-0.5">Displayed on the public site</p>
          </div>
          <button onClick={() => save("contact_info", contactInfo)} disabled={saving === "contact_info"} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {saving === "contact_info" ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input type="email" value={contactInfo.email} onChange={e => setContactInfo(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="contact@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
            <input type="tel" value={contactInfo.phone} onChange={e => setContactInfo(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="+91 98765 43210" />
          </div>
        </div>
      </div>
    </div>
  );
}
