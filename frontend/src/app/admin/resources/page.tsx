"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Resource } from "@/components/admin/types";
import { format, parseISO } from "date-fns";

const CATEGORIES = ["general", "admission", "exam", "placement", "scholarship"];

export default function AdminResourcesPage() {
  const { adminFetch, adminWriteFetch, handleSessionExpired, API_BASE_URL, csrfToken } = useAdmin();
  const { toast } = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Resource | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/resources`);
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) setResources(Array.isArray(data.data) ? data.data : data.data?.data || []);
    } catch { toast({ title: "Failed to load resources", type: "error" }); }
    finally { setLoading(false); }
  }, [adminFetch, handleSessionExpired, API_BASE_URL, toast]);

  useEffect(() => { void fetchResources(); }, [fetchResources]);

  const uploadFile = async (f: File): Promise<string> => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "doc", "docx"].includes(ext)) throw new Error("Only PDF/Word");
    if (f.size > 20 * 1024 * 1024) throw new Error("Max 20MB");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const headers = new Headers({ "Content-Type": f.type || "application/octet-stream", "x-file-content-type": f.type || "application/octet-stream" });
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/upload?bucket=resources&filename=${encodeURIComponent(filename)}`, { method: "POST", headers, body: f, credentials: "include" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || "Upload failed");
    return data.data.url;
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let fileUrl = editTarget?.file_url || "";
      if (file) fileUrl = await uploadFile(file);
      else if (!editTarget) { toast({ title: "Please select a file", type: "warning" }); setSaving(false); return; }

      const url = editTarget ? `${API_BASE_URL}/api/v1/admin/resources/${editTarget.id}` : `${API_BASE_URL}/api/v1/admin/resources`;
      const method = editTarget ? "PUT" : "POST";
      const res = await adminWriteFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), file_url: fileUrl, category }),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: editTarget ? "Resource updated" : "Resource created", type: "success" });
        setFormOpen(false);
        await fetchResources();
      } else { toast({ title: data.error?.message || "Failed to save", type: "error" }); }
    } catch (err) { toast({ title: err instanceof Error ? err.message : "Failed to save", type: "error" }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (resource: Resource) => {
    setToggling(resource.id);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/resources/${resource.id}/toggle`, { method: "PATCH" });
      if (res.status === 401) { handleSessionExpired(); return; }
      if ((await res.json()).success) { toast({ title: `Resource ${resource.is_active ? "deactivated" : "activated"}`, type: "success" }); await fetchResources(); }
    } catch { toast({ title: "Failed to toggle", type: "error" }); }
    finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/resources/${deleteTarget.id}`, { method: "DELETE" });
      if (res.status === 401) { handleSessionExpired(); return; }
      if ((await res.json()).success) { toast({ title: "Resource deleted", type: "success" }); setDeleteTarget(null); await fetchResources(); }
    } catch { toast({ title: "Failed to delete", type: "error" }); }
    finally { setDeleting(false); }
  };

  const openCreate = () => { setEditTarget(null); setTitle(""); setDescription(""); setCategory(CATEGORIES[0]); setFile(null); setFormOpen(true); };
  const openEdit = (r: Resource) => { setEditTarget(r); setTitle(r.title); setDescription(r.description); setCategory(r.category); setFile(null); setFormOpen(true); };

  const filtered = resources
    .filter((r) => categoryFilter === "all" || r.category === categoryFilter)
    .filter((r) => !search.trim() || r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Resources</h1>
          <p className="text-slate-400 text-sm mt-1">Manage downloadable documents and files</p>
        </div>
        <button onClick={openCreate} className="admin-btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Resource
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up-1">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="admin-input pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${categoryFilter === cat ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"}`}
            >{cat}</button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonTable rows={4} cols={3} /> : filtered.length === 0 ? (
        <EmptyState icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} title="No resources found" description="Upload documents for students"
          action={<button onClick={openCreate} className="admin-btn-primary text-sm">Add Resource</button>} />
      ) : (
        <div className="space-y-3 animate-fade-up-2">
          {filtered.map((resource) => (
            <div key={resource.id} className={`admin-card p-5 hover:border-slate-600 transition-all ${!resource.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{resource.title}</h3>
                    {resource.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{resource.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="admin-badge admin-badge-neutral capitalize">{resource.category}</span>
                      <span className="text-xs text-slate-500 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{format(parseISO(resource.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(resource)} disabled={toggling === resource.id} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${resource.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700/50 text-slate-500"}`}>
                    {toggling === resource.id ? "..." : resource.is_active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => openEdit(resource)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button onClick={() => setDeleteTarget(resource)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideOver isOpen={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? "Edit Resource" : "Add Resource"}
        footerContent={<><button onClick={() => setFormOpen(false)} className="admin-btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving || !title.trim()} className="admin-btn-primary">{saving ? "Saving..." : "Save"}</button></>}>
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="admin-input min-h-[100px] resize-y" rows={3} /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="admin-input capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">File {editTarget ? "(replace existing)" : ""}</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer" />
          </div>
        </div>
      </SlideOver>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Resource" description={`Delete "${deleteTarget?.title}"? This cannot be undone.`} danger
        footerContent={<><button onClick={() => setDeleteTarget(null)} className="admin-btn-secondary">Cancel</button><button onClick={handleDelete} disabled={deleting} className="admin-btn-danger">{deleting ? "Deleting..." : "Delete"}</button></>} />
    </div>
  );
}
