import type { Metadata } from "next";
import { CUTOFF_YEAR } from "@/lib/dataYear";

export const metadata: Metadata = {
  title: `MHT-CET ${CUTOFF_YEAR} College Predictor — Find Eligible Colleges by Percentile`,
  description:
    `Enter your MHT-CET ${CUTOFF_YEAR} percentile or rank to see safe, target, and dream college options across Maharashtra. Based on CAP Round I cutoffs.`,
  openGraph: {
    title: `MHT-CET ${CUTOFF_YEAR} College Predictor`,
    description:
      `Find colleges you can get into based on your MHT-CET ${CUTOFF_YEAR} percentile or rank.`,
    url: "https://www.cethub.in/predictor",
  },
  alternates: { canonical: "https://www.cethub.in/predictor" },
};

export default function PredictorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
