"use client";

import { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

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
  meeting_purpose: string;
  meeting_time: string;
  meet_link: string;
  booking_status: string;
  email_status: string;
  created_at: string;
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type TabType =
  | "dashboard"
  | "updates"
  | "bookings"
  | "faqs"
  | "resources"
  | "guides";

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

  // FAQs state
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

  const readApiError = async (
    response: Response,
    fallbackMessage: string
  ): Promise<string> => {
    try {
      const data = await response.json();
      return (
        data?.error?.message ||
        data?.message ||
        `${fallbackMessage} (HTTP ${response.status})`
      );
    } catch {
      return `${fallbackMessage} (HTTP ${response.status})`;
    }
  };

  // Resources state
  interface Resource {
    id: string;
    title: string;
    description: string;
    file_url: string;
    category: string;
    is_active: boolean;
    created_at: string;
  }
  const RESOURCE_CATEGORIES = [
    "Seat Matrix",
    "Previous Year Cutoffs",
    "Government Circulars",
    "Exam Guidelines",
    "Others",
  ];
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

  // Guides state
  interface Guide {
    id: string;
    title: string;
    description: string;
    file_url: string;
    is_active: boolean;
    created_at: string;
  }
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
  const [resourceUploading, setResourceUploading] = useState(false);

  // Guide downloads state
  interface GuideDownload {
    id: string;
    name: string;
    email: string;
    percentile: number | null;
    downloaded_at: string;
    guide_title: string;
  }
  const [downloads, setDownloads] = useState<GuideDownload[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  // Fetch data when logged in
  useEffect(() => {
    // Check localStorage for existing admin session
    const storedToken = localStorage.getItem("adminToken");
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
    }
  }, []);

  const handleSessionExpired = () => {
    localStorage.removeItem("adminToken");
    setToken("");
    setIsLoggedIn(false);
    setLoginError("Your session has expired. Please log in again.");
  };

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchUpdates();
      fetchBookings();
      fetchFaqs();
      fetchResources();
      fetchGuides();
      fetchDownloads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await fetch(`${API_BASE_URL}/api/updates`);
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
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
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
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const adminToken = data.data.token;
        setToken(adminToken);
        setIsLoggedIn(true);
        setPassword("");
        // Store token in localStorage for persistence
        localStorage.setItem("adminToken", adminToken);
        // Notify sidebar of auth change (same tab + cross-tab)
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("adminAuthChange"));
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
        ? `${API_BASE_URL}/api/admin/updates/${editingId}`
        : `${API_BASE_URL}/api/admin/updates`;

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
      const response = await fetch(`${API_BASE_URL}/api/admin/updates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
        `${API_BASE_URL}/api/admin/bookings/${id}/status`,
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
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const fetchFaqs = async () => {
    try {
      setFaqsLoading(true);
      setFaqError("");
      const response = await fetch(`${API_BASE_URL}/api/admin/faqs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      if (!response.ok) {
        setFaqError(
          await readApiError(
            response,
            "We couldn't load FAQs from the server"
          )
        );
        setFaqs([]);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setFaqs(data.data);
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

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError("");
    setFaqSuccess("");
    setFaqSubmitting(true);

    try {
      const url = editingFaqId
        ? `${API_BASE_URL}/api/admin/faqs/${editingFaqId}`
        : `${API_BASE_URL}/api/admin/faqs`;

      const response = await fetch(url, {
        method: editingFaqId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: faqForm.question,
          answer: faqForm.answer,
          display_order: Number(faqForm.display_order || 0),
        }),
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        setFaqError(
          await readApiError(response, "We couldn't save this FAQ")
        );
        return;
      }

      const data = await response.json();
      if (data.success) {
        setFaqSuccess(
          editingFaqId
            ? "FAQ updated successfully!"
            : "FAQ created successfully!"
        );
        setFaqForm({
          question: "",
          answer: "",
          display_order: "0",
        });
        setEditingFaqId(null);
        fetchFaqs();
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
    setActiveTab("faqs");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelFaqEdit = () => {
    setFaqForm({
      question: "",
      answer: "",
      display_order: "0",
    });
    setEditingFaqId(null);
    setFaqError("");
    setFaqSuccess("");
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        setFaqError(await readApiError(response, "We couldn't delete this FAQ"));
        return;
      }

      const data = await response.json();
      if (data.success) {
        setFaqSuccess("FAQ deleted.");
        fetchFaqs();
      } else {
        setFaqError(data.error?.message || "Failed to delete FAQ");
      }
    } catch {
      setFaqError("Failed to connect to server");
    }
  };

  const handleToggleFaq = async (id: string, current: boolean) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/faqs/${id}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !current }),
        }
      );

      if (response.status === 401) {
        handleSessionExpired();
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
        fetchFaqs();
      } else {
        setFaqError(data.error?.message || "Failed to update FAQ");
      }
    } catch {
      setFaqError("Failed to connect to server");
    }
  };

  const fetchResources = async () => {
    try {
      setResourcesLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/resources`);
      const data = await response.json();
      if (data.success) setResources(data.data);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setResourceError("");
    setResourceSuccess("");
    setResourceSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resourceForm),
      });
      const data = await response.json();
      if (data.success) {
        setResourceSuccess("Resource created successfully!");
        setResourceForm({
          title: "",
          description: "",
          file_url: "",
          category: "Seat Matrix",
        });
        fetchResources();
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
      const response = await fetch(
        `${API_BASE_URL}/api/admin/resources/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setResourceSuccess("Resource deleted.");
        fetchResources();
      } else {
        setResourceError(data.error?.message || "Failed to delete resource");
      }
    } catch {
      setResourceError("Failed to connect to server");
    }
  };

  const handleToggleResource = async (id: string, current: boolean) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/resources/${id}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !current }),
        }
      );
      const data = await response.json();
      if (data.success) fetchResources();
      else setResourceError(data.error?.message || "Failed to update resource");
    } catch {
      setResourceError("Failed to connect to server");
    }
  };

  const fetchGuides = async () => {
    try {
      setGuidesLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/guides`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setGuides(data.data);
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
      const response = await fetch(
        `${API_BASE_URL}/api/admin/guides/downloads`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await response.json();
      if (data.success) setDownloads(data.data);
    } catch (error) {
      console.error("Failed to fetch downloads:", error);
    } finally {
      setDownloadsLoading(false);
    }
  };

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuideError("");
    setGuideSuccess("");
    setGuideSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/guides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(guideForm),
      });
      const data = await response.json();
      if (data.success) {
        setGuideSuccess("Guide created successfully!");
        setGuideForm({ title: "", description: "", file_url: "" });
        fetchGuides();
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
      const response = await fetch(`${API_BASE_URL}/api/admin/guides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setGuideSuccess("Guide deleted.");
        fetchGuides();
      } else {
        setGuideError(data.error?.message || "Failed to delete guide");
      }
    } catch {
      setGuideError("Failed to connect to server");
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(
        "Only PDF and Word documents (.pdf, .doc, .docx) are allowed"
      );
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File size must be under 20 MB");
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const response = await fetch(
      `${API_BASE_URL}/api/admin/upload?bucket=${encodeURIComponent(bucket)}&filename=${encodeURIComponent(filename)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-file-content-type": file.type || "application/octet-stream",
        },
        body: file,
      }
    );

    // Gracefully handle non-JSON responses (e.g. HTML 404/502 from server)
    const text = await response.text();
    let data: {
      success: boolean;
      data?: { url: string };
      error?: { message?: string };
    };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Upload failed (${response.status}): server returned an unexpected response. ` +
          `Check that the backend is deployed and SUPABASE_SERVICE_ROLE_KEY is set correctly on Render.`
      );
    }

    if (!data.success) throw new Error(data.error?.message || "Upload failed");
    return data.data!.url;
  };

  const handleToggleGuide = async (id: string, current: boolean) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/guides/${id}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !current }),
        }
      );
      const data = await response.json();
      if (data.success) fetchGuides();
      else setGuideError(data.error?.message || "Failed to update guide");
    } catch {
      setGuideError("Failed to connect to server");
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
                // Notify sidebar of auth change (same tab + cross-tab)
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new Event("adminAuthChange"));
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
            <button
              onClick={() => setActiveTab("faqs")}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === "faqs"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === "resources"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              📄 Resources
            </button>
            <button
              onClick={() => setActiveTab("guides")}
              className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                activeTab === "guides"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              📚 Guides
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Total FAQs
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {faqs.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-sm font-bold text-cyan-700">
                    FAQ
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
                              <div className="text-gray-600">
                                Purpose:{" "}
                                <span className="font-semibold">
                                  {booking.meeting_purpose}
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

        {/* FAQs Tab */}
        {activeTab === "faqs" && (
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
                      setFaqForm({
                        ...faqForm,
                        display_order: e.target.value,
                      })
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
        )}

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Manage Resources
            </h2>

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
                        setResourceForm({
                          ...resourceForm,
                          title: e.target.value,
                        })
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
                        ...RESOURCE_CATEGORIES.map((c) => ({
                          value: c,
                          label: c,
                        })),
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
                          const url = await uploadFile(file, "resources");
                          setResourceForm((prev) => ({
                            ...prev,
                            file_url: url,
                          }));
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
                      setResourceForm({
                        ...resourceForm,
                        file_url: e.target.value,
                      })
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
                          onClick={() =>
                            handleToggleResource(r.id, r.is_active)
                          }
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
        )}

        {/* Guides Tab */}
        {activeTab === "guides" && (
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
                      setGuideForm({
                        ...guideForm,
                        description: e.target.value,
                      })
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
                      {guideUploading
                        ? "Uploading..."
                        : "Click to upload PDF / DOC"}
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
                          const url = await uploadFile(file, "guides");
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
                <div className="p-8 text-center text-gray-400">
                  No downloads yet.
                </div>
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
        )}
      </main>
    </div>
  );
}
