"use client";

import { useState, useEffect } from "react";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Update {
  id: string;
  title: string;
  content: string;
  published_date: string;
  edited_at?: string;
}

interface Booking {
  id: string;
  student_name: string;
  email: string;
  phone: string;
  percentile: number;
  category: string;
  branch_preference: string;
  meeting_time: string;
  meet_link: string;
  booking_status: string;
  email_status: string;
  created_at: string;
}

type TabType = "dashboard" | "updates" | "bookings";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Updates state
  const [updates, setUpdates] = useState<Update[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  // Fetch data when logged in
  useEffect(() => {
    // Check localStorage for existing admin session
    const storedToken = localStorage.getItem("adminToken");
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchUpdates();
      fetchBookings();
    }
  }, [isLoggedIn, token]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const fetchUpdates = async () => {
    try {
      setUpdatesLoading(true);
      const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/api/updates`);
      const data = await response.json();
      if (data.success) {
        setUpdates(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch updates:", error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const response = await fetch(
        `${NEXT_PUBLIC_API_BASE_URL}/api/admin/bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(
        `${NEXT_PUBLIC_API_BASE_URL}/api/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const adminToken = data.data.token;
        setToken(adminToken);
        setIsLoggedIn(true);
        setPassword("");
        // Store token in localStorage for persistence
        localStorage.setItem("adminToken", adminToken);
        // Trigger storage event for sidebar update
        window.dispatchEvent(new Event("storage"));
      } else {
        setLoginError(data.message || "Login failed");
      }
    } catch {
      setLoginError("Failed to connect to server");
    }
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError("");
    setUpdateSuccess("");

    try {
      const url = editingId
        ? `${NEXT_PUBLIC_API_BASE_URL}/api/admin/updates/${editingId}`
        : `${NEXT_PUBLIC_API_BASE_URL}/api/admin/updates`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

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
        fetchUpdates();
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
    setActiveTab("updates");
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
      const response = await fetch(
        `${NEXT_PUBLIC_API_BASE_URL}/api/admin/updates/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setUpdateSuccess("Update deleted successfully!");
        fetchUpdates();
      } else {
        setUpdateError(data.error?.message || "Failed to delete update");
      }
    } catch {
      setUpdateError("Failed to connect to server");
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(
        `${NEXT_PUBLIC_API_BASE_URL}/api/admin/bookings/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setBookingSuccess("Booking status updated!");
        fetchBookings();
      } else {
        setBookingError(data.error?.message || "Failed to update status");
      }
    } catch {
      setBookingError("Failed to connect to server");
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    try {
      const response = await fetch(
        `${NEXT_PUBLIC_API_BASE_URL}/api/admin/bookings/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setBookingSuccess("Booking deleted successfully!");
        fetchBookings();
      } else {
        setBookingError(data.error?.message || "Failed to delete booking");
      }
    } catch {
      setBookingError("Failed to connect to server");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-linear-to-br from-purple-400 to-pink-400 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl">
              🔐
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-purple-200">MHT-CET Career Guidance Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-white font-medium"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                minLength={5}
                maxLength={100}
                className="w-full p-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
                placeholder="admin@mhtcet.local"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-white font-medium"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={100}
                className="w-full p-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full p-4 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            >
              Login to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl">
                ⚙️
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">MHT-CET Career Guidance</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setToken("");
                setActiveTab("dashboard");
                // Clear localStorage
                localStorage.removeItem("adminToken");
                // Trigger storage event for sidebar update
                window.dispatchEvent(new Event("storage"));
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>Logout</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === "dashboard"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab("updates")}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === "updates"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              📰 Updates
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === "bookings"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              📅 Bookings
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Dashboard Overview
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Total Updates
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {updates.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                    📰
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Total Bookings
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {bookings.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                    📅
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Pending Bookings
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {
                        bookings.filter((b) => b.booking_status === "pending")
                          .length
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">
                    ⏳
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recent Bookings
              </h3>
              {bookingsLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : bookings.length === 0 ? (
                <p className="text-gray-500">No bookings yet</p>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {booking.student_name}
                        </p>
                        <p className="text-sm text-gray-600">{booking.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {formatDateTime(booking.meeting_time)}
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                            booking.booking_status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : booking.booking_status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {booking.booking_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === "updates" && (
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
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                All Updates
              </h3>
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
                        <p>
                          Published: {formatDateTime(update.published_date)}
                        </p>
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
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Manage Bookings
            </h2>

            {bookingError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                {bookingSuccess}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {bookingsLoading ? (
                <p className="p-6 text-gray-500">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p className="p-6 text-gray-500">No bookings found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Meeting
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">
                              {booking.student_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">
                              {booking.email}
                            </div>
                            <div className="text-sm text-gray-600">
                              {booking.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-gray-600">
                                Percentile:{" "}
                                <span className="font-semibold">
                                  {booking.percentile}
                                </span>
                              </div>
                              <div className="text-gray-600">
                                Category:{" "}
                                <span className="font-semibold">
                                  {booking.category}
                                </span>
                              </div>
                              <div className="text-gray-600">
                                Branch:{" "}
                                <span className="font-semibold">
                                  {booking.branch_preference}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {formatDateTime(booking.meeting_time)}
                            </div>
                            <a
                              href={booking.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              Meeting Link
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={booking.booking_status}
                              onChange={(e) =>
                                handleUpdateBookingStatus(
                                  booking.id,
                                  e.target.value
                                )
                              }
                              className={`px-3 py-1 rounded-full text-xs font-semibold border-0 ${
                                booking.booking_status === "confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : booking.booking_status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
