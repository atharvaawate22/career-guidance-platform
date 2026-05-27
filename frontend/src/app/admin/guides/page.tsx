"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Guide, GuideDownload } from "@/components/admin/types";
import { format, parseISO } from "date-fns";

export default function AdminGuidesPage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL, csrfToken } = useAdmin();
  const { toast } = useToast();

  const [guides, setGuides] = useState<Guide[]>([]);
  const [downloads, setDownloads] = useState<GuideDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"guides" | "leads">("guides");

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete/Toggle
  const [deleteTarget, setDeleteTarget] = useState<Guide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [guidesRes, downloadsRes] = await Promise.all([
        adminFetch(`${API_BASE_URL}/api/v1/admin/guides`),
        adminFetch(`${API_BASE_URL}/api/v1/admin/guides/downloads`),
      ]);
      if (guidesRes.status === 401) { handleSessionExpired(); return; }
      const [guidesData, downloadsData] = await Promise.all([guidesRes.json(), downloadsRes.json()]);
      if (guidesData.success) setGuides(Array.isArray(guidesData.data) ? guidesData.data : guidesData.data?.data || []);
      if (downloadsData.success) setDownloads(Array.isArray(downloadsData.data) ? downloadsData.data : downloadsData.data?.data || []);
    } catch {
      toast({ title: "Failed to load guides", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, handleSessionExpired, API_BASE_URL, toast]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const uploadFile = async (f: File): Promise<string> => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "doc", "docx"].includes(ext)) throw new Error("Only PDF/Word files allowed");
    if (f.size > 20 * 1024 * 1024) throw new Error("Max 20MB");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const headers = new Headers({
      "Content-Type": f.type || "application/octet-stream",
      "x-file-content-type": f.type || "application/octet-stream",
    });
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/upload?bucket=guides&filename=${encodeURIComponent(filename)}`, {
      method: "POST", headers, body: f, credentials: "include",
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Upload failed");
    return data.data.url;
  };

  const handleSave = async () => {
    if (!title.trim() || !file) return;
    setSaving(true);
    try {
      const fileUrl = await uploadFile(file);
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/guides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), file_url: fileUrl }),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "Guide created", type: "success" });
        setFormOpen(false); setTitle(""); setDescription(""); setFile(null);
        await fetchData();
      } else {
        toast({ title: data.error?.message || "Failed to save", type: "error" });
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to save guide", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (guide: Guide) => {
    setToggling(guide.id);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/guides/${guide.id}/toggle`, { method: "PATCH" });
      if (res.status === 401) { handleSessionExpired(); return; }
      if ((await res.json()).success) {
        toast({ title: `Guide ${guide.is_active ? "deactivated" : "activated"}`, type: "success" });
        await fetchData();
      }
    } catch { toast({ title: "Failed to toggle", type: "error" }); }
    finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/guides/${deleteTarget.id}`, { method: "DELETE" });
      if (res.status === 401) { handleSessionExpired(); return; }
      if ((await res.json()).success) {
        toast({ title: "Guide deleted", type: "success" });
        setDeleteTarget(null);
        await fetchData();
      }
    } catch { toast({ title: "Failed to delete", type: "error" }); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Guides</h1>
          <p className="text-slate-400 text-sm mt-1">Manage downloadable guides and track leads</p>
        </div>
        <button onClick={() => { setFormOpen(true); setTitle(""); setDescription(""); setFile(null); }} className="admin-btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Guide
        </button>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit animate-fade-up-1">
        {[{ key: "guides" as const, label: "Guides", count: guides.length }, { key: "leads" as const, label: "Download Leads", count: downloads.length }].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white"}`}
          >
            {label} <span className="ml-1 tabular-nums text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {loading ? <SkeletonTable rows={4} cols={3} /> : tab === "guides" ? (
        guides.length === 0 ? (
          <EmptyState icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} title="No guides yet" description="Upload your first guide" />
        ) : (
          <div className="space-y-3 animate-fade-up-2">
            {guides.map((guide) => (
              <div key={guide.id} className={`admin-card p-5 hover:border-slate-600 transition-all ${!guide.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
                      {guide.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{guide.description}</p>}
                      <p className="text-xs text-slate-500 mt-2 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                        Created: {format(parseISO(guide.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(guide)} disabled={toggling === guide.id} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${guide.is_active ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-slate-700/50 text-slate-500 hover:bg-slate-700"}`}>
                      {toggling === guide.id ? "..." : guide.is_active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => setDeleteTarget(guide)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Leads Table */
        downloads.length === 0 ? (
          <EmptyState icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} title="No downloads yet" description="Leads will appear here when users download guides" />
        ) : (
          <div className="admin-card overflow-hidden animate-fade-up-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Guide</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Percentile</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {downloads.map((dl) => (
                    <tr key={dl.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3 text-sm text-white font-medium">{dl.name}</td>
                      <td className="px-6 py-3 text-sm text-slate-300">{dl.email}</td>
                      <td className="px-6 py-3 text-sm text-slate-400 hidden sm:table-cell max-w-[200px] truncate">{dl.guide_title}</td>
                      <td className="px-6 py-3 text-sm text-slate-400 hidden md:table-cell tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{dl.percentile ?? "—"}</td>
                      <td className="px-6 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap" style={{ fontFamily: "var(--font-mono)" }}>{format(parseISO(dl.downloaded_at), "dd MMM yy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-slate-700/50 text-xs text-slate-500">{downloads.length} lead{downloads.length !== 1 ? "s" : ""} captured</div>
          </div>
        )
      )}

      {/* Create Slide-over */}
      <SlideOver
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add Guide"
        footerContent={
          <>
            <button onClick={() => setFormOpen(false)} className="admin-btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim() || !file} className="admin-btn-primary">{saving ? "Uploading..." : "Create Guide"}</button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Guide title" className="admin-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" className="admin-input min-h-[100px] resize-y" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">File (PDF/Word, max 20MB)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer file:transition-colors" />
            {file && <p className="text-xs text-slate-500 mt-2">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
          </div>
        </div>
      </SlideOver>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Guide" description={`Delete "${deleteTarget?.title}"? This cannot be undone.`} danger
        footerContent={<><button onClick={() => setDeleteTarget(null)} className="admin-btn-secondary">Cancel</button><button onClick={handleDelete} disabled={deleting} className="admin-btn-danger">{deleting ? "Deleting..." : "Delete"}</button></>}
      />
    </div>
  );
}
