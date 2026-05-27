"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";

export interface SelectOption { value: string; label: string; }

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
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const py = inputSize === "sm" ? "py-2 px-3" : "py-2.5 px-3.5";
  const w = className || "w-full";

  const computeDir = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setOpenAbove(window.innerHeight - r.bottom < 260 && r.top > window.innerHeight - r.bottom);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      const sel = listRef.current.querySelector("[data-selected='true']") as HTMLElement | null;
      if (sel) sel.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => computeDir();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, computeDir]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${w}`}>
      <button
        type="button" id={buttonId} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { if (!open) computeDir(); setOpen(p => !p); }}
        className={`w-full flex items-center justify-between ${py} text-left text-sm transition-all cursor-pointer`}
        style={{
          background: "var(--bg-primary)",
          border: `1px solid ${open ? "var(--primary-400)" : "var(--slate-200)"}`,
          borderRadius: ".5rem",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
          color: selected ? "var(--slate-900)" : "var(--slate-400)",
        }}>
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg className={`w-4 h-4 shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--slate-400)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div role="listbox" ref={listRef}
          className={`absolute z-50 w-full overflow-y-auto max-h-64 ${openAbove ? "bottom-full mb-1" : "top-full mt-1"}`}
          style={{ background: "var(--bg-primary)", border: "1px solid var(--slate-200)", borderRadius: ".5rem", boxShadow: "var(--shadow-lg)" }}>
          {options.map(opt => {
            const isSel = opt.value === value;
            return (
              <div key={opt.value} role="option" aria-selected={isSel} data-selected={isSel}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="px-3.5 py-2.5 cursor-pointer text-sm transition-colors"
                style={{
                  background: isSel ? "var(--primary-50)" : "transparent",
                  color: isSel ? "var(--primary-700)" : "var(--slate-900)",
                  fontWeight: isSel ? 600 : 400,
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--slate-50)"; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? "var(--primary-50)" : "transparent"; }}>
                {opt.label}
              </div>
            );
          })}
        </div>
      )}

      {required && (
        <input tabIndex={-1} required value={value} onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none" aria-hidden="true" />
      )}
    </div>
  );
}
