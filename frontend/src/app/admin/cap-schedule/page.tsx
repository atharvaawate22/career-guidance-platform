"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { CapScheduleEvent, CapScheduleEventStatus } from "@/components/admin/types";
import { CAP_SCHEDULE_YEAR } from "@/lib/dataYear";

const STATUS_OPTIONS: { value: CapScheduleEventStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "completed", label: "Completed" },
  { value: "postponed", label: "Postponed" },
];

const STATUS_DOT: Record<CapScheduleEventStatus, string> = {
  upcoming: "bg-slate-500",
  today: "bg-indigo-400",
  completed: "bg-emerald-400",
  postponed: "bg-amber-400",
};

interface FormState {
  academic_year: string;
  round_label: string;
  event_label: string;
  display_order: string;
  planned_date: string;
  revised_date: string;
  status: CapScheduleEventStatus;
  result_url: string;
  result_note: string;
  notes: string;
}

const emptyForm = (defaultYear: number): FormState => ({
  academic_year: String(defaultYear),
  round_label: "",
  event_label: "",
  display_order: "0",
  planned_date: "",
  revised_date: "",
  status: "upcoming",
  result_url: "",
  result_note: "",
  notes: "",
});

export default function AdminCapSchedulePage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [events, setEvents] = useState<CapScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(String(CAP_SCHEDULE_YEAR));
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CapScheduleEvent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(CAP_SCHEDULE_YEAR));
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CapScheduleEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const qs = yearFilter ? `?academic_year=${yearFilter}` : "";
      const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/cap-schedule-events${qs}`);
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) setEvents(Array.isArray(data.data) ? data.data : []);
      else toast({ title: "Failed to load schedule", type: "error" });
    } catch {
      toast({ title: "Failed to load schedule", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, API_BASE_URL, yearFilter, handleSessionExpired, toast]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  /** One-tap status flip from the list — the "under a minute from my phone" path. */
  const handleStatusChange = async (event: CapScheduleEvent, status: CapScheduleEventStatus) => {
    const previous = event.status;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status } : e)));
    setSavingStatusId(event.id);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/cap-schedule-events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      toast({ title: `Marked ${event.event_label} as ${status}`, type: "success" });
    } catch {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status: previous } : e)));
      toast({ title: "Failed to update status", type: "error" });
    } finally {
      setSavingStatusId(null);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm(Number(yearFilter) || CAP_SCHEDULE_YEAR));
    setFormOpen(true);
  };

  const openEdit = (event: CapScheduleEvent) => {
    setEditTarget(event);
    setForm({
      academic_year: String(event.academic_year),
      round_label: event.round_label,
      event_label: event.event_label,
      display_order: String(event.display_order),
      planned_date: event.planned_date ?? "",
      revised_date: event.revised_date ?? "",
      status: event.status,
      result_url: event.result_url ?? "",
      result_note: event.result_note ?? "",
      notes: event.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.round_label.trim() || !form.event_label.trim()) return;
    setSaving(true);
    try {
      const isCreate = !editTarget;
      const url = isCreate
        ? `${API_BASE_URL}/api/v1/admin/cap-schedule-events`
        : `${API_BASE_URL}/api/v1/admin/cap-schedule-events/${editTarget.id}`;

      const payload: Record<string, unknown> = {
        round_label: form.round_label.trim(),
        event_label: form.event_label.trim(),
        display_order: Number(form.display_order) || 0,
        planned_date: form.planned_date || null,
        revised_date: form.revised_date || null,
        status: form.status,
        result_url: form.result_url.trim() || null,
        result_note: form.result_note.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (isCreate) payload.academic_year = Number(form.academic_year) || CAP_SCHEDULE_YEAR;

      const res = await adminWriteFetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: isCreate ? "Event created" : "Event updated", type: "success" });
        setFormOpen(false);
        await fetchEvents();
      } else {
        toast({ title: data.error?.message || "Failed to save", type: "error" });
      }
    } catch {
      toast({ title: "Failed to save event", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/cap-schedule-events/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "Event deleted", type: "success" });
        setDeleteTarget(null);
        await fetchEvents();
      }
    } catch {
      toast({ title: "Failed to delete", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // Group by round, preserving the backend's display_order.
  const rounds = new Map<string, CapScheduleEvent[]>();
  for (const event of events) {
    const list = rounds.get(event.round_label);
    if (list) list.push(event);
    else rounds.set(event.round_label, [event]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>CAP Schedule</h1>
          <p className="text-slate-400 text-sm mt-1">
            Powers the public /mht-cet-cap-{CAP_SCHEDULE_YEAR}-schedule page — edits here go live within minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="admin-input w-28"
            aria-label="Academic year filter"
          />
          <button onClick={openCreate} className="admin-btn-primary whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Event
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          title="No schedule events found"
          description={`No CAP schedule rows for ${yearFilter || "any year"} yet.`}
          action={<button onClick={openCreate} className="admin-btn-primary text-sm">Add Event</button>}
        />
      ) : (
        <div className="space-y-6 animate-fade-up-2">
          {[...rounds.entries()].map(([roundLabel, roundEvents]) => (
            <div key={roundLabel}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{roundLabel}</h2>
              <div className="space-y-2">
                {roundEvents.map((event) => (
                  <div key={event.id} className="admin-card p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-semibold text-white">{event.event_label}</p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                        {event.revised_date ?? event.planned_date ?? "No date set"}
                        {event.revised_date && event.planned_date && event.revised_date !== event.planned_date && (
                          <span className="text-slate-600"> (was {event.planned_date})</span>
                        )}
                      </p>
                      {event.result_note && (
                        <p className="text-xs text-indigo-400 mt-1 line-clamp-1">{event.result_note}</p>
                      )}
                    </div>

                    {/* Quick status flip */}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[event.status]}`} />
                      <select
                        value={event.status}
                        disabled={savingStatusId === event.id}
                        onChange={(e) => void handleStatusChange(event, e.target.value as CapScheduleEventStatus)}
                        className="admin-input py-1.5 text-xs w-32"
                        aria-label={`Status for ${event.event_label}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(event)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteTarget(event)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Slide-over */}
      <SlideOver
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Edit Schedule Event" : "Add Schedule Event"}
        description={editTarget ? "Date changes are tracked automatically as revision history" : "Add a new CAP milestone"}
        footerContent={
          <>
            <button onClick={() => setFormOpen(false)} className="admin-btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.round_label.trim() || !form.event_label.trim()} className="admin-btn-primary">
              {saving ? "Saving..." : editTarget ? "Save Changes" : "Create"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {!editTarget && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Academic Year</label>
              <input type="number" value={form.academic_year} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))} className="admin-input" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Round</label>
              <input type="text" value={form.round_label} onChange={(e) => setForm((f) => ({ ...f, round_label: e.target.value }))} placeholder="e.g., CAP Round 2" className="admin-input" maxLength={100} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
              <input type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} className="admin-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Event</label>
            <input type="text" value={form.event_label} onChange={(e) => setForm((f) => ({ ...f, event_label: e.target.value }))} placeholder="e.g., Seat Allotment Result" className="admin-input" maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Planned Date</label>
              <input type="date" value={form.planned_date} onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))} className="admin-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Revised Date</label>
              <input type="date" value={form.revised_date} onChange={(e) => setForm((f) => ({ ...f, revised_date: e.target.value }))} className="admin-input" />
              <p className="text-xs text-slate-500 mt-1.5">Set this instead of overwriting the planned date — the old value is kept and struck through publicly.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CapScheduleEventStatus }))} className="admin-input">
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Result Note (Optional)</label>
            <textarea value={form.result_note} onChange={(e) => setForm((f) => ({ ...f, result_note: e.target.value }))} placeholder="e.g., Round 2 provisional allotment declared — see cutoffs here" className="admin-input min-h-[80px] resize-y" maxLength={500} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Official Notice URL (Optional)</label>
            <input type="url" value={form.result_url} onChange={(e) => setForm((f) => ({ ...f, result_url: e.target.value }))} placeholder="https://cetcell.mahacet.org/..." className="admin-input" maxLength={500} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Shown publicly beneath the date, e.g. a caveat before the official date is out" className="admin-input min-h-[60px] resize-y" maxLength={1000} />
          </div>
        </div>
      </SlideOver>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Schedule Event"
        description={`Delete "${deleteTarget?.event_label}"? This cannot be undone.`}
        danger
        footerContent={
          <>
            <button onClick={() => setDeleteTarget(null)} className="admin-btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="admin-btn-danger">{deleting ? "Deleting..." : "Delete"}</button>
          </>
        }
      />
    </div>
  );
}
