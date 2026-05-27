"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface AdminContextType {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>;
  handleSessionExpired: () => void;
  csrfToken: string;
  API_BASE_URL: string;
}

/* ── Context ────────────────────────────────────────────────────────────── */

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within <AdminProvider>");
  return ctx;
}

/* ── Provider ───────────────────────────────────────────────────────────── */

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [csrfToken, setCsrfToken] = useState("");

  const adminFetch = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, { ...init, credentials: "include" }),
    []
  );

  const adminWriteFetch = useCallback(
    (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (csrfToken) headers.set("x-csrf-token", csrfToken);
      return adminFetch(url, { ...init, headers });
    },
    [csrfToken, adminFetch]
  );

  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/csrf`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      const token = data?.data?.csrfToken as string | undefined;
      if (token) {
        setCsrfToken(token);
        return token;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const handleSessionExpired = useCallback(() => {
    setAuthenticated(false);
    setCsrfToken("");
    window.dispatchEvent(new Event("adminAuthChange"));
    router.replace("/admin/login");
  }, [router]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/session`);
        if (!res.ok) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        const data = await res.json();
        if (!data.success || data.data?.authenticated !== true) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        const token = await fetchCsrfToken();
        if (!token) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    };

    void checkSession();
  }, [adminFetch, fetchCsrfToken, router]);

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return null;
  }

  return (
    <AdminContext.Provider
      value={{ adminFetch, adminWriteFetch, handleSessionExpired, csrfToken, API_BASE_URL }}
    >
      {children}
    </AdminContext.Provider>
  );
}
