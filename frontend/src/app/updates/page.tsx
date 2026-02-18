"use client";

import { useEffect, useState } from "react";

interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchUpdates = async () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!apiBaseUrl) {
        setError("API base URL not configured");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/updates`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          // Sort by published_date in reverse chronological order
          const sortedUpdates = data.data.sort(
            (a: Update, b: Update) =>
              new Date(b.published_date).getTime() -
              new Date(a.published_date).getTime()
          );
          setUpdates(sortedUpdates);
          setError("");
        } else {
          setError("Invalid response format from backend");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch updates"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            CET Updates
          </h1>
          <p className="text-gray-600 text-lg">
            Stay updated with the latest MHT-CET news, notifications, and
            important dates.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
              <p className="text-gray-600 font-semibold">Loading updates...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        {!loading && !error && updates.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <p className="text-gray-600">No updates available.</p>
          </div>
        )}

        {!loading && !error && updates.length > 0 && (
          <div className="space-y-6">
            {updates.map((update) => (
              <div
                key={update.id}
                className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
              >
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  {update.title}
                </h2>
                <div className="text-sm mb-4 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-purple-600 rounded-full"></span>
                    <p className="text-gray-600">
                      Published: {formatDate(update.published_date)}
                    </p>
                  </div>
                  {update.edited_at && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                      <p className="text-amber-600 font-medium">
                        Edited: {formatDate(update.edited_at)}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {update.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
