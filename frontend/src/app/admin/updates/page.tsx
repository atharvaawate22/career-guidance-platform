"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import SlideOver from "@/components/ui/SlideOver";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import type { Update } from "@/components/admin/types";
import { format, parseISO } from "date-fns";

export default function AdminUpdatesPage() {
  const { adminWriteFetch, handleSessionExpired, API_BASE_URL } = useAdmin();
  const { toast } = useToast();

  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Update | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Update | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/updates`);
      const data = await res.json();
      if (data.success) setUpdates(Array.isArray(data.data) ? data.data : data.data?.data || []);
    } catch {
      toast({ title: "Failed to load updates", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, toast]);

  useEffect(() => { void fetchUpdates(); }, [fetchUpdates]);

  const openCreate = () => {
    setEditTarget(null);
    setTitle("");
    setContent("");
    setPublishedDate("");
    setSourceUrl("");
    setFormOpen(true);
  };

  const openEdit = (update: Update) => {
    setEditTarget(update);
    setTitle(update.title);
    setContent(update.content);
    setSourceUrl(update.source_url || "");

    if (update.published_date) {
      try {
        const d = new Date(update.published_date);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setPublishedDate(localIso);
      } catch {
        setPublishedDate("");
      }
    } else {
      setPublishedDate("");
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const url = editTarget
        ? `${API_BASE_URL}/api/v1/admin/updates/${editTarget.id}`
        : `${API_BASE_URL}/api/v1/admin/updates`;
      const method = editTarget ? "PUT" : "POST";
      
      const payload: Record<string, string> = {
        title: title.trim(),
        content: content.trim(),
      };
      if (publishedDate) {
        try {
          payload.published_date = new Date(publishedDate).toISOString();
        } catch {
          // Ignored
        }
      } else if (editTarget) {
        // If editing and date is blank, retain the original date
        payload.published_date = editTarget.published_date;
      }
      if (sourceUrl.trim()) {
        payload.source_url = sourceUrl.trim();
      }

      const res = await adminWriteFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: editTarget ? "Update edited" : "Update created", type: "success" });
        setFormOpen(false);
        await fetchUpdates();
      } else {
        toast({ title: data.error?.message || "Failed to save", type: "error" });
      }
    } catch {
      toast({ title: "Failed to save update", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/updates/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.status === 401) { handleSessionExpired(); return; }
      const data = await res.json();
      if (data.success) {
        toast({ title: "Update deleted", type: "success" });
        setDeleteTarget(null);
        await fetchUpdates();
      }
    } catch {
      toast({ title: "Failed to delete", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = search.trim()
    ? updates.filter((u) => u.title.toLowerCase().includes(search.toLowerCase()) || u.content.toLowerCase().includes(search.toLowerCase()))
    : updates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Updates</h1>
          <p className="text-slate-400 text-sm mt-1">Manage CET notifications and announcements</p>
        </div>
        <button onClick={openCreate} className="admin-btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Update
        </button>
      </div>

      {/* Search */}
      <div className="relative animate-fade-up-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search updates..." className="admin-input pl-10 max-w-md" />
      </div>

      {/* List */}
      {loading ? (
        <SkeletonTable rows={4} cols={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
          title="No updates found"
          description={search ? "Try a different search term" : "Create your first CET update"}
          action={!search ? <button onClick={openCreate} className="admin-btn-primary text-sm">Create Update</button> : undefined}
        />
      ) : (
        <div className="space-y-3 animate-fade-up-2">
          {filtered.map((update) => (
            <div key={update.id} className="admin-card p-5 hover:border-slate-600 transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{update.title}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{update.content}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-500 tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                      Published: {format(parseISO(update.published_date), "dd MMM yyyy")}
                    </span>
                    {update.edited_at && (
                      <span className="text-xs text-slate-600">
                        · Edited: {format(parseISO(update.edited_at), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(update)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Edit">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(update)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Slide-over */}
      <SlideOver
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Edit Update" : "Create Update"}
        description={editTarget ? "Modify the update details" : "Publish a new CET notification"}
        footerContent={
          <>
            <button onClick={() => setFormOpen(false)} className="admin-btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()} className="admin-btn-primary">
              {saving ? "Saving..." : editTarget ? "Save Changes" : "Publish"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., CET Round 3 Results Declared" className="admin-input" maxLength={200} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Publish Date (Optional)</label>
            <input type="datetime-local" value={publishedDate} onChange={(e) => setPublishedDate(e.target.value)} className="admin-input" />
            <p className="text-xs text-slate-500 mt-1.5">Leave empty to use current system time</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the update details..." className="admin-input min-h-[200px] resize-y" rows={8} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Official Notice URL (Optional)</label>
            <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://cetcell.mahacet.org/..." className="admin-input" maxLength={500} />
            <p className="text-xs text-slate-500 mt-1.5">Links to the official notice as &ldquo;View official notice&rdquo; on the public page</p>
          </div>
        </div>
      </SlideOver>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Update"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
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
