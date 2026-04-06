"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { useAdminAuth } from "@/lib/useAdminAuth";
import AdminLogin from "@/components/admin/AdminLogin";
import DashboardTab from "@/components/admin/DashboardTab";
import UpdatesTab from "@/components/admin/UpdatesTab";
import BookingsTab from "@/components/admin/BookingsTab";
import FaqsTab from "@/components/admin/FaqsTab";
import ResourcesTab from "@/components/admin/ResourcesTab";
import GuidesTab from "@/components/admin/GuidesTab";


type TabType =
  | "dashboard"
  | "updates"
  | "bookings"
  | "faqs"
  | "resources"
  | "guides";

const TABS: { id: TabType; label: string }[] = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "updates", label: "📰 Updates" },
  { id: "bookings", label: "📅 Bookings" },
  { id: "faqs", label: "FAQ" },
  { id: "resources", label: "📄 Resources" },
  { id: "guides", label: "📚 Guides" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const {
    isLoggedIn,
    csrfToken,
    setCsrfToken,
    setIsLoggedIn,
    adminFetch,
    adminWriteFetch,
    fetchCsrfToken,
    handleSessionExpired,
    sessionExpiredMessage,
    setSessionExpiredMessage,
  } = useAdminAuth();

  if (!isLoggedIn) {
    return (
      <AdminLogin
        adminFetch={adminFetch}
        fetchCsrfToken={fetchCsrfToken}
        onLoginSuccess={(token) => {
          setCsrfToken(token);
          setIsLoggedIn(true);
          setSessionExpiredMessage("");
        }}
        initialError={sessionExpiredMessage}
      />
    );
  }

  const handleLogout = async () => {
    try {
      await adminWriteFetch(`${API_BASE_URL}/api/admin/logout`, {
        method: "POST",
      });
    } catch {
      // no-op
    }

    setIsLoggedIn(false);
    setCsrfToken("");
    setActiveTab("dashboard");
    window.dispatchEvent(new Event("adminAuthChange"));
  };

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
              onClick={handleLogout}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <nav className="flex gap-2 min-w-max whitespace-nowrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-4 font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === "dashboard" && (
          <DashboardTab
            adminFetch={adminFetch}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {activeTab === "updates" && (
          <UpdatesTab
            adminWriteFetch={adminWriteFetch}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {activeTab === "bookings" && (
          <BookingsTab
            adminFetch={adminFetch}
            adminWriteFetch={adminWriteFetch}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {activeTab === "faqs" && (
          <FaqsTab
            adminFetch={adminFetch}
            adminWriteFetch={adminWriteFetch}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {activeTab === "resources" && (
          <ResourcesTab
            adminWriteFetch={adminWriteFetch}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {activeTab === "guides" && (
          <GuidesTab
            adminFetch={adminFetch}
            adminWriteFetch={adminWriteFetch}
            onSessionExpired={handleSessionExpired}
          />
        )}
      </main>
    </div>
  );
}
