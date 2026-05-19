import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MHT-CET 2025 Cutoff Explorer — 33,000+ Records by College & Branch",
  description:
    "Search MHT-CET 2025 cutoff percentiles and ranks by college, branch, category, and CAP round. Free, instant access to all Maharashtra engineering cutoffs.",
  openGraph: {
    title: "MHT-CET 2025 Cutoff Explorer",
    description:
      "Search cutoff data by college, branch, category, and round for MHT-CET 2025.",
    url: "https://mhtcetcareer.in/cutoffs",
  },
  alternates: { canonical: "https://mhtcetcareer.in/cutoffs" },
};

export default function CutoffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
