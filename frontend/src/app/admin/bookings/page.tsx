"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Booking } from "@/components/admin/types";
import { format, parseISO } from "date-fns";

/* ── Status Helpers ─────────────────────────────────────────────────────── */

const STATUS_OPTIONS = ["scheduled", "confirmed", "completed", "cancelled", "rescheduled", "no_show"];

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

const statusFilterCounts = (bookings: Booking[]) => {
  const counts: Record<string, number> = { all: bookings.length };
  bookings.forEach((b) => {
    counts[b.booking_status] = (counts[b.booking_status] || 0) + 1;
  });
  return counts;
};

/* ── Component ──────────────────────────────────────────────────────────── */

export default function AdminBookingsPage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  /* ── Fetch ─────────────────────────────────────────────────────────────── */

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/bookings`);
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        setBookings(Array.isArray(data.data) ? data.data : data.data?.data || []);
      }
    } catch {
      toast({ title: "Failed to load bookings", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, handleSessionExpired, API_BASE_URL, toast]);

  useEffect(() => { void fetchBookings(); }, [fetchBookings]);

  /* ── Filtered & Searched ───────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let result = bookings;
    if (statusFilter !== "all") {
      result = result.filter((b) => b.booking_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.student_name.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          b.phone.includes(q)
      );
    }
    return result;
  }, [bookings, statusFilter, search]);

  const counts = statusFilterCounts(bookings);

  /* ── Actions ───────────────────────────────────────────────────────────── */

  const updateStatus = async (bookingId: string, newStatus: string) => {
    setStatusUpdating(bookingId);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: `Status updated to ${newStatus}`, type: "success" });
        await fetchBookings();
      } else {
        toast({ title: data.error?.message || "Failed to update status", type: "error" });
      }
    } catch {
      toast({ title: "Failed to update status", type: "error" });
    } finally {
      setStatusUpdating(null);
    }
  };

  const deleteBooking = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/bookings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "Booking deleted", type: "success" });
        setDeleteTarget(null);
        await fetchBookings();
      } else {
        toast({ title: data.error?.message || "Failed to delete", type: "error" });
      }
    } catch {
      toast({ title: "Failed to delete booking", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Percentile", "Category", "Branch", "Purpose", "Date", "Status"];
    const rows = filtered.map((b) => [
      b.student_name, b.email, b.phone, b.percentile, b.category,
      b.branch_preference, b.meeting_purpose,
      format(parseISO(b.meeting_time), "yyyy-MM-dd HH:mm"), b.booking_status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", type: "success" });
  };

  const formatDateTime = (dateString: string) => {
    try { return format(parseISO(dateString), "dd MMM yyyy, HH:mm"); } catch { return dateString; }
  };

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Bookings
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage consultation bookings and sessions</p>
        </div>
        <button onClick={exportCSV} className="admin-btn-secondary text-xs sm:text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2 animate-fade-up-1">
        {[{ key: "all", label: "All" }, ...STATUS_OPTIONS.map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))].map(
          ({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                statusFilter === key
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {label}
              {counts[key] !== undefined && (
                <span className="ml-1.5 tabular-nums">{counts[key]}</span>
              )}
            </button>
          )
        )}
      </div>

      {/* Search */}
      <div className="relative animate-fade-up-2">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="admin-input pl-10 max-w-md"
        />
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          title="No bookings found"
          description={search ? "Try adjusting your search or filters" : "No consultation bookings have been made yet"}
        />
      ) : (
        <div className="admin-card overflow-hidden animate-fade-up-3">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Student</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Purpose</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Session Time</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }}
                        className="text-left"
                      >
                        <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{booking.student_name}</p>
                        <p className="text-xs text-slate-500">{booking.email}</p>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300 max-w-[200px] truncate">{booking.meeting_purpose}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300 tabular-nums whitespace-nowrap" style={{ fontFamily: "var(--font-mono)" }}>
                        {formatDateTime(booking.meeting_time)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={booking.booking_status}
                        onChange={(e) => updateStatus(booking.id, e.target.value)}
                        disabled={statusUpdating === booking.id}
                        className={`admin-badge ${statusBadgeClass(booking.booking_status)} border-0 cursor-pointer text-xs pr-6 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] ${statusUpdating === booking.id ? "opacity-50" : ""}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(booking)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete booking"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-slate-700/30">
            {filtered.map((booking) => (
              <div key={booking.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <button onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }} className="text-left">
                    <p className="text-sm font-medium text-white">{booking.student_name}</p>
                    <p className="text-xs text-slate-500">{booking.email}</p>
                  </button>
                  <span className={`admin-badge ${statusBadgeClass(booking.booking_status)}`}>
                    {booking.booking_status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{booking.meeting_purpose}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                    {formatDateTime(booking.meeting_time)}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(booking)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Results count */}
          <div className="px-6 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            Showing {filtered.length} of {bookings.length} bookings
          </div>
        </div>
      )}

      {/* Detail Slide-over */}
      <SlideOver
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedBooking(null); }}
        title="Booking Details"
        description={selectedBooking?.student_name}
        size="md"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</label>
              <div className="mt-2">
                <span className={`admin-badge ${statusBadgeClass(selectedBooking.booking_status)} text-sm`}>
                  {selectedBooking.booking_status}
                </span>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Student Name", value: selectedBooking.student_name },
                { label: "Email", value: selectedBooking.email },
                { label: "Phone", value: selectedBooking.phone },
                { label: "Percentile", value: selectedBooking.percentile },
                { label: "Category", value: selectedBooking.category },
                { label: "Branch Preference", value: selectedBooking.branch_preference },
                { label: "Meeting Purpose", value: selectedBooking.meeting_purpose },
                { label: "Session Time", value: formatDateTime(selectedBooking.meeting_time) },
                { label: "Email Status", value: selectedBooking.email_status },
                { label: "Booked On", value: formatDateTime(selectedBooking.created_at) },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{field.label}</label>
                  <p className="text-sm text-white mt-1">{field.value || "—"}</p>
                </div>
              ))}
            </div>

            {/* Meet Link */}
            {selectedBooking.meet_link && (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Google Meet Link</label>
                <a
                  href={selectedBooking.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {selectedBooking.meet_link}
                </a>
              </div>
            )}

            {/* Quick Status Change */}
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Change Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter((s) => s !== selectedBooking.booking_status).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateStatus(selectedBooking.id, s);
                      setSelectedBooking({ ...selectedBooking, booking_status: s });
                    }}
                    className="admin-btn-secondary text-xs capitalize"
                    disabled={statusUpdating === selectedBooking.id}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Booking"
        description={`Are you sure you want to delete the booking for "${deleteTarget?.student_name}"? This action cannot be undone.`}
        danger
        footerContent={
          <>
            <button onClick={() => setDeleteTarget(null)} className="admin-btn-secondary">
              Cancel
            </button>
            <button onClick={deleteBooking} disabled={deleting} className="admin-btn-danger">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      />
    </div>
  );
}
