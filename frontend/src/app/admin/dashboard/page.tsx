"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { SkeletonStatCards, SkeletonCard } from "@/components/ui/Skeleton";
import type { AnalyticsData, Booking } from "@/components/admin/types";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

/* ── Stat Card ──────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "amber" | "cyan" | "rose" | "violet";
  pulse?: boolean;
}

const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
  indigo:  { bg: "bg-indigo-500/10", text: "text-indigo-400", glow: "shadow-indigo-500/10" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/10" },
  amber:   { bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-amber-500/10" },
  cyan:    { bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "shadow-cyan-500/10" },
  rose:    { bg: "bg-rose-500/10", text: "text-rose-400", glow: "shadow-rose-500/10" },
  violet:  { bg: "bg-violet-500/10", text: "text-violet-400", glow: "shadow-violet-500/10" },
};

function StatCard({ label, value, subtitle, icon, color, pulse }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`admin-card p-5 hover:shadow-lg ${c.glow} transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
          {value}
        </span>
        {pulse && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-dot mb-2" />
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
    </div>
  );
}

/* ── Dashboard Page ─────────────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const { adminFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, bookingsRes] = await Promise.all([
        adminFetch(`${API_BASE_URL}/api/v1/admin/analytics`),
        adminFetch(`${API_BASE_URL}/api/v1/admin/bookings`),
      ]);

      if (analyticsRes.status === 401 || bookingsRes.status === 401) {
        handleSessionExpired();
        return;
      }

      const [analyticsData, bookingsData] = await Promise.all([
        analyticsRes.json(),
        bookingsRes.json(),
      ]);

      if (analyticsData.success) setAnalytics(analyticsData.data);
      if (bookingsData.success) {
        const all = Array.isArray(bookingsData.data) ? bookingsData.data : bookingsData.data?.data || [];
        setRecentBookings(all.slice(0, 5));
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [adminFetch, handleSessionExpired, API_BASE_URL]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Chart data
  const areaChartData = useMemo(() => {
    if (!analytics?.bookings_per_day) return [];
    return analytics.bookings_per_day.map((d) => ({
      date: format(parseISO(d.date), "MMM dd"),
      bookings: d.count,
    }));
  }, [analytics]);

  const pieChartData = useMemo(() => {
    if (!analytics?.booking_status_breakdown) return [];
    return analytics.booking_status_breakdown.map((d) => ({
      name: d.booking_status.charAt(0).toUpperCase() + d.booking_status.slice(1),
      value: d.count,
    }));
  }, [analytics]);

  const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
      scheduled: "admin-badge-info",
      confirmed: "admin-badge-success",
      completed: "admin-badge-success",
      pending: "admin-badge-warning",
      cancelled: "admin-badge-danger",
      rescheduled: "admin-badge-primary",
      no_show: "admin-badge-neutral",
    };
    return map[status] || "admin-badge-neutral";
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy, HH:mm");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-up">
        <div>
          <div className="h-8 w-48 shimmer-dark rounded-lg mb-2" />
          <div className="h-4 w-64 shimmer-dark rounded-lg" />
        </div>
        <SkeletonStatCards count={6} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const counts = analytics?.counts;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Dashboard Overview
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Welcome back. Here&apos;s what&apos;s happening with your platform.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-up-1">
        <StatCard
          label="Total Bookings"
          value={counts?.total_bookings ?? 0}
          subtitle="All time consultation bookings"
          color="indigo"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          label="Pending Bookings"
          value={counts?.pending_bookings ?? 0}
          subtitle="Require attention"
          color="amber"
          pulse={(counts?.pending_bookings ?? 0) > 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Active FAQs"
          value={counts?.active_faqs ?? 0}
          subtitle={`of ${counts?.total_faqs ?? 0} total`}
          color="cyan"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Guide Downloads"
          value={analytics?.recent_downloads ?? 0}
          subtitle="Last 7 days"
          color="emerald"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label="Active Resources"
          value={counts?.active_resources ?? 0}
          subtitle="Published documents"
          color="violet"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
        />
        <StatCard
          label="CET Updates"
          value={counts?.total_updates ?? 0}
          subtitle="Published notifications"
          color="rose"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-up-2">
        {/* Area Chart — Bookings Over Time */}
        <div className="xl:col-span-2 admin-card p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Bookings Over Time</h3>
          <p className="text-xs text-slate-500 mb-6">Daily booking trends — last 14 days</p>
          <div className="h-64">
            {areaChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    }}
                    labelStyle={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: "#a5b4fc" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#bookingGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No booking data available
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart — Status Distribution */}
        <div className="admin-card p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Status Distribution</h3>
          <p className="text-xs text-slate-500 mb-6">Booking status breakdown</p>
          <div className="h-64">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieChartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No status data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="admin-card overflow-hidden animate-fade-up-3">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Bookings</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest consultation requests</p>
          </div>
          <a
            href="/admin/bookings"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all →
          </a>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-slate-700/50">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Student</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Purpose</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Date & Time</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{booking.student_name}</p>
                    <p className="text-xs text-slate-500">{booking.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">{booking.meeting_purpose}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                      {formatDateTime(booking.meeting_time)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`admin-badge ${statusBadgeClass(booking.booking_status)}`}>
                      {booking.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-700/30">
          {recentBookings.map((booking) => (
            <div key={booking.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{booking.student_name}</p>
                <span className={`admin-badge ${statusBadgeClass(booking.booking_status)}`}>
                  {booking.booking_status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{booking.meeting_purpose}</p>
              <p className="text-xs text-slate-500 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                {formatDateTime(booking.meeting_time)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
