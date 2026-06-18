"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // NOTE: This is obfuscation, NOT access control. `NEXT_PUBLIC_*` values are
  // compiled into the client bundle, so this "secret" is extractable by anyone
  // who inspects the JS. It only hides the login *page* (shows a fake 404) to
  // keep casual scanners away — the real security boundary is the backend
  // (`POST /api/v1/admin/login`: rate limiting + bcrypt + a strong password +
  // CSRF on mutations). Do not rely on this key to protect anything. See
  // SECURITY.md ("Admin login page obfuscation").
  const loginSecret = process.env.NEXT_PUBLIC_ADMIN_LOGIN_SECRET || "";
  const queryKey = searchParams.get("key") || "";

  // If the secret is configured, the URL must carry the matching ?key=...
  // Otherwise (e.g. in dev) the page renders normally.
  const isAuthorized = !loginSecret || queryKey === loginSecret;

  // Check if already logged in
  useEffect(() => {
    if (!isAuthorized) {
      setCheckingSession(false);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/session`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.authenticated) {
            router.replace("/admin/dashboard");
            return;
          }
        }
      } catch {
        // Not logged in
      } finally {
        setCheckingSession(false);
      }
    };
    void checkSession();
  }, [router, isAuthorized]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        window.dispatchEvent(new Event("adminAuthChange"));
        router.replace("/admin/dashboard");
      } else {
        setError(data.error?.message || data.message || "Invalid credentials");
      }
    } catch {
      setError("Failed to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If unauthorized (secret is set but url lacks key or has wrong key), display a fake 404 Not Found
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-slate-800" style={{ fontFamily: "var(--font-display)" }}>404</h1>
          <h2 className="text-xl font-semibold text-slate-400">Page Not Found</h2>
          <p className="text-slate-600 text-sm max-w-sm leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link href="/" className="inline-block mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            &larr; Back to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950">
        {/* Gradient Mesh Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900" />
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-teal-600/8 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        </div>

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <div className="mb-10 animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
              <span className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display)" }}>C</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)", lineHeight: 1.2 }}>
              CETHub
              <br />
              <span className="text-indigo-400">Admin Panel</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Manage your platform, monitor analytics, and control every aspect of the MHT-CET guidance experience.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 animate-fade-up-2">
            {["Analytics", "Content Management", "Booking Control", "Platform Settings"].map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 rounded-full text-sm font-medium bg-slate-800/60 text-slate-300 border border-slate-700/50 backdrop-blur-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-950 p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
              <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>C</span>
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              CETHub Admin
            </h1>
          </div>

          {/* Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-slate-400 text-sm">Sign in to access the admin dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="admin-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    minLength={5}
                    maxLength={100}
                    className="admin-input pl-11"
                    placeholder="admin@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="admin-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={100}
                    className="admin-input pl-11"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-6">
            Protected area. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
