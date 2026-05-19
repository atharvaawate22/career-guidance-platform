"use client";

import { useState } from "react";
import type { Update, AdminTabProps } from "./types";

interface UpdatesTabProps extends AdminTabProps {
  updates: Update[];
  loading: boolean;
  fetchUpdates: () => void;
  formatDateTime: (d: string) => string;
}

export default function UpdatesTab({
  adminWriteFetch,
  API_BASE_URL,
  updates,
  loading,
  fetchUpdates,
  formatDateTime,
}: UpdatesTabProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const url = editingId
      ? `${API_BASE_URL}/api/admin/updates/${editingId}`
      : `${API_BASE_URL}/api/admin/updates`;

    const body: Record<string, string> = { title, content };
    if (useCustomDate && customDate) {
      body.published_date = new Date(customDate).toISOString();
    }

    try {
      const response = await adminWriteFetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(editingId ? "Update edited successfully!" : "Update created successfully!");
        setTitle("");
        setContent("");
        setEditingId(null);
        setUseCustomDate(false);
        setCustomDate("");
        fetchUpdates();
      } else {
        setError(data.error?.message || "Failed to save update");
      }
    } catch {
      setError("Failed to connect to server");
    }
  };

  const handleEdit = (u: Update) => {
    setTitle(u.title);
    setContent(u.content);
    setEditingId(u.id);
    setUseCustomDate(true);
    // Convert to local datetime string for the input
    const d = new Date(u.published_date);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    setCustomDate(local.toISOString().slice(0, 16));
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this update?")) return;
    try {
      const response = await adminWriteFetch(`${API_BASE_URL}/api/admin/updates/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setSuccess("Update deleted successfully!");
        fetchUpdates();
      } else {
        setError(data.error?.message || "Failed to delete update");
      }
    } catch {
      setError("Failed to connect to server");
    }
  };

  const handleCancel = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
    setUseCustomDate(false);
    setCustomDate("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-white">Manage Updates</h2>
        <p className="text-slate-400 text-sm mt-1">Publish CET news & notifications</p>
      </div>

      {/* Create/Edit Form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-5">
          {editingId ? "Edit Update" : "Create New Update"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              placeholder="Update title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-y"
              placeholder="Write update content..."
            />
          </div>

          {/* Custom Timestamp */}
          <div className="rounded-xl bg-slate-900/30 border border-slate-700/30 p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useCustomDate}
                  onChange={(e) => setUseCustomDate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:bg-violet-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-slate-300 font-medium">Custom publish date</span>
            </label>
            {useCustomDate && (
              <div className="mt-3">
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600/50 text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">Leave blank to use current time. Useful for backdating past announcements.</p>
              </div>
            )}
            {!useCustomDate && (
              <p className="text-xs text-slate-500 mt-2">Date & time will be set to current IST time.</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm">{success}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 px-6 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/25"
            >
              {editingId ? "Save Changes" : "Publish Update"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Updates List */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">All Updates ({updates.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : updates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No updates yet. Create your first update above.</div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {updates.map((u) => (
              <div key={u.id} className="p-6 hover:bg-slate-700/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-semibold text-white">{u.title}</h4>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => handleEdit(u)}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-3 whitespace-pre-wrap leading-relaxed">{u.content}</p>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Published: {formatDateTime(u.published_date)}</span>
                  {u.edited_at && <span className="text-amber-500/80">Edited: {formatDateTime(u.edited_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
