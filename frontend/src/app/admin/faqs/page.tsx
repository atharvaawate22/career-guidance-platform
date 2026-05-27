"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Faq } from "@/components/admin/types";

export default function AdminFaqsPage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Faq | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/faqs`);
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) setFaqs(Array.isArray(data.data) ? data.data : data.data?.data || []);
    } catch {
      toast({ title: "Failed to load FAQs", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, handleSessionExpired, API_BASE_URL, toast]);

  useEffect(() => { void fetchFaqs(); }, [fetchFaqs]);

  const openCreate = () => {
    setEditTarget(null);
    setQuestion("");
    setAnswer("");
    setDisplayOrder(faqs.length + 1);
    setFormOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditTarget(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setDisplayOrder(faq.display_order);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const url = editTarget ? `${API_BASE_URL}/api/v1/admin/faqs/${editTarget.id}` : `${API_BASE_URL}/api/v1/admin/faqs`;
      const method = editTarget ? "PUT" : "POST";
      const res = await adminWriteFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), answer: answer.trim(), display_order: displayOrder }),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: editTarget ? "FAQ updated" : "FAQ created", type: "success" });
        setFormOpen(false);
        await fetchFaqs();
      } else {
        toast({ title: data.error?.message || "Failed to save", type: "error" });
      }
    } catch {
      toast({ title: "Failed to save FAQ", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (faq: Faq) => {
    setToggling(faq.id);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/faqs/${faq.id}/toggle`, { method: "PATCH" });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: `FAQ ${faq.is_active ? "deactivated" : "activated"}`, type: "success" });
        await fetchFaqs();
      }
    } catch {
      toast({ title: "Failed to toggle FAQ", type: "error" });
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/faqs/${deleteTarget.id}`, { method: "DELETE" });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "FAQ deleted", type: "success" });
        setDeleteTarget(null);
        await fetchFaqs();
      }
    } catch {
      toast({ title: "Failed to delete", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const sorted = [...faqs].sort((a, b) => a.display_order - b.display_order);
  const filtered = search.trim()
    ? sorted.filter((f) => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>FAQs</h1>
          <p className="text-slate-400 text-sm mt-1">Manage frequently asked questions</p>
        </div>
        <button onClick={openCreate} className="admin-btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add FAQ
        </button>
      </div>

      <div className="relative animate-fade-up-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs..." className="admin-input pl-10 max-w-md" />
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          title="No FAQs found"
          description="Add frequently asked questions for your users"
          action={<button onClick={openCreate} className="admin-btn-primary text-sm">Add FAQ</button>}
        />
      ) : (
        <div className="space-y-3 animate-fade-up-2">
          {filtered.map((faq, idx) => (
            <div key={faq.id} className={`admin-card p-5 hover:border-slate-600 transition-all group ${!faq.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                {/* Order Number */}
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0 tabular-nums">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Active/Inactive toggle */}
                      <button
                        onClick={() => handleToggle(faq)}
                        disabled={toggling === faq.id}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          faq.is_active
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-slate-700/50 text-slate-500 hover:bg-slate-700"
                        }`}
                        title={faq.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {toggling === faq.id ? "..." : faq.is_active ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => openEdit(faq)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteTarget(faq)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideOver
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Edit FAQ" : "Add FAQ"}
        footerContent={
          <>
            <button onClick={() => setFormOpen(false)} className="admin-btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !question.trim() || !answer.trim()} className="admin-btn-primary">
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Question</label>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter the question" className="admin-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Answer</label>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Enter the answer" className="admin-input min-h-[160px] resize-y" rows={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
            <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} min={0} className="admin-input w-24" />
          </div>
        </div>
      </SlideOver>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete FAQ"
        description={`Delete this FAQ? This cannot be undone.`}
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
