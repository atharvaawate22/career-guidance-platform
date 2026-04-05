"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { formatDateTime } from "@/lib/formatDateTime";

export interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
}

interface UpdatesTabProps {
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSessionExpired: () => void;
}

export default function UpdatesTab({
  adminWriteFetch,
  onSessionExpired,
}: UpdatesTabProps) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchUpdates = async () => {
    try {
      setUpdatesLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/updates`);
      const data = await response.json();
      if (data.success) {
        setUpdates(data.data as Update[]);
      }
    } catch (error) {
      console.error("Failed to fetch updates:", error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  useEffect(() => {
    void fetchUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError("");
    setUpdateSuccess("");

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/admin/updates/${editingId}`
        : `${API_BASE_URL}/api/admin/updates`;

      const method = editingId ? "PUT" : "POST";

      const response = await adminWriteFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();

      if (data.success) {
        setUpdateSuccess(
          editingId
            ? "Update edited successfully!"
            : "Update created successfully!"
        );
        setTitle("");
        setContent("");
        setEditingId(null);
        void fetchUpdates();
      } else {
        setUpdateError(data.error?.message || "Failed to save update");
      }
    } catch {
      setUpdateError("Failed to connect to server");
    }
  };

  const handleEditUpdate = (update: Update) => {
    setTitle(update.title);
    setContent(update.content);
    setEditingId(update.id);
    setUpdateError("");
    setUpdateSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
    setUpdateError("");
    setUpdateSuccess("");
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this update?")) {
      return;
    }

    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/updates/${id}`,
        { method: "DELETE" }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();

      if (data.success) {
        setUpdateSuccess("Update deleted successfully!");
        void fetchUpdates();
      } else {
        setUpdateError(data.error?.message || "Failed to delete update");
      }
    } catch {
      setUpdateError("Failed to connect to server");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Manage Updates</h2>

      {/* Create/Edit Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {editingId ? "Edit Update" : "Create New Update"}
        </h3>
        <form onSubmit={handleCreateUpdate} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block mb-2 font-medium text-gray-700"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block mb-2 font-medium text-gray-700"
            >
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="text-sm text-gray-500">
            Date and time will be automatically set to current IST time
          </div>

          {updateError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {updateError}
            </div>
          )}

          {updateSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {updateSuccess}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 p-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              {editingId ? "Update" : "Create Update"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 p-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Updates List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">All Updates</h3>
        {updatesLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : updates.length === 0 ? (
          <p className="text-gray-500">
            No updates yet. Create your first update above.
          </p>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div
                key={update.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-xl font-semibold text-gray-900">
                    {update.title}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditUpdate(update)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUpdate(update.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                  {update.content}
                </p>
                <div className="text-sm text-gray-500">
                  <p>Published: {formatDateTime(update.published_date)}</p>
                  {update.edited_at && (
                    <p className="text-yellow-600">
                      Edited: {formatDateTime(update.edited_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
