import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { CAP_SCHEDULE_YEAR } from "@/lib/dataYear";

const canonical = `${SITE_URL}/mht-cet-cap-2026-schedule`;
const title = `MHT-CET CAP ${CAP_SCHEDULE_YEAR} Schedule — Round Dates, Seat Allotment & Results`;
const description =
  `Live MHT-CET CAP ${CAP_SCHEDULE_YEAR} schedule: registration, merit list, and CAP Round 1, 2, 3 ` +
  `option form, seat allotment result dates, and seat acceptance deadlines. This page is updated ` +
  `directly as DTE Maharashtra revises dates or declares results — no need to search for a new post.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: canonical },
  alternates: { canonical },
};

export default function CapScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
