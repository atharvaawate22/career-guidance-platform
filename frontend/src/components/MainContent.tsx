"use client";

import { useEffect, useState } from "react";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [marginClass, setMarginClass] = useState("lg:ml-72");

  useEffect(() => {
    const updateMargin = (collapsed?: boolean) => {
      const sidebar = document.querySelector("[data-collapsed]");
      if (!sidebar || window.innerWidth < 1024) {
        setMarginClass("lg:ml-0");
        return;
      }
      const isCollapsed =
        typeof collapsed === "boolean"
          ? collapsed
          : sidebar.getAttribute("data-collapsed") === "true";
      setMarginClass(isCollapsed ? "lg:ml-20" : "lg:ml-72");
    };

    const onSidebarToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ collapsed: boolean }>;
      updateMargin(customEvent.detail?.collapsed);
    };

    const onResize = () => updateMargin();

    updateMargin();
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
      className={`flex-1 ${marginClass} transition-all duration-300 overflow-x-hidden`}
      id="main-content"
    >
      {children}
    </main>
  );
}
