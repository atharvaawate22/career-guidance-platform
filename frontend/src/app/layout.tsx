import type { Metadata } from "next";
import "./globals.css";
import ErrorTrackingBridge from "@/components/ErrorTrackingBridge";
import PublicShell from "@/components/PublicShell";
import StructuredData from "@/components/StructuredData";
import { inter, dmSerif, jetbrainsMono } from "@/lib/fonts";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  title: {
    default: "CET Hub — MHT-CET College Predictor, Cutoffs & Guidance",
    template: "%s | CET Hub",
  },
  description:
    "All-in-one MHT-CET guidance platform by CET Hub — predict colleges from your percentile or rank, explore 90,000+ 2025 CAP cutoff records across 300+ colleges, and book free expert counseling for Maharashtra engineering admissions.",
  keywords: [
    "MHT-CET",
    "MHT CET",
    "MHT CET PCM",
    "MHT-CET 2025",
    "MHT CET 2026",
    "MHT CET college predictor",
    "college predictor",
    "MHT CET cutoff",
    "MHT CET cutoffs 2025",
    "MHT CET percentile predictor",
    "engineering college predictor Maharashtra",
    "CAP round cutoff",
    "Maharashtra engineering admission",
    "MHT CET counselling",
    "DTE Maharashtra",
    "CET Hub",
    "cethub",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  category: "education",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    locale: "en_IN",
    title: "CET Hub — MHT-CET College Predictor, Cutoffs & Guidance",
    description:
      "Predict colleges, explore 90,000+ 2025 cutoff records, and get free expert guidance for MHT-CET engineering admissions in Maharashtra.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CET Hub — MHT-CET College Predictor & Cutoffs",
    description:
      "Predict colleges and explore MHT-CET 2025 cutoffs for Maharashtra engineering admissions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    // Drop your Search Console token into NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    // (Vercel env) to verify domain ownership — required before you can submit
    // the sitemap and track ranking in Google Search Console.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <PublicShell>{children}</PublicShell>
        <ErrorTrackingBridge />
        <StructuredData />
      </body>
    </html>
  );
}
