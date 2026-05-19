"use client";

import { useState } from "react";
import type { Guide, GuideDownload, AdminTabProps } from "./types";

interface GuidesTabProps extends AdminTabProps {
  guides: Guide[];
  downloads: GuideDownload[];
  guidesLoading: boolean;
  downloadsLoading: boolean;
  fetchGuides: () => void;
  fetchDownloads: () => void;
  uploadFile: (file: File, bucket: string) => Promise<string>;
  formatDateTime: (d: string) => string;
}

export default function GuidesTab({ adminWriteFetch, API_BASE_URL, guides, downloads, guidesLoading, downloadsLoading, fetchGuides, fetchDownloads, uploadFile, handleSessionExpired, formatDateTime }: GuidesTabProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file_url: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/admin/guides`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { setSuccess("Guide created!"); setForm({ title: "", description: "", file_url: "" }); fetchGuides(); }
      else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guide?")) return;
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/admin/guides/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { setSuccess("Deleted."); fetchGuides(); } else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const r = await adminWriteFetch(`${API_BASE_URL}/api/admin/guides/${id}/toggle`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !current }),
      });
      if (r.status === 401) { handleSessionExpired(); return; }
      const d = await r.json();
      if (d.success) fetchGuides(); else setError(d.error?.message || "Failed");
    } catch { setError("Connection failed"); }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h2 className="text-2xl font-bold text-white">Manage Guides</h2><p className="text-slate-400 text-sm mt-1">Upload admission guides & track downloads</p></div>

      {/* Form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-5">Add New Guide</h3>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="e.g. MHT CET 2024 Admission Guide" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description <span className="text-red-400">*</span></label>
            <textarea required rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none" placeholder="Brief description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">PDF File <span className="text-red-400">*</span></label>
            <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-2 ${uploading ? "border-violet-500/50 bg-violet-500/5" : "border-slate-600/50 hover:border-violet-500/50"}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-sm text-slate-400">{uploading ? "Uploading..." : "Upload PDF / DOC"}</span>
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploading} onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return;
                setUploading(true); setError("");
                try { const url = await uploadFile(file, "guides"); setForm(p => ({ ...p, file_url: url })); }
                catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
                finally { setUploading(false); e.target.value = ""; }
              }} />
            </label>
            <div className="flex items-center gap-3 mb-2"><div className="flex-1 h-px bg-slate-700/50" /><span className="text-xs text-slate-500">or paste URL</span><div className="flex-1 h-px bg-slate-700/50" /></div>
            <input type="url" required value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="https://" />
            {form.file_url && <p className="text-xs text-emerald-400 mt-1 truncate">✓ {form.file_url}</p>}
          </div>
          <button type="submit" disabled={submitting || uploading} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50">{submitting ? "Adding..." : "Add Guide"}</button>
        </form>
      </div>

      {/* Guides List */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50"><h3 className="text-lg font-semibold text-white">All Guides ({guides.length})</h3></div>
        {guidesLoading ? <div className="p-8 text-center text-slate-500">Loading...</div> : guides.length === 0 ? <div className="p-8 text-center text-slate-500">No guides yet.</div> : (
          <div className="divide-y divide-slate-700/30">
            {guides.map(g => (
              <div key={g.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-700/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm truncate">{g.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${g.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-600/30 text-slate-400 border-slate-600/30"}`}>{g.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{g.description}</p>
                  <a href={g.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline truncate block mt-1">{g.file_url}</a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(g.id, g.is_active)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${g.is_active ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>{g.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => handleDelete(g.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download Log */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Download Log ({downloads.length})</h3>
          <button onClick={fetchDownloads} className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors">Refresh</button>
        </div>
        {downloadsLoading ? <div className="p-8 text-center text-slate-500">Loading...</div> : downloads.length === 0 ? <div className="p-8 text-center text-slate-500">No downloads yet.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-700/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Percentile</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Guide</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-700/30">
                {downloads.map(d => (
                  <tr key={d.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{d.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{d.email}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{d.percentile ?? "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-400">{d.guide_title}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{formatDateTime(d.downloaded_at)}</td>
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
