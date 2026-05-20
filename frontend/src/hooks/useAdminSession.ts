"use client";

import { useCallback, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

interface ApiResponseError {
  code?: string;
  message?: string;
  requestId?: string;
}

interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  error?: ApiResponseError;
}

export function useAdminSession() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [loginError, setLoginError] = useState("");

  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/csrf`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
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
    setIsLoggedIn(false);
    setCsrfToken("");
    setLoginError("Your session has expired. Please log in again.");
    window.dispatchEvent(new Event("adminAuthChange"));
  }, []);

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

  const readApiError = async (
    response: Response,
    fallbackMessage: string
  ): Promise<string> => {
    try {
      const data = (await response.json()) as ApiErrorPayload;
      return formatApiError(data, fallbackMessage, response.status);
    } catch {
      return `${fallbackMessage} (HTTP ${response.status})`;
    }
  };

  const formatApiError = (
    data: ApiErrorPayload | null | undefined,
    fallbackMessage: string,
    status: number
  ) => {
    const code = data?.error?.code || `HTTP_${status}`;
    const message =
      data?.error?.message ||
      data?.message ||
      `${fallbackMessage} (HTTP ${status})`;
    const requestId = data?.error?.requestId;
    return requestId
      ? `${code}: ${message} (Ref: ${requestId})`
      : `${code}: ${message}`;
  };

  return {
    isLoggedIn,
    setIsLoggedIn,
    csrfToken,
    setCsrfToken,
    loginError,
    setLoginError,
    fetchCsrfToken,
    handleSessionExpired,
    adminFetch,
    adminWriteFetch,
    readApiError,
    formatApiError,
  };
}