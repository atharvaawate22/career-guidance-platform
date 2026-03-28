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
        onFocus={() => setOpen(true)}
        disabled={disabled}
        className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto max-h-80">
          {filtered.map((opt) => (
            <div
              key={opt}
              onMouseDown={(e) => {
                // prevent input blur before click registers
                e.preventDefault();
                onChange(opt);
                setOpen(false);
                inputRef.current?.blur();
              }}
              className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                opt === value
                  ? "bg-purple-100 text-purple-700 font-medium"
                  : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
