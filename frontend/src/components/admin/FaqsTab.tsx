"use client";

import { useState } from "react";
import type { Faq, AdminTabProps } from "./types";

interface FaqsTabProps extends AdminTabProps {
  faqs: Faq[];
  loading: boolean;
  fetchFaqs: () => void;
}

export default function FaqsTab({ adminWriteFetch, API_BASE_URL, faqs, loading, fetchFaqs, handleSessionExpired }: FaqsTabProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", display_order: "0" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const url = editingId ? `${API_BASE_URL}/api/v1/admin/faqs/${editingId}` : `${API_BASE_URL}/api/v1/admin/faqs`;
      const r = await adminWriteFetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: form.question, answer: form.answer, display_order: Number(form.display_order || 0) }),
      });
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) { setSuccess(editingId ? "FAQ updated!" : "FAQ created!"); setForm({ question: "", answer: "", display_order: "0" }); setEditingId(null); fetchFaqs(); }
      else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); } finally { setSubmitting(false); }
  };

  const handleEdit = (f: Faq) => { setForm({ question: f.question, answer: f.answer, display_order: String(f.display_order) }); setEditingId(f.id); setError(""); setSuccess(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleCancel = () => { setForm({ question: "", answer: "", display_order: "0" }); setEditingId(null); setError(""); setSuccess(""); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/faqs/${id}`, { method: "DELETE" });
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) { setSuccess("FAQ deleted."); fetchFaqs(); } else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/faqs/${id}/toggle`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !current }),
      });
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) fetchFaqs(); else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h2 className="text-2xl font-bold text-white">Manage FAQs</h2><p className="text-slate-400 text-sm mt-1">Add & organize frequently asked questions</p></div>

      {/* Form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-5">{editingId ? "Edit FAQ" : "Add New FAQ"}</h3>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Question <span className="text-red-400">*</span></label>
            <input type="text" required value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="e.g. How does the college predictor work?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Answer <span className="text-red-400">*</span></label>
            <textarea required rows={4} value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-y" placeholder="Clear, student-friendly answer..." />
          </div>
          <div className="max-w-[160px]">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Order</label>
            <input type="number" min="0" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50">{submitting ? "Saving..." : editingId ? "Save FAQ" : "Add FAQ"}</button>
            {editingId && <button type="button" onClick={handleCancel} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors">Cancel</button>}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50"><h3 className="text-lg font-semibold text-white">All FAQs ({faqs.length})</h3></div>
        {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> : faqs.length === 0 ? <div className="p-8 text-center text-slate-500">No FAQs yet.</div> : (
          <div className="divide-y divide-slate-700/30">
            {faqs.map(f => (
              <div key={f.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-700/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-white text-sm">{f.question}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Order {f.display_order}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${f.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-600/30 text-slate-400 border-slate-600/30"}`}>{f.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">{f.answer}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleEdit(f)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-semibold transition-colors">Edit</button>
                  <button onClick={() => handleToggle(f.id, f.is_active)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${f.is_active ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>{f.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => handleDelete(f.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}