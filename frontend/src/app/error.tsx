"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div
          className="mx-auto mb-6 flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: "var(--primary-50)" }}
        >
          <svg
            className="w-7 h-7"
            style={{ color: "var(--primary-600)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M12 9v3.75m0 3.75h.01M10.34 3.94l-7.4 12.82A1.5 1.5 0 004.24 19h15.52a1.5 1.5 0 001.3-2.24L13.66 3.94a1.5 1.5 0 00-2.6 0z"
            />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--slate-900)" }}
        >
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--slate)" }}>
          An unexpected error occurred while loading this page. You can try again,
          and if the problem persists please let us know.
        </p>
        {error.digest && (
          <p
            className="text-xs mb-6 tabular-nums"
            style={{ color: "var(--slate-light)", fontFamily: "var(--font-mono)" }}
          >
            Ref: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-200"
            style={{ background: "var(--primary-600)" }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-semibold transition-colors"
            style={{ color: "var(--primary-600)" }}
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
