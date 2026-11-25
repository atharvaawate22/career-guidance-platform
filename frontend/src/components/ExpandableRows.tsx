"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * Collapses the tail of a server-rendered list or table without removing it
 * from the HTML. Every row is still rendered on the server (so crawlers and
 * no-JS readers get all of it); this only toggles a data attribute that rows
 * marked with `group-data-[collapsed=true]:hidden` respond to.
 *
 * Deliberately NOT conditional rendering: rows added only after a click would
 * be invisible to search engines.
 */
export default function ExpandableRows({
  children,
  total,
  previewCount,
  itemLabel = "rows",
}: {
  children: ReactNode;
  total: number;
  previewCount: number;
  itemLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    // When collapsing from far down the list, bring the section back into view
    // so the reader isn't left staring at whatever sat below it.
    if (!next && ref.current && ref.current.getBoundingClientRect().top < 0) {
      ref.current.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  return (
    <div ref={ref} id={id} className="group" data-collapsed={expanded ? "false" : "true"}>
      {children}
      {total > previewCount && (
        <div className="flex justify-center px-4 py-3" style={{ borderTop: "1px solid var(--slate-100)" }}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={id}
            className="inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
            style={{ color: "var(--primary-600)" }}
          >
            {expanded ? `Show top ${previewCount} only` : `Show all ${total} ${itemLabel}`}
            <span aria-hidden="true" style={{ display: "inline-block", transform: expanded ? "rotate(180deg)" : "none" }}>
              ▾
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
