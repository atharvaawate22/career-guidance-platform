"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

export function useAdminAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState("");

  // Keep a ref so adminWriteFetch stays stable without csrfToken as dep
  const csrfTokenRef = useRef(csrfToken);
  useLayoutEffect(() => {
    csrfTokenRef.current = csrfToken;
  });

  const adminFetch = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        credentials: "include",
      }),
    []
  );

  const adminWriteFetch = useCallback(
    (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (csrfTokenRef.current) {
        headers.set("x-csrf-token", csrfTokenRef.current);
      }
      return adminFetch(url, { ...init, headers });
    },
    [adminFetch]
  );

  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/csrf`, {
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
    setSessionExpiredMessage("Your session has expired. Please log in again.");
    window.dispatchEvent(new Event("adminAuthChange"));
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await adminFetch(`${API_BASE_URL}/api/admin/session`);
        if (!response.ok) {
          setIsLoggedIn(false);
          setCsrfToken("");
          return;
        }

        const token = await fetchCsrfToken();
        if (!token) {
          setIsLoggedIn(false);
          setCsrfToken("");
          return;
        }

        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
        setCsrfToken("");
      }
    };

    void initSession();
  }, [adminFetch, fetchCsrfToken]);

  return {
    isLoggedIn,
    setIsLoggedIn,
    csrfToken,
    setCsrfToken,
    sessionExpiredMessage,
    setSessionExpiredMessage,
    adminFetch,
    adminWriteFetch,
    fetchCsrfToken,
    handleSessionExpired,
  };
}
