import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MHT-CET 2025 College Predictor — Find Eligible Colleges by Percentile",
  description:
    "Enter your MHT-CET 2025 percentile or rank to see safe, target, and dream college options across Maharashtra. Based on CAP Round I cutoffs.",
  openGraph: {
    title: "MHT-CET 2025 College Predictor",
    description:
      "Find colleges you can get into based on your MHT-CET 2025 percentile or rank.",
    url: "https://mhtcetcareer.in/predictor",
  },
  alternates: { canonical: "https://mhtcetcareer.in/predictor" },
};

export default function PredictorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
