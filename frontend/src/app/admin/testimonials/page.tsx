"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Testimonial } from "@/components/admin/types";
import { format, parseISO } from "date-fns";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight" aria-label={`${rating}/5`}>
      {"★".repeat(rating)}
      <span className="text-slate-700">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function AdminTestimonialsPage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit
  const [editTarget, setEditTarget] = useState<Testimonial | null>(null);
  const [editName, setEditName] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/testimonials`);
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) setTestimonials(Array.isArray(data.data) ? data.data : data.data?.data || []);
    } catch {
      toast({ title: "Failed to load testimonials", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, handleSessionExpired, API_BASE_URL, toast]);

  useEffect(() => { void fetchTestimonials(); }, [fetchTestimonials]);

  const openEdit = (t: Testimonial) => {
    setEditTarget(t);
    setEditName(t.name);
    setEditRating(t.rating);
    setEditText(t.review_text);
  };

  const handleSave = async () => {
    if (!editTarget || !editName.trim() || !editText.trim()) return;
    setSaving(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/testimonials/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), rating: editRating, review_text: editText.trim() }),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "Testimonial updated", type: "success" });
        setEditTarget(null);
        await fetchTestimonials();
      } else {
        toast({ title: data.error?.message || "Failed to save", type: "error" });
      }
    } catch {
      toast({ title: "Failed to save testimonial", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/testimonials/${deleteTarget.id}`, { method: "DELETE" });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "Testimonial deleted", type: "success" });
        setDeleteTarget(null);
        await fetchTestimonials();
      }
    } catch {
      toast({ title: "Failed to delete", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = search.trim()
    ? testimonials.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.review_text.toLowerCase().includes(search.toLowerCase()))
    : testimonials;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Testimonials</h1>
          <p className="text-slate-400 text-sm mt-1">Reviews publish immediately — edit or delete as needed</p>
        </div>
      </div>

      <div className="relative animate-fade-up-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search testimonials..." className="admin-input pl-10 max-w-md" />
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
          title="No testimonials yet"
          description="Reviews submitted from the homepage will show up here"
        />
      ) : (
        <div className="space-y-3 animate-fade-up-2">
          {filtered.map((t) => (
            <div key={t.id} className="admin-card p-5 hover:border-slate-600 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                    <Stars rating={t.rating} />
                    <span className="text-xs text-slate-500">{t.email}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.review_text}</p>
                  <p className="text-xs text-slate-600 mt-2 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                    {format(parseISO(t.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Edit">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(t)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideOver
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Testimonial"
        footerContent={
          <>
            <button onClick={() => setEditTarget(null)} className="admin-btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !editName.trim() || !editText.trim()} className="admin-btn-primary">
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="admin-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEditRating(n)}
                  className={`text-2xl leading-none ${n <= editRating ? "text-amber-400" : "text-slate-700"}`}
                  aria-label={`Rate ${n} out of 5`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Review Text</label>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="admin-input min-h-[140px] resize-y" rows={6} />
          </div>
        </div>
      </SlideOver>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Testimonial"
        description={`Delete this review from ${deleteTarget?.name}? This cannot be undone.`}
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
