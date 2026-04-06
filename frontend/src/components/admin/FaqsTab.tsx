"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { readApiError } from "@/lib/apiError";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface FaqsTabProps {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSessionExpired: () => void;
}

export default function FaqsTab({
  adminFetch,
  adminWriteFetch,
  onSessionExpired,
}: FaqsTabProps) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [faqError, setFaqError] = useState("");
  const [faqSuccess, setFaqSuccess] = useState("");
  const [faqSubmitting, setFaqSubmitting] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    display_order: "0",
  });

  const fetchFaqs = async () => {
    try {
      setFaqsLoading(true);
      setFaqError("");
      const response = await adminFetch(`${API_BASE_URL}/api/admin/faqs`);
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (!response.ok) {
        setFaqError(
          await readApiError(response, "We couldn't load FAQs from the server")
        );
        setFaqs([]);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setFaqs(data.data as Faq[]);
      } else {
        setFaqError(data.error?.message || "Failed to load FAQs");
      }
    } catch (error) {
      console.error("Failed to fetch FAQs:", error);
      setFaqError("Failed to connect to server");
    } finally {
      setFaqsLoading(false);
    }
  };

  useEffect(() => {
    void fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError("");
    setFaqSuccess("");
    setFaqSubmitting(true);

    try {
      const url = editingFaqId
        ? `${API_BASE_URL}/api/admin/faqs/${editingFaqId}`
        : `${API_BASE_URL}/api/admin/faqs`;

      const response = await adminWriteFetch(url, {
        method: editingFaqId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: faqForm.question,
          answer: faqForm.answer,
          display_order: Number(faqForm.display_order || 0),
        }),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (!response.ok) {
        setFaqError(await readApiError(response, "We couldn't save this FAQ"));
        return;
      }

      const data = await response.json();
      if (data.success) {
        setFaqSuccess(
          editingFaqId ? "FAQ updated successfully!" : "FAQ created successfully!"
        );
        setFaqForm({ question: "", answer: "", display_order: "0" });
        setEditingFaqId(null);
        void fetchFaqs();
      } else {
        setFaqError(data.error?.message || "Failed to save FAQ");
      }
    } catch {
      setFaqError("Failed to connect to server");
    } finally {
      setFaqSubmitting(false);
    }
  };

  const handleEditFaq = (faq: Faq) => {
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      display_order: String(faq.display_order),
    });
    setEditingFaqId(faq.id);
    setFaqError("");
    setFaqSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelFaqEdit = () => {
    setFaqForm({ question: "", answer: "", display_order: "0" });
    setEditingFaqId(null);
    setFaqError("");
    setFaqSuccess("");
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;

    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/faqs/${id}`,
        { method: "DELETE" }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (!response.ok) {
        setFaqError(
          await readApiError(response, "We couldn't delete this FAQ")
        );
        return;
      }

      const data = await response.json();
      if (data.success) {
        setFaqSuccess("FAQ deleted.");
        void fetchFaqs();
      } else {
        setFaqError(data.error?.message || "Failed to delete FAQ");
      }
    } catch {
      setFaqError("Failed to connect to server");
    }
  };

  const handleToggleFaq = async (id: string, current: boolean) => {
    try {
      const response = await adminWriteFetch(
        `${API_BASE_URL}/api/admin/faqs/${id}/toggle`,
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

      if (!response.ok) {
        setFaqError(
          await readApiError(response, "We couldn't update this FAQ")
        );
        return;
      }

      const data = await response.json();
      if (data.success) {
        void fetchFaqs();
      } else {
        setFaqError(data.error?.message || "Failed to update FAQ");
      }
    } catch {
      setFaqError("Failed to connect to server");
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Manage FAQs</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-5">
          {editingFaqId ? "Edit FAQ" : "Add New FAQ"}
        </h3>

        {faqError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{faqError}</span>
              <button
                type="button"
                onClick={fetchFaqs}
                disabled={faqsLoading}
                className="self-start text-sm font-semibold text-red-700 underline underline-offset-2 disabled:opacity-50"
              >
                {faqsLoading ? "Retrying..." : "Retry"}
              </button>
            </div>
          </div>
        )}
        {faqSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {faqSuccess}
          </div>
        )}

        <form onSubmit={handleCreateFaq} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={faqForm.question}
              onChange={(e) =>
                setFaqForm({ ...faqForm, question: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. How does the college predictor work?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={faqForm.answer}
              onChange={(e) =>
                setFaqForm({ ...faqForm, answer: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              placeholder="Add a clear, student-friendly answer."
            />
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={faqForm.display_order}
              onChange={(e) =>
                setFaqForm({ ...faqForm, display_order: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={faqSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {faqSubmitting
                ? editingFaqId
                  ? "Saving..."
                  : "Adding..."
                : editingFaqId
                  ? "Save FAQ"
                  : "Add FAQ"}
            </button>
            {editingFaqId && (
              <button
                type="button"
                onClick={handleCancelFaqEdit}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            All FAQs ({faqs.length})
          </h3>
        </div>

        {faqsLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <p>No FAQs added yet.</p>
            <p className="text-sm text-gray-500">
              Add your first FAQ above and it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-5 flex items-start justify-between gap-4 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-800">
                      {faq.question}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                      Order {faq.display_order}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        faq.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {faq.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {faq.answer}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEditFaq(faq)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleFaq(faq.id, faq.is_active)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      faq.is_active
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {faq.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
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
