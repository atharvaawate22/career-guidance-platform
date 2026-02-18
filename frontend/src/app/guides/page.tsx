"use client";

import { useState, useEffect } from "react";

interface Guide {
  id: string;
  title: string;
  description: string;
  file_url: string;
  is_active: boolean;
  created_at: string;
}

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Download modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [downloadForm, setDownloadForm] = useState({
    name: "",
    email: "",
    percentile: "",
  });
  const [downloadError, setDownloadError] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/guides`
      );
      const data = await response.json();

      if (data.success) {
        setGuides(data.data);
      } else {
        setError("Failed to fetch guides");
      }
    } catch {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = (guide: Guide) => {
    setSelectedGuide(guide);
    setShowModal(true);
    setDownloadForm({ name: "", email: "", percentile: "" });
    setDownloadError("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedGuide(null);
    setDownloadForm({ name: "", email: "", percentile: "" });
    setDownloadError("");
  };

  // Validation handlers for download form
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow letters, spaces, hyphens, and apostrophes
    const cleaned = e.target.value.replace(/[^a-zA-Z\\s'-]/g, "");
    setDownloadForm({ ...downloadForm, name: cleaned });
  };

  const handlePercentileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseFloat(value);

    // Allow empty string or valid percentile (0-100)
    if (
      value === "" ||
      (!isNaN(numValue) && numValue >= 0 && numValue <= 100)
    ) {
      setDownloadForm({ ...downloadForm, percentile: value });
    }
  };

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGuide) return;

    setDownloading(true);
    setDownloadError("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/guides/download`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guide_id: selectedGuide.id,
            name: downloadForm.name,
            email: downloadForm.email,
            percentile: downloadForm.percentile
              ? parseFloat(downloadForm.percentile)
              : undefined,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.file_url) {
        // Open the file URL in a new tab
        window.open(data.file_url, "_blank");
        handleCloseModal();
      } else {
        setDownloadError(data.message || "Failed to process download");
      }
    } catch {
      setDownloadError("Error connecting to server");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
          <div className="text-xl font-semibold text-gray-700">
            Loading guides...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Admission Guides
          </h1>
          <p className="text-gray-600 text-lg">
            Download comprehensive guides for MHT CET admissions. Enter your
            details to access our resources.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {guides.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-gray-200">
            <p className="text-gray-600">No guides available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <div
                key={guide.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-200"
              >
                <h3 className="text-xl font-semibold mb-3 text-gray-800">
                  {guide.title}
                </h3>
                <p className="text-gray-600 mb-4">{guide.description}</p>
                <button
                  onClick={() => handleDownloadClick(guide)}
                  className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Download Guide
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Download Modal */}
        {showModal && selectedGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Download: {selectedGuide.title}
              </h2>

              {downloadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {downloadError}
                </div>
              )}

              <form onSubmit={handleDownloadSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={downloadForm.name}
                    onChange={handleNameChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={downloadForm.email}
                    onChange={(e) =>
                      setDownloadForm({
                        ...downloadForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    Percentile (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={downloadForm.percentile}
                    onChange={handlePercentileChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your percentile"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={downloading}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={downloading}
                    className="flex-1 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {downloading ? "Processing..." : "Download"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
