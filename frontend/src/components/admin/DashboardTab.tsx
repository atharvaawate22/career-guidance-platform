"use client";

import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import AdminChart from "./AdminChart";
import type { AnalyticsData, Booking, AdminTabProps } from "./types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#8b5cf6",
  pending: "#f59e0b",
  confirmed: "#10b981",
  completed: "#06b6d4",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface DashboardTabProps extends AdminTabProps {
  bookings: Booking[];
  formatDateTime: (d: string) => string;
  setActiveTab: (tab: "bookings" | "updates") => void;
}

export default function DashboardTab({
  adminFetch,
  API_BASE_URL,
  bookings,
  formatDateTime,
  setActiveTab,
}: DashboardTabProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/analytics`);
        const data = await res.json();
        if (data.success) setAnalytics(data.data);
      } catch {
        // Silently fail — stats cards still show from bookings prop
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [adminFetch, API_BASE_URL]);

  const counts = analytics?.counts;

  // Build chart data
  const doughnutData = {
    labels: (analytics?.booking_status_breakdown || []).map(
      (s) => STATUS_LABELS[s.booking_status] || s.booking_status
    ),
    datasets: [
      {
        data: (analytics?.booking_status_breakdown || []).map((s) => s.count),
        backgroundColor: (analytics?.booking_status_breakdown || []).map(
          (s) => STATUS_COLORS[s.booking_status] || "#64748b"
        ),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: "#fff",
      },
    ],
  };

  const barData = {
    labels: (analytics?.bookings_per_day || []).map((d) => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }),
    datasets: [
      {
        label: "Bookings",
        data: (analytics?.bookings_per_day || []).map((d) => d.count),
        backgroundColor: "rgba(139, 92, 246, 0.6)",
        hoverBackgroundColor: "rgba(139, 92, 246, 0.9)",
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Platform overview & analytics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("updates")}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/25"
          >
            + New Update
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-all"
          >
            View All Bookings
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            label="Total Bookings"
            value={counts?.total_bookings ?? bookings.length}
            color="violet"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatCard
            label="Pending / Upcoming"
            value={counts?.pending_bookings ?? bookings.filter((b) => ["pending", "scheduled", "confirmed"].includes(b.booking_status)).length}
            color="amber"
            subtitle="Needs attention"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Active FAQs"
            value={counts?.active_faqs ?? 0}
            color="cyan"
            subtitle={`${counts?.total_faqs ?? 0} total`}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Guide Downloads"
            value={analytics?.recent_downloads ?? 0}
            color="emerald"
            subtitle="Last 7 days"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminChart
          type="doughnut"
          title="Booking Status"
          subtitle="Distribution by status"
          data={doughnutData}
        />
        <AdminChart
          type="bar"
          title="Daily Bookings"
          subtitle="Last 14 days"
          data={barData}
        />
      </div>

      {/* Recent Bookings */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Bookings</h3>
          <button
            onClick={() => setActiveTab("bookings")}
            className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            View all →
          </button>
        </div>
        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No bookings yet</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {recentBookings.map((b) => (
              <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {b.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{b.student_name}</p>
                    <p className="text-xs text-slate-400">{b.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 hidden sm:block">{formatDateTime(b.meeting_time)}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    b.booking_status === "confirmed" ? "bg-emerald-500/20 text-emerald-400" :
                    b.booking_status === "cancelled" ? "bg-red-500/20 text-red-400" :
                    b.booking_status === "completed" ? "bg-cyan-500/20 text-cyan-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>
                    {b.booking_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}