"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { formatApiError, type ApiErrorPayload } from "@/lib/apiError";

interface AdminLoginProps {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  fetchCsrfToken: () => Promise<string | null>;
  onLoginSuccess: (csrfToken: string) => void;
  initialError?: string;
}

export default function AdminLogin({
  adminFetch,
  fetchCsrfToken,
  onLoginSuccess,
  initialError = "",
}: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(initialError);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await adminFetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as ApiErrorPayload;

      if (data.success) {
        const token = await fetchCsrfToken();
        if (!token) {
          setLoginError(
            "Could not initialize secure session. Please try again."
          );
          return;
        }

        setPassword("");
        window.dispatchEvent(new Event("adminAuthChange"));
        onLoginSuccess(token);
      } else {
        setLoginError(formatApiError(data, "Login failed", response.status));
      }
    } catch {
      setLoginError("Failed to connect to server");
    }
  };

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
