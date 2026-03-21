"use client";

import { useState, useRef, useEffect } from "react";

type MultiSelectOption = string | { value: string; label: string };

interface MultiSelectProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
}

export default function MultiSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : option
  );

  const labelByValue = new Map(
    normalizedOptions.map((option) => [option.value, option.label])
  );

  const filtered = search
    ? normalizedOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(search.toLowerCase()) &&
          !value.includes(option.value)
      )
    : normalizedOptions.filter((option) => !value.includes(option.value));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggle = (opt: string) => {
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]
    );
  };

  const remove = (opt: string) => onChange(value.filter((v) => v !== opt));

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Tag display + search input */}
      <div
        className="min-h-11.5 w-full flex flex-wrap gap-1.5 items-center bg-white border border-gray-300 rounded-lg px-3 py-2 cursor-text transition-colors"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-sm font-medium"
          >
            {labelByValue.get(v) ?? v}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(v);
              }}
              className="text-purple-500 hover:text-purple-800 leading-none ml-0.5"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={search}
          placeholder={value.length === 0 ? placeholder : "Add more..."}
          autoComplete="off"
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-30 outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400"
          style={{ outline: "none" }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto max-h-63">
          {filtered.map((opt) => (
            <div
              key={opt.value}
              onMouseDown={(e) => {
                e.preventDefault();
                toggle(opt.value);
                setSearch("");
              }}
              className="px-4 py-2.5 cursor-pointer text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
