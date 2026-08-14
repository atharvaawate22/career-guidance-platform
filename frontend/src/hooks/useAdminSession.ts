"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

/**
 * Whether an admin session is active, for deciding whether to show the Admin
 * link in the public navigation.
 *
 * Navbar and Sidebar each used to run their own copy of this effect, so every
 * public pageview fired TWO uncached `GET /api/v1/admin/session` requests to
 * the origin — for a link that is irrelevant to essentially every visitor. On
 * a free-tier backend that sleeps when idle, that is two cold-start-triggering
 * requests per view, spent on nothing.
 *
 * The hint below is the fix: the admin login/logout flow already dispatches an
 * `adminAuthChange` event, so it can also leave a flag in localStorage. Without
 * the flag we skip the network entirely, which covers 100% of real visitors.
 * With it, we verify against the server — the flag alone is never trusted to
 * grant anything, it only decides whether asking is worthwhile. Nothing here is
 * a security boundary: the Admin link is a convenience, and every admin route
 * and endpoint enforces auth server-side regardless.
 */
const ADMIN_HINT_KEY = "cethub_admin_hint";

function readHint(): boolean {
  try {
    return localStorage.getItem(ADMIN_HINT_KEY) === "1";
  } catch {
    // Private mode / storage disabled — fall back to not probing.
    return false;
  }
}

/** Called by the login and logout flows so the hint tracks reality. */
export function setAdminHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(ADMIN_HINT_KEY, "1");
    else localStorage.removeItem(ADMIN_HINT_KEY);
  } catch {
    // Best-effort; a missing hint only costs the Admin link, not access.
  }
}

export function useAdminSession(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  const check = useCallback(async () => {
    if (!readHint()) {
      setIsAdmin(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/session`, {
        credentials: "include",
      });
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      const authenticated = data.success && data.data?.authenticated === true;
      setIsAdmin(authenticated);
      // The session expired server-side — drop the hint so we stop asking.
      if (!authenticated) setAdminHint(false);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    void check();
    window.addEventListener("adminAuthChange", check);
    return () => window.removeEventListener("adminAuthChange", check);
  }, [check]);

  return isAdmin;
}
