import type { Metadata } from "next";
import { CUTOFF_YEAR } from "@/lib/dataYear";
import { CUTOFF_RECORDS_LABEL } from "@/lib/siteStats";

export const metadata: Metadata = {
  title: `MHT-CET ${CUTOFF_YEAR} Cutoff Explorer — ${CUTOFF_RECORDS_LABEL} Records by College & Branch`,
  description:
    `Search MHT-CET ${CUTOFF_YEAR} cutoff percentiles and ranks by college, branch, category, and CAP round. Free, instant access to all Maharashtra engineering cutoffs.`,
  openGraph: {
    title: `MHT-CET ${CUTOFF_YEAR} Cutoff Explorer`,
    description:
      `Search cutoff data by college, branch, category, and round for MHT-CET ${CUTOFF_YEAR}.`,
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
