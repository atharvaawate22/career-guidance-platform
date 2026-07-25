import type { Metadata } from "next";
import { BOOKINGS_ENABLED } from "@/lib/features";

export const metadata: Metadata = BOOKINGS_ENABLED
  ? {
      title: "Book a Free Counseling Session — MHT-CET Career Guidance",
      description:
        "Schedule a free one-on-one session with a MHT-CET counselor via Google Meet. Get personalised college selection and CAP round strategy advice.",
      openGraph: {
        title: "Book a Free MHT-CET Counseling Session",
        description:
          "Get personalised college selection advice from a MHT-CET expert. Free Google Meet session.",
        url: "https://www.cethub.in/book",
      },
      alternates: { canonical: "https://www.cethub.in/book" },
    }
  : {
      title: "Booking Temporarily Unavailable — MHT-CET Career Guidance",
      description: "Counseling session bookings are temporarily paused. Check back soon.",
      robots: { index: false, follow: true },
    };

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
