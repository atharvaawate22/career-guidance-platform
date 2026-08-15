import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
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
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0zM9.5 10.5h5"
            />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--slate-900)" }}
        >
          Page not found
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--slate)" }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved —
          it could be an old link to a cutoff, college, or update that&apos;s no
          longer available.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-200"
            style={{ background: "var(--primary-600)" }}
          >
            Back to homepage
          </Link>
          <Link
            href="/cutoffs"
            className="px-5 py-2.5 rounded-xl font-semibold transition-colors"
            style={{ color: "var(--primary-600)" }}
          >
            Explore cutoffs
          </Link>
        </div>
      </div>
    </div>
  );
}
