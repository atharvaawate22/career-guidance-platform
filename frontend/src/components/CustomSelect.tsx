"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import { useDismissable } from "@/hooks/useDismissable";

export interface SelectOption {
  value: string;
  label: string;
  /** Renders as a non-selectable group heading; keyboard navigation skips it. */
  heading?: boolean;
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputSize?: "sm" | "md";
}

export default function CustomSelect({
  id, value, onChange, options, placeholder = "Select…",
  required, className = "", inputSize = "md",
}: Props) {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const py = inputSize === "sm" ? "py-2 px-3" : "py-2.5 px-3.5";
  const w = className || "w-full";

  const computeDir = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setOpenAbove(window.innerHeight - r.bottom < 260 && r.top > window.innerHeight - r.bottom);
  }, []);

  // Walk from `from` in direction `dir` to the nearest selectable (non-heading)
  // option; -1 when none exists on that side.
  const nearestSelectable = useCallback((from: number, dir: 1 | -1) => {
    for (let i = from; i >= 0 && i < options.length; i += dir) {
      if (!options[i].heading) return i;
    }
    return -1;
  }, [options]);

  const openMenu = useCallback(() => {
    computeDir();
    setOpen(true);
    const selected = options.findIndex(o => !o.heading && o.value === value);
    setActiveIndex(selected >= 0 ? selected : nearestSelectable(0, 1));
  }, [computeDir, options, value, nearestSelectable]);

  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, containerRef, close);

  // Keep the active option scrolled into view as the user navigates.
  useEffect(() => {
    if (open && listRef.current && activeIndex >= 0) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const update = () => computeDir();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, computeDir]);

  const selected = options.find(o => o.value === value);

  // Keyboard operation: open with ↓/Enter/Space, move with ↑/↓/Home/End,
  // commit with Enter/Space, dismiss with Escape.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => { const n = nearestSelectable(i + 1, 1); return n === -1 ? i : n; }); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => { const n = nearestSelectable(i - 1, -1); return n === -1 ? i : n; }); }
    else if (e.key === "Home") { e.preventDefault(); setActiveIndex(nearestSelectable(0, 1)); }
    else if (e.key === "End") { e.preventDefault(); setActiveIndex(nearestSelectable(options.length - 1, -1)); }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.heading) { onChange(opt.value); setOpen(false); }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${w}`}>
      <button
        ref={buttonRef}
        type="button" id={buttonId} aria-haspopup="listbox" aria-expanded={open}
        aria-activedescendant={open && activeIndex >= 0 ? `${buttonId}-opt-${activeIndex}` : undefined}
        onClick={() => { if (open) setOpen(false); else openMenu(); }}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between ${py} text-left text-sm transition-all cursor-pointer`}
        style={{
          background: "var(--bg-primary)",
          border: `1px solid ${open ? "var(--primary-400)" : "var(--slate-200)"}`,
          borderRadius: ".5rem",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
          color: selected ? "var(--slate-900)" : "var(--slate-600)",
        }}>
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg className={`w-4 h-4 shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--slate-600)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div role="listbox" ref={listRef}
          className={`absolute z-50 w-full overflow-y-auto max-h-64 ${openAbove ? "bottom-full mb-1" : "top-full mt-1"}`}
          style={{ background: "var(--bg-primary)", border: "1px solid var(--slate-200)", borderRadius: ".5rem", boxShadow: "var(--shadow-lg)" }}>
          {options.map((opt, idx) => {
            if (opt.heading) {
              return (
                <div key={opt.value} aria-hidden="true"
                  className="listbox-heading"
                  style={{ borderTop: idx > 0 ? "1px solid var(--slate-100)" : "none" }}>
                  {opt.label}
                </div>
              );
            }
            const isSel = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <div key={opt.value} id={`${buttonId}-opt-${idx}`} role="option" aria-selected={isSel}
                data-selected={isSel} data-active={isActive}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className="listbox-option">
                {opt.label}
              </div>
            );
          })}
        </div>
      )}

      {required && (
        // Mirror input so the browser's native form validation still applies to
        // this custom control. It must stay focusable — Chrome refuses to
        // submit and logs "An invalid form control is not focusable" if
        // validation cannot focus the offending field — so onFocus bounces
        // straight to the real button, which is what the user can actually
        // operate. (Previously this carried pointer-events-none, leaving the
        // form silently unsubmittable when the field was empty.)
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          onFocus={() => buttonRef.current?.focus()}
          aria-hidden="true"
          className="absolute left-0 bottom-0 h-px w-px opacity-0"
        />
      )}
    </div>
  );
}
