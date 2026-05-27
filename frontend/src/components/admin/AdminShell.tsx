"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import { AdminProvider, useAdmin } from "./AdminContext";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/* ── Responsive margin handler ──────────────────────────────────────────── */

function ResponsiveShellContent({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved === "true") setSidebarCollapsed(true);

    const handleToggle = (e: Event) => {
      setSidebarCollapsed((e as CustomEvent).detail.collapsed);
    };
    window.addEventListener("adminSidebarToggle", handleToggle);
    return () => window.removeEventListener("adminSidebarToggle", handleToggle);
  }, []);

  const marginLeft = isDesktop ? (sidebarCollapsed ? "72px" : "280px") : "0px";

  return (
    <div
      className="transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ marginLeft }}
    >
      {children}
    </div>
  );
}

/* ── Authenticated Admin Layout ─────────────────────────────────────────── */

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { adminWriteFetch } = useAdmin();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await adminWriteFetch(`${API_BASE_URL}/api/v1/admin/logout`, {
        method: "POST",
      });
    } catch {
      // Still logout on error
    }
    window.dispatchEvent(new Event("adminAuthChange"));
    toast({ title: "Signed out successfully", type: "info" });
    router.replace("/admin/login");
  }, [adminWriteFetch, router, toast]);

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <ResponsiveShellContent>
        <AdminTopBar
          onMenuClick={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
        />
        <main className="p-4 lg:p-8 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </ResponsiveShellContent>
    </div>
  );
}

/* ── AdminShell — switches between login and authenticated layout ───────── */

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  // Login page gets only the ToastProvider, no admin context or layout
  if (isLoginPage) {
    return (
      <ToastProvider>
        {children}
      </ToastProvider>
    );
  }

  // All other admin pages get the full layout
  return (
    <ToastProvider>
      <AdminProvider>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </AdminProvider>
    </ToastProvider>
  );
}
