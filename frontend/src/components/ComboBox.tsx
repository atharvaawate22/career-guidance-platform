"use client";

import { useState, useRef, useEffect } from "react";

interface ComboBoxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export default function ComboBox({
  id,
  value,
  onChange,
  options,
  placeholder = "Type to search...",
  maxLength,
  disabled = false,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value
    ? options
        .filter((o) => o.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 100)
    : options.slice(0, 100);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { setOpen(true); setFocused(true); }}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className="w-full py-2.5 px-3.5 text-sm transition-all rounded-lg"
        style={{
          background: disabled ? "var(--slate-100)" : "var(--bg-primary)",
          border: `1px solid ${focused ? "var(--primary-400)" : "var(--slate-200)"}`,
          outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
          color: disabled ? "var(--slate-400)" : "var(--slate-900)",
          cursor: disabled ? "not-allowed" : undefined,
        }}
      />

      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 overflow-y-auto max-h-80"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--slate-200)",
            borderRadius: ".5rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {filtered.map((opt) => {
            const isSel = opt === value;
            return (
              <div
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                  inputRef.current?.blur();
                }}
                className="px-3.5 py-2.5 cursor-pointer text-sm transition-colors"
                style={{
                  background: isSel ? "var(--primary-50)" : "transparent",
                  color: isSel ? "var(--primary-700)" : "var(--slate-900)",
                  fontWeight: isSel ? 600 : 400,
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--slate-50)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? "var(--primary-50)" : "transparent"; }}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
