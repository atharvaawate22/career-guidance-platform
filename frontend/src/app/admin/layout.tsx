import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - MHT-CET Career Guidance",
  description: "Admin dashboard for managing content and bookings",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
