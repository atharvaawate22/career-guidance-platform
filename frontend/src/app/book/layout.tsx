import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Free Counseling Session — MHT-CET Career Guidance",
  description:
    "Schedule a free 30-minute one-on-one session with a MHT-CET counselor via Google Meet. Get personalised college selection and CAP round strategy advice.",
  openGraph: {
    title: "Book a Free MHT-CET Counseling Session",
    description:
      "Get personalised college selection advice from a MHT-CET expert. Free 30-minute Google Meet session.",
    url: "https://cethub.in/book",
  },
  alternates: { canonical: "https://cethub.in/book" },
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
