import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MHT-CET Resources — Seat Matrix, Cutoffs & Government Circulars",
  description:
    "Download official MHT-CET resources: previous year cutoffs, seat matrices, government circulars, and exam guidelines — all in one place.",
  openGraph: {
    title: "MHT-CET Resources — Official Documents & Downloads",
    description:
      "Previous year cutoffs, seat matrices, and government circulars for MHT-CET admissions.",
    url: "https://mhtcetcareer.in/resources",
  },
  alternates: { canonical: "https://mhtcetcareer.in/resources" },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
