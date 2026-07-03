"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { BookingSlotConfig, AnnouncementConfig, ContactInfoConfig } from "@/components/admin/types";

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

/* ── Toggle Switch ──────────────────────────────────────────────────────── */

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer rounded-xl bg-slate-900/30 border border-slate-700/30 p-4 hover:border-slate-600 transition-colors">
      <div>
        <span className="text-sm text-white font-medium">{label}</span>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="relative flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
      </div>
    </label>
  );
}

/* ── Settings Section Wrapper ───────────────────────────────────────────── */

function SettingsSection({ title, description, onSave, saving, children }: {
  title: string; description: string; onSave: () => void; saving: boolean; children: React.ReactNode;
}) {
  return (
    <div className="admin-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="admin-btn-primary flex-shrink-0"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
      {children}
    </div>
  );
}

/* ── Main Settings Page ─────────────────────────────────────────────────── */

export default function AdminSettingsPage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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
        if (r.status === 401) { handleSessionExpired(); return; }
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
  }, [adminFetch, API_BASE_URL, handleSessionExpired]);

  const save = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/settings/${key}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
      });
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) {
        toast({ title: `${key.replace(/_/g, " ")} saved`, type: "success" });
      } else {
        toast({ title: d.error?.message || "Failed to save", type: "error" });
      }
    } catch {
      toast({ title: "Connection failed", type: "error" });
    } finally {
      setSaving(null);
    }
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

  // A date picked in the input but never added via "Add Date" is included on
  // save anyway — otherwise it is silently lost.
  const saveBookingSlots = () => {
    let config = bookingSlots;
    if (newSpecialDate) {
      const key = specialDateType === "open" ? "special_open_dates" : "special_closed_dates";
      if (!config[key].includes(newSpecialDate)) {
        config = { ...config, [key]: [...config[key], newSpecialDate].sort() };
      }
      setBookingSlots(config);
      setNewSpecialDate("");
    }
    save("booking_slots", config);
  };

  const removeSpecialDate = (date: string, type: "open" | "closed") => {
    const key = type === "open" ? "special_open_dates" : "special_closed_dates";
    setBookingSlots(prev => ({ ...prev, [key]: prev[key].filter(d => d !== date) }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <div className="h-8 w-48 shimmer-dark rounded-lg mb-2" />
          <div className="h-4 w-64 shimmer-dark rounded-lg" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure platform behavior and content</p>
      </div>

      {/* Booking Slots */}
      <div className="animate-fade-up-1">
        <SettingsSection
          title="Booking Slots"
          description="Configure available time slots & working days for consultations"
          onSave={saveBookingSlots}
          saving={saving === "booking_slots"}
        >
          <div className="space-y-6">
            {/* Master Toggle */}
            <ToggleSwitch
              checked={bookingSlots.enabled}
              onChange={(v) => setBookingSlots(p => ({ ...p, enabled: v }))}
              label="Booking System"
              description="When disabled, students cannot book new sessions"
            />

            {/* Working Days */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Working Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAY_NAMES.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      bookingSlots.working_days.includes(i)
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Available Time Slots</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {ALL_POSSIBLE_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={`px-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      bookingSlots.slots.includes(slot)
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-white hover:border-slate-500"
                    }`}
                  >
                    {formatSlot(slot)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                {bookingSlots.slots.length} slots enabled
              </p>
            </div>

            {/* Special Dates */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Special Dates</label>
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <input
                  type="date"
                  value={newSpecialDate}
                  onChange={(e) => setNewSpecialDate(e.target.value)}
                  className="admin-input w-auto"
                />
                <select
                  value={specialDateType}
                  onChange={(e) => setSpecialDateType(e.target.value as "open" | "closed")}
                  className="admin-input w-auto"
                >
                  <option value="closed">Force Closed (Holiday)</option>
                  <option value="open">Force Open (Weekend Override)</option>
                </select>
                <button type="button" onClick={addSpecialDate} className="admin-btn-secondary">
                  Add Date
                </button>
              </div>
              {bookingSlots.special_closed_dates.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">Closed dates:</p>
                  <div className="flex flex-wrap gap-2">
                    {bookingSlots.special_closed_dates.map(d => (
                      <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                        {d}
                        <button onClick={() => removeSpecialDate(d, "closed")} className="hover:text-white text-red-400/60" aria-label="Remove date">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {bookingSlots.special_open_dates.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Open dates (overrides):</p>
                  <div className="flex flex-wrap gap-2">
                    {bookingSlots.special_open_dates.map(d => (
                      <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        {d}
                        <button onClick={() => removeSpecialDate(d, "open")} className="hover:text-white text-emerald-400/60" aria-label="Remove date">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Announcement */}
      <div className="animate-fade-up-2">
        <SettingsSection
          title="Site Announcement"
          description="Display a banner across specific or all public pages"
          onSave={() => save("announcement", announcement)}
          saving={saving === "announcement"}
        >
          <div className="space-y-5">
            <ToggleSwitch
              checked={announcement.enabled}
              onChange={(v) => setAnnouncement(p => ({ ...p, enabled: v }))}
              label="Show Banner"
              description="Display announcement banner on public pages"
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
              <input
                type="text"
                value={announcement.text}
                onChange={(e) => setAnnouncement(p => ({ ...p, text: e.target.value }))}
                maxLength={500}
                className="admin-input"
                placeholder="Important announcement text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
              <div className="flex gap-3 flex-wrap">
                {(["info", "warning", "success"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAnnouncement(p => ({ ...p, type: t }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                      announcement.type === t
                        ? t === "info" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        : t === "warning" ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Colour follows the type on the live banner — info = indigo, success = green, warning = red.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Display Target</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setAnnouncement(p => ({ ...p, pages: [] }))}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    !announcement.pages || announcement.pages.length === 0 || announcement.pages.includes("*") || announcement.pages.includes("all")
                      ? "bg-indigo-600/10 border-indigo-500/50 text-white shadow-glow-primary"
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
                      ? "bg-indigo-600/10 border-indigo-500/50 text-white shadow-glow-primary"
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
                            ? "bg-slate-800 border-indigo-500/40 text-white"
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
              <div>
                <p className="text-xs text-slate-500 mb-2">Preview:</p>
                <div
                  className="px-4 py-3 rounded-xl text-sm font-semibold border backdrop-blur-lg transition-all text-center"
                  style={
                    announcement.type === "success" ? { background: "rgba(6, 95, 70, 0.88)", borderColor: "rgba(255,255,255,0.22)", color: "#ffffff" }
                    : announcement.type === "warning" || announcement.type === "error" ? { background: "rgba(185, 28, 28, 0.86)", borderColor: "rgba(255,255,255,0.22)", color: "#ffffff" }
                    : { background: "rgba(67, 56, 202, 0.85)", borderColor: "rgba(255,255,255,0.22)", color: "#ffffff" }
                  }
                >
                  {announcement.text}
                </div>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>

      {/* Contact Info */}
      <div className="animate-fade-up-3">
        <SettingsSection
          title="Contact Information"
          description="Contact details displayed on the public site"
          onSave={() => save("contact_info", contactInfo)}
          saving={saving === "contact_info"}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo(p => ({ ...p, email: e.target.value }))}
                className="admin-input"
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo(p => ({ ...p, phone: e.target.value }))}
                className="admin-input"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
