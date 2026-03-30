"use client";

import { useEffect } from "react";

const CLIENT_ERROR_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_CLIENT_ERROR_WEBHOOK_URL || "";

interface ClientErrorPayload {
  source: "frontend";
  level: "error";
  timestamp: string;
  environment: string;
  message: string;
  stack?: string;
  path: string;
  userAgent: string;
}

const sendClientError = (payload: ClientErrorPayload) => {
  if (!CLIENT_ERROR_WEBHOOK_URL) return;

  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(CLIENT_ERROR_WEBHOOK_URL, blob);
    return;
  }

  void fetch(CLIENT_ERROR_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Non-blocking diagnostics only.
  });
};

export default function ErrorTrackingBridge() {
  useEffect(() => {
    if (!CLIENT_ERROR_WEBHOOK_URL) return;

    const handleError = (event: ErrorEvent) => {
      sendClientError({
        source: "frontend",
        level: "error",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        message: event.message || "Unhandled window error",
        stack: event.error?.stack,
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";

      sendClientError({
        source: "frontend",
        level: "error",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        path: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
