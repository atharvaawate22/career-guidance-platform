"use client";

import { useState, useEffect } from "react";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  "All",
  "Seat Matrix",
  "Previous Year Cutoffs",
  "Government Circulars",
  "Exam Guidelines",
  "Others",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Seat Matrix": "bg-blue-100 text-blue-700 border-blue-200",
  "Previous Year Cutoffs": "bg-purple-100 text-purple-700 border-purple-200",
  "Government Circulars": "bg-amber-100 text-amber-700 border-amber-200",
  "Exam Guidelines": "bg-green-100 text-green-700 border-green-200",
  "Others": "bg-gray-100 text-gray-700 border-gray-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  "Seat Matrix": "🏫",
  "Previous Year Cutoffs": "📊",
  "Government Circulars": "🏛️",
  "Exam Guidelines": "📋",
  "Others": "📄",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/resources`
      );
      const data = await response.json();
      if (data.success) {
        setResources(data.data);
      } else {
        setError("Failed to fetch resources.");
      }
    } catch {
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  const filteredResources =
    activeCategory === "All"
      ? resources
      : resources.filter((r) => r.category === activeCategory);

  // Count per category for tab badges
  const countFor = (cat: string) =>
    cat === "All"
      ? resources.length
      : resources.filter((r) => r.category === cat).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600" />
          <span className="text-xl font-semibold text-gray-700">
            Loading resources...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Resources
          </h1>
          <p className="text-gray-600 text-lg">
            Download seat matrices, previous year cutoffs, government circulars,
            and more — all in one place.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const count = countFor(cat);
            if (cat !== "All" && count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  activeCategory === cat
                    ? "bg-linear-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md"
                    : "bg-white/80 text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"
                }`}
              >
                {cat}
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeCategory === cat
                      ? "bg-white/30 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Resource cards */}
        {filteredResources.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">
              {activeCategory === "All"
                ? "No resources available yet. Check back soon!"
                : `No resources in the "${activeCategory}" category yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const colorClass =
                CATEGORY_COLORS[resource.category] ?? CATEGORY_COLORS["Others"];
              const icon =
                CATEGORY_ICONS[resource.category] ?? CATEGORY_ICONS["Others"];

              return (
                <div
                  key={resource.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-200 flex flex-col"
                >
                  {/* Category badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
                    >
                      <span>{icon}</span>
                      {resource.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(resource.created_at).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )}
                    </span>
                  </div>

                  {/* Title & description */}
                  <h3 className="text-lg font-bold text-gray-800 mb-2 leading-snug">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-5 flex-1">
                    {resource.description}
                  </p>

                  {/* Download button */}
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 px-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download PDF
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Info note */}
        {resources.length > 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            All resources are provided for reference purposes. Contact the
            counsellor if you need assistance interpreting the data.
          </p>
        )}
      </div>
    </div>
  );
}
