"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    name: "Home",
    href: "/",
    icon: "🏠",
    description: "Dashboard",
  },
  {
    name: "Predictor",
    href: "/predictor",
    icon: "🎯",
    description: "College predictions",
  },
  {
    name: "Book Session",
    href: "/book",
    icon: "📅",
    description: "Career counseling",
  },
  {
    name: "Cutoffs",
    href: "/cutoffs",
    icon: "📊",
    description: "View cutoffs",
  },
  {
    name: "Guides",
    href: "/guides",
    icon: "📚",
    description: "Career guides",
  },
  {
    name: "Updates",
    href: "/updates",
    icon: "📰",
    description: "Latest news",
  },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  // Check if user is logged in as admin
  useEffect(() => {
    const checkAdminStatus = () => {
      // Check if localStorage is available (client-side only)
      if (typeof window !== "undefined") {
        const adminToken = localStorage.getItem("adminToken");
        setIsAdmin(!!adminToken);
      }
    };

    checkAdminStatus();

    // Listen for storage changes (login/logout events)
    window.addEventListener("storage", checkAdminStatus);

    // Also check periodically in case of same-tab updates
    const interval = setInterval(checkAdminStatus, 1000);

    return () => {
      window.removeEventListener("storage", checkAdminStatus);
      clearInterval(interval);
    };
  }, []);

  // Hide sidebar on admin login page (when not logged in)
  // Show sidebar everywhere else, including admin dashboard after login
  if (pathname === "/admin" && !isAdmin) {
    return null;
  }

  // Create dynamic nav items including admin dashboard if logged in
  // Only show Admin Panel link if logged in as admin AND not already on admin page
  const displayNavItems =
    isAdmin && pathname !== "/admin"
      ? [
          ...navItems,
          {
            name: "Admin Panel",
            href: "/admin",
            icon: "⚙️",
            description: "Dashboard",
          },
        ]
      : navItems;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Toggle menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isCollapsed ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-linear-to-br from-purple-600 via-purple-700 to-indigo-800 text-white transition-all duration-300 z-40 shadow-2xl ${
          isCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "w-72"
        }`}
        data-collapsed={isCollapsed}
      >
        <div className="flex flex-col h-full backdrop-blur-sm">
          {/* Logo/Header */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className={`${isCollapsed ? "hidden lg:hidden" : "block"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-linear-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                    🎓
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">MHT-CET</h1>
                    <p className="text-xs text-purple-200">Career Hub</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isCollapsed ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  )}
                </svg>
              </button>
            </div>
            {isCollapsed && (
              <div className="hidden lg:flex justify-center text-2xl mt-2">
                🎓
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6">
            <ul className="space-y-2 px-4">
              {displayNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        // Auto-collapse on mobile only
                        if (window.innerWidth < 1024) {
                          setIsCollapsed(true);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${
                        isActive
                          ? "bg-linear-to-r from-pink-500/30 to-purple-500/30 backdrop-blur-lg shadow-lg"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-pink-400 to-purple-300 rounded-r"></div>
                      )}
                      <span
                        className={`text-xl ${isActive ? "scale-110" : ""} transition-transform`}
                      >
                        {item.icon}
                      </span>
                      <div
                        className={`${isCollapsed ? "hidden lg:hidden" : "block"}`}
                      >
                        <div
                          className={`font-semibold text-sm ${isActive ? "text-white" : "text-purple-100"}`}
                        >
                          {item.name}
                        </div>
                        <div className="text-xs text-purple-300">
                          {item.description}
                        </div>
                      </div>
                      {isActive && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div
            className={`p-4 border-t border-white/20 ${isCollapsed ? "hidden lg:hidden" : "block"}`}
          >
            <div className="text-xs text-purple-200 text-center">
              <p className="font-semibold text-white">© 2026 MHT-CET</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
