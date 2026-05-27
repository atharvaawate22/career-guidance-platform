"use client";

import { useState, useRef, useEffect } from "react";

type Opt = string | { value: string; label: string };

interface Props {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: Opt[];
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelect({ id, value, onChange, options, placeholder = "Select options…", disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = options.map(o => typeof o === "string" ? { value: o, label: o } : o);
  const labelByValue = new Map(normalized.map(o => [o.value, o.label]));
  const filtered = (search
    ? normalized.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) && !value.includes(o.value))
    : normalized.filter(o => !value.includes(o.value)));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setSearch(""); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const remove = (v: string) => onChange(value.filter(x => x !== v));

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="min-h-[2.5rem] w-full flex flex-wrap gap-1.5 items-center px-3 py-2 transition-all"
        style={{
          background: disabled ? "var(--slate-100)" : "var(--bg-primary)",
          border: `1px solid ${open ? "var(--primary-400)" : "var(--slate-200)"}`,
          borderRadius: ".5rem",
          cursor: disabled ? "not-allowed" : "text",
          boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
        }}
        onClick={() => { if (disabled) return; setOpen(true); inputRef.current?.focus(); }}>

        {value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ background: "var(--primary-50)", color: "var(--primary-700)", border: "1px solid var(--primary-200)" }}>
            {labelByValue.get(v) ?? v}
            <button type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); remove(v); }}
              className="leading-none ml-0.5 text-sm transition-colors"
              style={{ color: "var(--primary-500)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--primary-700)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--primary-500)")}
              aria-label={`Remove ${v}`}>×</button>
          </span>
        ))}

        <input ref={inputRef} id={id} type="text" value={search}
          placeholder={value.length === 0 ? placeholder : "Add more…"}
          autoComplete="off"
          onChange={e => { if (disabled) return; setSearch(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
          className="flex-1 outline-none bg-transparent text-sm"
          style={{ color: "var(--slate-900)", minWidth: "7rem", caretColor: "var(--primary-600)" }} />
      </div>

      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 overflow-y-auto max-h-64"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--slate-200)", borderRadius: ".5rem", boxShadow: "var(--shadow-lg)" }}>
          {filtered.map(opt => (
            <div key={opt.value}
              onMouseDown={e => { e.preventDefault(); toggle(opt.value); setSearch(""); }}
              className="px-3.5 py-2.5 cursor-pointer text-sm transition-colors"
              style={{ color: "var(--slate-900)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--slate-50)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
