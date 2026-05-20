"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import DashboardTab from "@/components/admin/DashboardTab";
import UpdatesTab from "@/components/admin/UpdatesTab";
import BookingsTab from "@/components/admin/BookingsTab";
import FaqsTab from "@/components/admin/FaqsTab";
import ResourcesTab from "@/components/admin/ResourcesTab";
import GuidesTab from "@/components/admin/GuidesTab";
import SettingsTab from "@/components/admin/SettingsTab";
import type {
  TabType, Update, Booking, Faq, Resource, Guide, GuideDownload,
} from "@/components/admin/types";

interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string; requestId?: string };
}

const NAV_ITEMS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg> },
  { key: "updates", label: "Updates", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
  { key: "bookings", label: "Bookings", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { key: "faqs", label: "FAQs", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: "resources", label: "Resources", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { key: "guides", label: "Guides", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  { key: "settings", label: "Settings", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Data
  const [updates, setUpdates] = useState<Update[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [downloads, setDownloads] = useState<GuideDownload[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  // ── Fetch helpers ──────────────────────────────────────────────────────

  const adminFetch = useCallback((url: string, init: RequestInit = {}) =>
    fetch(url, { ...init, credentials: "include" }), []);

  const adminWriteFetch = useCallback((url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
    return adminFetch(url, { ...init, headers });
  }, [csrfToken, adminFetch]);

  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/v1/admin/csrf`, { credentials: "include" });
      if (!r.ok) return null;
      const d = await r.json();
      const t = d?.data?.csrfToken as string | undefined;
      if (t) { setCsrfToken(t); return t; }
      return null;
    } catch { return null; }
  }, []);

  const handleSessionExpired = useCallback(() => {
    setIsLoggedIn(false); setCsrfToken("");
    setLoginError("Your session has expired. Please log in again.");
    window.dispatchEvent(new Event("adminAuthChange"));
  }, []);

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // ── Data fetchers ─────────────────────────────────────────────────────

  const fetchUpdates = useCallback(async () => {
    try { setUpdatesLoading(true); const r = await fetch(`${API_BASE_URL}/api/v1/updates`); const d = await r.json();
      if (d.success) setUpdates(Array.isArray(d.data) ? d.data : d.data?.data || []);
    } catch {} finally { setUpdatesLoading(false); }
  }, []);

  const fetchBookings = useCallback(async () => {
    try { setBookingsLoading(true); const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/bookings`);
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) setBookings(Array.isArray(d.data) ? d.data : d.data?.data || []);
    } catch {} finally { setBookingsLoading(false); }
  }, [adminFetch, handleSessionExpired]);

  const fetchFaqs = useCallback(async () => {
    try { setFaqsLoading(true); const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/faqs`);
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) setFaqs(Array.isArray(d.data) ? d.data : d.data?.data || []);
    } catch {} finally { setFaqsLoading(false); }
  }, [adminFetch, handleSessionExpired]);

  const fetchResources = useCallback(async () => {
    try { setResourcesLoading(true); const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/resources`);
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) setResources(Array.isArray(d.data) ? d.data : d.data?.data || []);
    } catch {} finally { setResourcesLoading(false); }
  }, [adminFetch, handleSessionExpired]);

  const fetchGuides = useCallback(async () => {
    try { setGuidesLoading(true); const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/guides`);
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) setGuides(Array.isArray(d.data) ? d.data : d.data?.data || []);
    } catch {} finally { setGuidesLoading(false); }
  }, [adminFetch, handleSessionExpired]);

  const fetchDownloads = useCallback(async () => {
    try { setDownloadsLoading(true); const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/guides/downloads`);
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) setDownloads(Array.isArray(d.data) ? d.data : d.data?.data || []);
    } catch {} finally { setDownloadsLoading(false); }
  }, [adminFetch, handleSessionExpired]);

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "doc", "docx"].includes(ext)) throw new Error("Only PDF and Word documents are allowed");
    if (file.size > 20 * 1024 * 1024) throw new Error("File size must be under 20 MB");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/upload?bucket=${encodeURIComponent(bucket)}&filename=${encodeURIComponent(filename)}`, {
      method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "x-file-content-type": file.type || "application/octet-stream" }, body: file,
    });
    const text = await r.text();
    let data: { success: boolean; data?: { url: string }; error?: { message?: string } };
    try { data = JSON.parse(text); } catch { throw new Error(`Upload failed (${r.status})`); }
    if (!data.success) throw new Error(data.error?.message || "Upload failed");
    return data.data!.url;
  };

  // ── Session init ──────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/session`);
        if (!r.ok) { setIsLoggedIn(false); return; }
        const t = await fetchCsrfToken();
        if (!t) { setIsLoggedIn(false); return; }
        setIsLoggedIn(true);
      } catch { setIsLoggedIn(false); }
    };
    void init();
  }, [adminFetch, fetchCsrfToken]);

  useEffect(() => {
    if (isLoggedIn) { fetchUpdates(); fetchBookings(); fetchFaqs(); fetchResources(); fetchGuides(); fetchDownloads(); }
  }, [isLoggedIn, fetchUpdates, fetchBookings, fetchFaqs, fetchResources, fetchGuides, fetchDownloads]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError("");
    try {
      const r = await adminFetch(`${API_BASE_URL}/api/v1/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json() as ApiErrorPayload;
      if (d.success) {
        const t = await fetchCsrfToken();
        if (!t) { setLoginError("Could not initialize session."); return; }
        setIsLoggedIn(true); setPassword("");
        window.dispatchEvent(new Event("adminAuthChange"));
      } else { setLoginError(d.error?.message || d.message || "Login failed"); }
    } catch { setLoginError("Failed to connect to server"); }
  };

  const handleLogout = async () => {
    try { await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/logout`, { method: "POST" }); } catch {}
    setIsLoggedIn(false); setCsrfToken(""); setActiveTab("dashboard");
    window.dispatchEvent(new Event("adminAuthChange"));
  };

  // ── Login Screen ──────────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">MHT-CET Career Guidance Platform</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input type="email" id="admin-email" value={email} onChange={e => setEmail(e.target.value)} required minLength={5} maxLength={100} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="admin@mhtcet.local" />
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <input type="password" id="admin-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} maxLength={100} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="••••••••" />
              </div>
              {loginError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{loginError}</div>}
              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40">Sign In</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Layout ──────────────────────────────────────────────────────

  const tabProps = { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-700/50">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">MHT-CET Admin</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Control Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-1 mt-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.key ? "bg-violet-600/20 text-violet-400 shadow-lg shadow-violet-500/5" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              {item.icon}
              {item.label}
              {item.key === "bookings" && bookings.filter(b => ["pending", "scheduled"].includes(b.booking_status)).length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{bookings.filter(b => ["pending", "scheduled"].includes(b.booking_status)).length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-lg font-semibold text-white capitalize">{activeTab === "faqs" ? "FAQs" : activeTab}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {activeTab === "dashboard" && <DashboardTab {...tabProps} bookings={bookings} formatDateTime={formatDateTime} setActiveTab={setActiveTab} />}
          {activeTab === "updates" && <UpdatesTab {...tabProps} updates={updates} loading={updatesLoading} fetchUpdates={fetchUpdates} formatDateTime={formatDateTime} />}
          {activeTab === "bookings" && <BookingsTab {...tabProps} bookings={bookings} loading={bookingsLoading} fetchBookings={fetchBookings} formatDateTime={formatDateTime} />}
          {activeTab === "faqs" && <FaqsTab {...tabProps} faqs={faqs} loading={faqsLoading} fetchFaqs={fetchFaqs} />}
          {activeTab === "resources" && <ResourcesTab {...tabProps} resources={resources} loading={resourcesLoading} fetchResources={fetchResources} uploadFile={uploadFile} />}
          {activeTab === "guides" && <GuidesTab {...tabProps} guides={guides} downloads={downloads} guidesLoading={guidesLoading} downloadsLoading={downloadsLoading} fetchGuides={fetchGuides} fetchDownloads={fetchDownloads} uploadFile={uploadFile} formatDateTime={formatDateTime} />}
          {activeTab === "settings" && <SettingsTab {...tabProps} />}
        </main>
      </div>
    </div>
  );
}
