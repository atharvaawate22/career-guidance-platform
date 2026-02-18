"use client";

import { useEffect, useState } from "react";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [marginClass, setMarginClass] = useState("lg:ml-72");

  useEffect(() => {
    const updateMargin = () => {
      const sidebar = document.querySelector("[data-collapsed]");

      // If sidebar doesn't exist (e.g., admin login page), remove margin
      if (!sidebar) {
        setMarginClass("lg:ml-0");
        return;
      }

      // Check sidebar collapse state
      if (window.innerWidth >= 1024) {
        const isCollapsed = sidebar.getAttribute("data-collapsed") === "true";
        setMarginClass(isCollapsed ? "lg:ml-20" : "lg:ml-72");
      } else {
        setMarginClass("lg:ml-0");
      }
    };

    // Initial check
    updateMargin();

    // Watch for sidebar changes
    const observer = new MutationObserver(updateMargin);
    const sidebar = document.querySelector("[data-collapsed]");
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ["data-collapsed"],
      });
    }

    // Watch for window resize
    window.addEventListener("resize", updateMargin);

    // Check periodically in case sidebar appears/disappears (login/logout)
    const interval = setInterval(updateMargin, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMargin);
      clearInterval(interval);
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
