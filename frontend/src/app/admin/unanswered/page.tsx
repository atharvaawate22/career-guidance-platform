"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";

/**
 * Read-only view of the chatbot's unanswered-question backlog
 * (GET /api/v1/admin/unanswered-queries). Questions arrive grouped by a
 * normalized message, most-asked first, so content work can follow demand.
 * Who asked is never returned by the API, and rows are purged after 180 days
 * (migration 024), which is why the longest window offered is 180.
 */

interface UnansweredGroup {
  message: string;
  count: number;
  channels: string[];
  first_seen: string;
  last_seen: string;
}

interface UnansweredSummary {
  total: number;
  unique_messages: number;
  website: number;
  whatsapp: number;
}

const WINDOWS = [7, 30, 90, 180] as const;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUnansweredPage() {
  const { adminFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [days, setDays] = useState<(typeof WINDOWS)[number]>(90);
  const [groups, setGroups] = useState<UnansweredGroup[]>([]);
  const [summary, setSummary] = useState<UnansweredSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchQueries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(
        `${API_BASE_URL}/api/v1/admin/unanswered-queries?days=${days}&limit=500`,
      );
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        setGroups(Array.isArray(data.data?.groups) ? data.data.groups : []);
        setSummary(data.data?.summary ?? null);
      } else {
        toast({ title: data.error?.message || "Failed to load questions", type: "error" });
      }
    } catch {
      toast({ title: "Failed to load unanswered questions", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, handleSessionExpired, API_BASE_URL, toast, days]);

  useEffect(() => { void fetchQueries(); }, [fetchQueries]);

  const needle = search.trim().toLowerCase();
  const filtered = needle ? groups.filter((g) => g.message.includes(needle)) : groups;

  const stats = [
    { label: "Questions logged", value: summary?.total ?? 0 },
    { label: "Distinct questions", value: summary?.unique_messages ?? 0 },
    { label: "Website", value: summary?.website ?? 0 },
    { label: "WhatsApp", value: summary?.whatsapp ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Unanswered Questions
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            What students asked Avani that it couldn&apos;t answer, most-asked first
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-800/60 p-1" role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setDays(w)}
              aria-pressed={days === w}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                days === w ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {w} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up-1">
        {stats.map((s) => (
          <div key={s.label} className="admin-card p-5">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-white tabular-nums mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {loading ? "–" : s.value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      <div className="relative animate-fade-up-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          aria-label="Search questions"
          className="admin-input pl-10 max-w-md"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          title={needle ? "No matching questions" : "Nothing unanswered"}
          description={needle ? "Try a different search" : `Avani answered everything asked in the last ${days} days`}
        />
      ) : (
        <div className="admin-card overflow-hidden animate-fade-up-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                <th className="px-5 py-3 font-medium w-16 text-right">Times</th>
                <th className="px-5 py-3 font-medium">Question</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Channel</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell whitespace-nowrap">Last asked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.message} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-right text-white font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                    {g.count}
                  </td>
                  <td className="px-5 py-3 text-slate-200 break-words">{g.message}</td>
                  <td className="px-5 py-3 text-slate-400 hidden md:table-cell capitalize">{g.channels.join(", ")}</td>
                  <td className="px-5 py-3 text-slate-400 hidden sm:table-cell whitespace-nowrap tabular-nums">
                    {formatDate(g.last_seen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
