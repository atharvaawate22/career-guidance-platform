import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MHT-CET 2025 Cutoff Explorer — 90,000+ Records by College & Branch",
  description:
    "Search MHT-CET 2025 cutoff percentiles and ranks by college, branch, category, and CAP round. Free, instant access to all Maharashtra engineering cutoffs.",
  openGraph: {
    title: "MHT-CET 2025 Cutoff Explorer",
    description:
      "Search cutoff data by college, branch, category, and round for MHT-CET 2025.",
    url: "https://www.cethub.in/cutoffs",
  },
  alternates: { canonical: "https://www.cethub.in/cutoffs" },
};

export default function CutoffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
