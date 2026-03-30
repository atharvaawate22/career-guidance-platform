"use client";

import { useEffect, useState } from "react";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOffset, setSidebarOffset] = useState("0px");

  useEffect(() => {
    const applyOffsetFromRoot = () => {
      if (window.innerWidth < 1024) {
        setSidebarOffset("0px");
        return;
      }

      const fromRoot = document.documentElement.style
        .getPropertyValue("--sidebar-offset")
        .trim();
      setSidebarOffset(fromRoot || "18rem");
    };

    const onSidebarToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ offset?: string }>;
      const offset = customEvent.detail?.offset;
      if (window.innerWidth < 1024) {
        setSidebarOffset("0px");
      } else if (offset) {
        setSidebarOffset(offset);
      } else {
        applyOffsetFromRoot();
      }
    };

    const onResize = () => applyOffsetFromRoot();

    applyOffsetFromRoot();
    window.addEventListener("resize", onResize);
    window.addEventListener("sidebarToggle", onSidebarToggle as EventListener);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener(
        "sidebarToggle",
        onSidebarToggle as EventListener
      );
    };
  }, []);

  return (
    <main
      className="flex-1 w-full min-w-0 pt-16 sm:pt-20 lg:pt-0 transition-[margin] duration-300 overflow-x-hidden"
      style={{ marginLeft: sidebarOffset }}
      id="main-content"
    >
      {children}
    </main>
  );
}
