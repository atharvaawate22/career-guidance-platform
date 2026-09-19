import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { CAP_SCHEDULE_YEAR } from "@/lib/dataYear";

const canonical = `${SITE_URL}/mht-cet-cap-2026-schedule`;
const title = `MHT-CET CAP ${CAP_SCHEDULE_YEAR} Schedule — Round Dates, Seat Allotment & Cut-off Date`;
const description =
  `Complete MHT-CET CAP ${CAP_SCHEDULE_YEAR} schedule (archive): registration, merit list, option form, ` +
  `seat allotment result and seat acceptance dates for all four CAP rounds, and the final admission ` +
  `cut-off date. The ${CAP_SCHEDULE_YEAR} admission process has concluded.`;

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
