"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { uploadFile } from "@/lib/uploadAdminFile";
import CustomSelect from "@/components/CustomSelect";

export interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export const RESOURCE_CATEGORIES = [
  "Seat Matrix",
  "Previous Year Cutoffs",
  "Government Circulars",
  "Exam Guidelines",
  "Others",
];

interface ResourcesTabProps {
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSessionExpired: () => void;
}

export default function ResourcesTab({
  adminWriteFetch,
  onSessionExpired,
}: ResourcesTabProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [resourceSuccess, setResourceSuccess] = useState("");
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    file_url: "",
    category: "",
  });
  const [resourceSubmitting, setResourceSubmitting] = useState(false);
  const [resourceUploading, setResourceUploading] = useState(false);

  const fetchResources = async () => {
    try {
      setResourcesLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/resources`);
      const data = await response.json();
      if (data.success) setResources(data.data as Resource[]);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    void fetchResources();
  }, []);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setResourceError("");
    setResourceSuccess("");
    setResourceSubmitting(true);
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/resources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resourceForm),
        }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setResourceSuccess("Resource created successfully!");
        setResourceForm({
          title: "",
          description: "",
          file_url: "",
          category: "Seat Matrix",
        });
        void fetchResources();
      } else {
        setResourceError(data.error?.message || "Failed to create resource");
      }
    } catch {
      setResourceError("Failed to connect to server");
    } finally {
      setResourceSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/resources/${id}`,
        { method: "DELETE" }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setResourceSuccess("Resource deleted.");
        void fetchResources();
      } else {
        setResourceError(data.error?.message || "Failed to delete resource");
      }
    } catch {
      setResourceError("Failed to connect to server");
    }
  };

  const handleToggleResource = async (id: string, current: boolean) => {
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/resources/${id}/toggle`,
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
      if (data.success) void fetchResources();
      else setResourceError(data.error?.message || "Failed to update resource");
    } catch {
      setResourceError("Failed to connect to server");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Manage Resources</h2>

      {/* Create resource form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-5">
          Add New Resource
        </h3>
        {resourceError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {resourceError}
          </div>
        )}
        {resourceSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {resourceSuccess}
          </div>
        )}
        <form onSubmit={handleCreateResource} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={resourceForm.title}
                onChange={(e) =>
                  setResourceForm({ ...resourceForm, title: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. MHT CET 2024 Seat Matrix"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={resourceForm.category}
                onChange={(v) =>
                  setResourceForm({ ...resourceForm, category: v })
                }
                required
                inputSize="sm"
                options={[
                  { value: "", label: "Select Category" },
                  ...RESOURCE_CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={resourceForm.description}
              onChange={(e) =>
                setResourceForm({
                  ...resourceForm,
                  description: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Brief description of this resource"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF File <span className="text-red-500">*</span>
            </label>
            <label
              className={`flex items-center gap-3 px-4 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors mb-2 ${
                resourceUploading
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
                {resourceUploading
                  ? "Uploading..."
                  : "Click to upload PDF / DOC"}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={resourceUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setResourceUploading(true);
                  setResourceError("");
                  try {
                    const url = await uploadFile(
                      file,
                      "resources",
                      adminWriteFetch
                    );
                    setResourceForm((prev) => ({ ...prev, file_url: url }));
                  } catch (err) {
                    setResourceError(
                      err instanceof Error ? err.message : "Upload failed"
                    );
                  } finally {
                    setResourceUploading(false);
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
              value={resourceForm.file_url}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, file_url: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://"
            />
            {resourceForm.file_url && (
              <p className="text-xs text-green-600 mt-1 truncate">
                ✓ {resourceForm.file_url}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={resourceSubmitting || resourceUploading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {resourceSubmitting ? "Adding..." : "Add Resource"}
          </button>
        </form>
      </div>

      {/* Resource list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            All Resources ({resources.length})
          </h3>
        </div>
        {resourcesLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : resources.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No resources added yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resources.map((r) => (
              <div
                key={r.id}
                className="p-5 flex items-start justify-between gap-4 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 truncate">
                      {r.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        r.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                      {r.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {r.description}
                  </p>
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:underline truncate block mt-1"
                  >
                    {r.file_url}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleResource(r.id, r.is_active)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      r.is_active
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {r.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteResource(r.id)}
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
    </div>
  );
}
