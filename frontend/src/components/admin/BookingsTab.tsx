"use client";

import { useState, useMemo } from "react";
import type { Booking, AdminTabProps } from "./types";

interface BookingsTabProps extends AdminTabProps {
  bookings: Booking[];
  loading: boolean;
  fetchBookings: () => void;
  formatDateTime: (d: string) => string;
}

export default function BookingsTab({
  adminWriteFetch, API_BASE_URL, bookings, loading, fetchBookings, formatDateTime,
}: BookingsTabProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"meeting_time" | "student_name">("meeting_time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.student_name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter(b => b.booking_status === statusFilter);
    list.sort((a, b) => {
      const va = sortField === "meeting_time" ? new Date(a[sortField]).getTime() : a[sortField].toLowerCase();
      const vb = sortField === "meeting_time" ? new Date(b[sortField]).getTime() : b[sortField].toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [bookings, search, statusFilter, sortField, sortDir]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/bookings/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (d.success) { setSuccess("Status updated!"); fetchBookings(); }
      else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/bookings/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { setSuccess("Deleted!"); fetchBookings(); }
      else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); }
  };

  const exportCSV = () => {
    const headers = ["Name","Email","Phone","Percentile","Category","Branch","Purpose","Meeting Time","Meet Link","Status","Email Status","Created"];
    const rows = filtered.map(b => [b.student_name,b.email,b.phone,b.percentile,b.category,b.branch_preference,b.meeting_purpose,b.meeting_time,b.meet_link,b.booking_status,b.email_status,b.created_at]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bookings_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Bookings</h2>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} of {bookings.length} bookings</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/25 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-violet-500 transition-all">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm">{success}</div>}

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No bookings match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th onClick={() => toggleSort("student_name")} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors">
                    Student {sortField === "student_name" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Contact</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Details</th>
                  <th onClick={() => toggleSort("meeting_time")} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors">
                    Meeting {sortField === "meeting_time" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">{b.student_name.charAt(0).toUpperCase()}</div>
                        <span className="font-semibold text-white text-sm">{b.student_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><p className="text-sm text-slate-300">{b.email}</p><p className="text-xs text-slate-500">{b.phone}</p></td>
                    <td className="px-5 py-4 text-xs text-slate-400"><p>Percentile: <span className="text-white font-medium">{b.percentile}</span></p><p>Category: <span className="text-white font-medium">{b.category}</span></p><p className="truncate max-w-[140px]">{b.branch_preference}</p></td>
                    <td className="px-5 py-4"><p className="text-sm text-white">{formatDateTime(b.meeting_time)}</p>{b.meet_link && <a href={b.meet_link} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300">Meet Link</a>}</td>
                    <td className="px-5 py-4">
                      <select value={b.booking_status} onChange={e => handleStatusChange(b.id, e.target.value)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${b.booking_status === "confirmed" ? "bg-emerald-500/20 text-emerald-400" : b.booking_status === "cancelled" ? "bg-red-500/20 text-red-400" : b.booking_status === "completed" ? "bg-cyan-500/20 text-cyan-400" : b.booking_status === "rescheduled" ? "bg-blue-500/20 text-blue-400" : b.booking_status === "no_show" ? "bg-slate-500/20 text-slate-300" : "bg-amber-500/20 text-amber-400"}`}>
                        <option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="rescheduled">Rescheduled</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option><option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => handleDelete(b.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
