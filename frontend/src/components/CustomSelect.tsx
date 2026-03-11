"use client";

import { useState, useRef, useEffect, useId } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
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
  id,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required,
  className = "",
  inputSize = "md",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const buttonId = id ?? generatedId;

  const paddingClass = inputSize === "sm" ? "px-3 py-2" : "px-4 py-3";
  // className controls width; default is w-full (callers can override with e.g. w-28)
  const widthClass = className || "w-full";

  // Close on outside click
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Scroll selected option into view when opened
  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector(
        "[data-selected='true']"
      ) as HTMLElement | null;
      if (selected) selected.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        id={buttonId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg ${paddingClass} text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors hover:border-gray-400 cursor-pointer`}
      >
        <span
          className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto max-h-63"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  isSelected
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                }`}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden input so native form required validation still works */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
