"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";

// Statically imported, the whole widget shipped in the shared client bundle to
// every visitor — including the large majority who never open it. It renders
// nothing above the fold and has no SEO value, so it loads on the client only,
// after the page is interactive.
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), {
  ssr: false,
});

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // Admin pages use their own AdminShell layout (no public nav/footer)
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-secondary)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
        style={{ background: "var(--bg-primary)", color: "var(--primary-700)" }}
      >
        Skip to content
      </a>
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
      <ChatWidget />
    </div>
  );
}
