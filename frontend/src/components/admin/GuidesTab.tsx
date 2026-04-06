"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { uploadFile } from "@/lib/uploadAdminFile";
import { formatDateTime } from "@/lib/formatDateTime";

export interface Guide {
  id: string;
  title: string;
  description: string;
  file_url: string;
  is_active: boolean;
  created_at: string;
}

export interface GuideDownload {
  id: string;
  name: string;
  email: string;
  percentile: number | null;
  downloaded_at: string;
  guide_title: string;
}

interface GuidesTabProps {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSessionExpired: () => void;
}

export default function GuidesTab({
  adminFetch,
  adminWriteFetch,
  onSessionExpired,
}: GuidesTabProps) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [guideError, setGuideError] = useState("");
  const [guideSuccess, setGuideSuccess] = useState("");
  const [guideForm, setGuideForm] = useState({
    title: "",
    description: "",
    file_url: "",
  });
  const [guideSubmitting, setGuideSubmitting] = useState(false);
  const [guideUploading, setGuideUploading] = useState(false);
  const [downloads, setDownloads] = useState<GuideDownload[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  const fetchGuides = async () => {
    try {
      setGuidesLoading(true);
      const response = await adminFetch(`${API_BASE_URL}/api/admin/guides`);
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setGuides(data.data as Guide[]);
      } else {
        setGuideError(data.error?.message || "Failed to load guides");
      }
    } catch (error) {
      console.error("Failed to fetch guides:", error);
      setGuideError("Failed to connect to server");
    } finally {
      setGuidesLoading(false);
    }
  };

  const fetchDownloads = async () => {
    try {
      setDownloadsLoading(true);
      const response = await adminFetch(
        `${API_BASE_URL}/api/admin/guides/downloads`,
        {}
      );
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      const data = await response.json();
      if (data.success) setDownloads(data.data as GuideDownload[]);
    } catch (error) {
      console.error("Failed to fetch downloads:", error);
    } finally {
      setDownloadsLoading(false);
    }
  };

  useEffect(() => {
    void fetchGuides();
    void fetchDownloads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuideError("");
    setGuideSuccess("");
    setGuideSubmitting(true);
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/guides`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(guideForm),
        }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setGuideSuccess("Guide created successfully!");
        setGuideForm({ title: "", description: "", file_url: "" });
        void fetchGuides();
      } else {
        setGuideError(data.error?.message || "Failed to create guide");
      }
    } catch {
      setGuideError("Failed to connect to server");
    } finally {
      setGuideSubmitting(false);
    }
  };

  const handleDeleteGuide = async (id: string) => {
    if (!confirm("Delete this guide?")) return;
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/guides/${id}`,
        { method: "DELETE" }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setGuideSuccess("Guide deleted.");
        void fetchGuides();
      } else {
        setGuideError(data.error?.message || "Failed to delete guide");
      }
    } catch {
      setGuideError("Failed to connect to server");
    }
  };

  const handleToggleGuide = async (id: string, current: boolean) => {
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/guides/${id}/toggle`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !current }),
        }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();
      if (data.success) void fetchGuides();
      else setGuideError(data.error?.message || "Failed to update guide");
    } catch {
      setGuideError("Failed to connect to server");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Manage Guides</h2>

      {/* Create Guide Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-5">
          Add New Guide
        </h3>
        {guideError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {guideError}
          </div>
        )}
        {guideSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {guideSuccess}
          </div>
        )}
        <form onSubmit={handleCreateGuide} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={guideForm.title}
              onChange={(e) =>
                setGuideForm({ ...guideForm, title: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. MHT CET 2024 Admission Guide"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={guideForm.description}
              onChange={(e) =>
                setGuideForm({ ...guideForm, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Brief description of this guide"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF File <span className="text-red-500">*</span>
            </label>
            <label
              className={`flex items-center gap-3 px-4 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors mb-2 ${
                guideUploading
                  ? "border-purple-300 bg-purple-50"
                  : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"
              }`}
            >
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-sm text-gray-500">
                {guideUploading ? "Uploading..." : "Click to upload PDF / DOC"}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={guideUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setGuideUploading(true);
                  setGuideError("");
                  try {
                    const url = await uploadFile(file, "guides", adminWriteFetch);
                    setGuideForm((prev) => ({ ...prev, file_url: url }));
                  } catch (err) {
                    setGuideError(
                      err instanceof Error ? err.message : "Upload failed"
                    );
                  } finally {
                    setGuideUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or paste URL</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <input
              type="url"
              required
              value={guideForm.file_url}
              onChange={(e) =>
                setGuideForm({ ...guideForm, file_url: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://"
            />
            {guideForm.file_url && (
              <p className="text-xs text-green-600 mt-1 truncate">
                ✓ {guideForm.file_url}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={guideSubmitting || guideUploading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {guideSubmitting ? "Adding..." : "Add Guide"}
          </button>
        </form>
      </div>

      {/* Guides List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            All Guides ({guides.length})
          </h3>
        </div>
        {guidesLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : guides.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No guides added yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {guides.map((g) => (
              <div
                key={g.id}
                className="p-5 flex items-start justify-between gap-4 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 truncate">
                      {g.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        g.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {g.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {g.description}
                  </p>
                  <a
                    href={g.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:underline truncate block mt-1"
                  >
                    {g.file_url}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleGuide(g.id, g.is_active)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      g.is_active
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {g.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteGuide(g.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downloads Log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800">
            Download Log ({downloads.length})
          </h3>
          <button
            onClick={fetchDownloads}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Refresh
          </button>
        </div>
        {downloadsLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : downloads.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No downloads yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Percentile
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Guide
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {downloads.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {d.name}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {d.email}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {d.percentile ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {d.guide_title}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDateTime(d.downloaded_at)}
                    </td>
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
