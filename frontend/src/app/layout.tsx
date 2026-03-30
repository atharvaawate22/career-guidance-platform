import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import ErrorTrackingBridge from "@/components/ErrorTrackingBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MHT-CET Career Hub — College Predictor, Cutoffs & Guidance",
  description:
    "All-in-one MHT-CET career guidance platform — predict colleges based on your percentile, explore 2025 cutoff data, book expert counseling sessions, and plan your engineering admission in Maharashtra.",
  keywords: [
    "MHT-CET",
    "college predictor",
    "MHT-CET cutoffs",
    "engineering admissions Maharashtra",
    "CAP round guidance",
    "career counseling",
    "MHT-CET 2025",
    "college admission",
  ],
  openGraph: {
    title: "MHT-CET Career Hub — College Predictor & Cutoff Explorer",
    description:
      "Predict colleges, explore cutoffs, and get expert guidance for MHT-CET engineering admissions in Maharashtra.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
          <Sidebar />
          <MainContent>{children}</MainContent>
        </div>
        <ErrorTrackingBridge />
      </body>
    </html>
  );
}
