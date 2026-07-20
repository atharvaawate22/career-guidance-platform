import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MHT-CET 2026 Updates & Announcements — Latest News",
  description:
    "Stay up to date with the latest MHT-CET 2026 announcements, CAP round schedules, seat allotment dates, and admission news.",
  openGraph: {
    title: "MHT-CET 2026 Updates & Announcements",
    description:
      "Latest MHT-CET 2026 news, CAP round schedules, and admission announcements.",
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
