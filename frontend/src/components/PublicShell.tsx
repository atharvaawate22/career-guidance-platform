"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // Admin pages use their own AdminShell layout (no public nav/footer)
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-secondary)" }}>
      <AnnouncementBanner />
      <Navbar />
      <main 
        className="flex-1 w-full min-w-0" 
        style={{ paddingTop: "calc(var(--navbar-height) + var(--banner-height, 0px))" }} 
        id="main-content"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
