import type { Metadata } from "next";

export const metadata: Metadata = {
  // Year-neutral on purpose: the feed spans exam and CAP cycles (2027 exam
  // notices sit above the 2026 CAP archive), so a year here goes stale.
  title: "MHT-CET Updates & Official Notices — Exam Dates, CAP & Results",
  description:
    "Official MHT-CET notices in one place: exam dates, registration, admit cards, results, CAP round schedules and seat allotment, each linked to the State CET Cell PDF.",
  openGraph: {
    title: "MHT-CET Updates & Official Notices",
    description:
      "Official MHT-CET exam, registration, result and CAP notices, linked to the State CET Cell source.",
    url: "https://www.cethub.in/updates",
  },
  alternates: { canonical: "https://www.cethub.in/updates" },
};

export default function UpdatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
