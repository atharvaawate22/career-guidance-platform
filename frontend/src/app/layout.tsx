import type { Metadata } from "next";
import "./globals.css";
import ErrorTrackingBridge from "@/components/ErrorTrackingBridge";
import PublicShell from "@/components/PublicShell";
import { inter, dmSerif, jetbrainsMono } from "@/lib/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cethub.in"),
  title: "MHT-CET Career Hub — College Predictor, Cutoffs & Guidance",
  description:
    "All-in-one MHT-CET career guidance platform — predict colleges based on your percentile, explore 2025 cutoff data, book expert counseling sessions, and plan your engineering admission in Maharashtra.",
  keywords: [
    "MHT-CET", "college predictor", "MHT-CET cutoffs",
    "engineering admissions Maharashtra", "CAP round guidance",
    "career counseling", "MHT-CET 2025", "college admission",
  ],
  openGraph: {
    title: "MHT-CET Career Hub — College Predictor & Cutoff Explorer",
    description:
      "Predict colleges, explore cutoffs, and get expert guidance for MHT-CET engineering admissions in Maharashtra.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSerif.variable} ${jetbrainsMono.variable} antialiased`}>
        <PublicShell>{children}</PublicShell>
        <ErrorTrackingBridge />
      </body>
    </html>
  );
}
