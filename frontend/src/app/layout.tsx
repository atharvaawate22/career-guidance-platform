import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import ErrorTrackingBridge from "@/components/ErrorTrackingBridge";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <div className="flex min-h-screen" style={{ background: "var(--ice)" }}>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </div>
        <ErrorTrackingBridge />
      </body>
    </html>
  );
}
