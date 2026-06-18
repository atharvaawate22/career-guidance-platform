import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free MHT-CET Admission Guides — Download PDFs",
  description:
    "Download free comprehensive guides for MHT-CET CAP admissions: college preference lists, option form strategy, seat matrix analysis, and more.",
  openGraph: {
    title: "Free MHT-CET Admission Guides",
    description:
      "Download free PDF guides for MHT-CET CAP admissions — college lists, option forms, seat matrix, and more.",
    url: "https://www.cethub.in/guides",
  },
  alternates: { canonical: "https://www.cethub.in/guides" },
};

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
