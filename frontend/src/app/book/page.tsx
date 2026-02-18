"use client";

import { useState } from "react";

export default function BookPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [meetLink, setMeetLink] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    student_name: "",
    email: "",
    phone: "",
    percentile: "",
    category: "",
    branch_preference: "",
    meeting_time: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            percentile: Number(formData.percentile),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setMeetLink(data.data.meet_link);
        // Reset form
        setFormData({
          student_name: "",
          email: "",
          phone: "",
          percentile: "",
          category: "",
          branch_preference: "",
          meeting_time: "",
        });
      } else {
        setError(data.message || "Failed to create booking");
      }
    } catch {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Specific validation for different fields
    if (name === "phone") {
      // Only allow digits, limit to 10 characters
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 10) {
        setFormData({ ...formData, [name]: cleaned });
      }
      return;
    }

    if (name === "student_name" || name === "branch_preference") {
      // Only allow letters, spaces, hyphens, and apostrophes
      const cleaned = value.replace(/[^a-zA-Z\s'-]/g, "");
      setFormData({ ...formData, [name]: cleaned });
      return;
    }

    if (name === "percentile") {
      // Validate percentile range
      const numValue = parseFloat(value);
      if (
        value === "" ||
        (!isNaN(numValue) && numValue >= 0 && numValue <= 100)
      ) {
        setFormData({ ...formData, [name]: value });
      }
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  if (success && meetLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto h-20 w-20 bg-linear-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="h-12 w-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4 bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600 mb-6">
              Your consultation has been scheduled successfully. A confirmation
              email has been sent to your inbox.
            </p>
            <div className="bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-600 font-medium mb-2">
                Google Meet Link:
              </p>
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 font-semibold hover:underline break-all"
              >
                {meetLink}
              </a>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.open(meetLink, "_blank")}
                className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Open Meet Link
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setMeetLink("");
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                Book Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Book a Consultation
          </h1>
          <p className="text-gray-600 text-lg">
            Schedule a one-on-one career guidance session with our expert
            counselors. Get personalized advice on college selection and
            admission strategies.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="student_name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={formData.student_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="your.email@gmail.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  pattern="[0-9]{10}"
                  minLength={10}
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="9876543210"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter 10-digit phone number
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Percentile <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="percentile"
                  required
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percentile}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="95.50"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="OPEN">OPEN</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Branch Preference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="branch_preference"
                  required
                  minLength={2}
                  maxLength={100}
                  value={formData.branch_preference}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Computer Engineering"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">
                  Meeting Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="meeting_time"
                  required
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Select a future date and time for your consultation (30
                  minutes)
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Scheduling..." : "Book Consultation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
