import type { Metadata } from "next";

export const metadata: Metadata = {
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
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
