"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import { useDismissable } from "@/hooks/useDismissable";

interface ComboBoxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Free-text input with a filtered suggestion list (the College filter).
 *
 * Implements the ARIA 1.2 combobox-with-listbox-popup pattern. Before this it
 * had no ARIA at all and its options were plain <div>s wired to onMouseDown, so
 * the suggestion list was reachable only with a mouse — a keyboard or screen
 * reader user could type into the field but could never select a college. That
 * is a WCAG 2.1 Level A failure (2.1.1 Keyboard) on one of the site's primary
 * filters. Modelled on CustomSelect, which already had most of this.
 *
 * Focus stays on the input throughout; the active option is communicated via
 * aria-activedescendant rather than by moving focus (the standard approach for
 * this pattern, and the reason the options need no tabIndex).
 */
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const filtered = value
    ? options
        .filter((o) => o.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 100)
    : options.slice(0, 100);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useDismissable(open, containerRef, close);

  // Reset the highlight whenever the filtered set changes, so the index can
  // never point past the end of a freshly narrowed list.
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (option: string) => {
    onChange(option);
    close();
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Only swallow Escape when it actually closed something, so it can still
      // reach an enclosing dialog otherwise.
      if (open) {
        e.stopPropagation();
        close();
      }
      return;
    }

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1 >= filtered.length ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if (e.key === "Enter") {
      // Only intercept Enter when an option is highlighted — otherwise let it
      // submit the surrounding form, which is what a free-text field should do.
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        commit(filtered[activeIndex]);
      }
    } else if (e.key === "Tab") {
      close();
    }
  };

  const showList = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${inputId}-opt-${activeIndex}` : undefined
        }
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => {
          setOpen(true);
          setFocused(true);
        }}
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

      {showList && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="College suggestions"
          ref={listRef}
          className="absolute z-50 w-full mt-1 overflow-y-auto max-h-80"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--slate-200)",
            borderRadius: ".5rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {filtered.map((opt, idx) => (
            <div
              key={opt}
              id={`${inputId}-opt-${idx}`}
              role="option"
              aria-selected={opt === value}
              data-selected={opt === value}
              data-active={idx === activeIndex}
              // onMouseDown, not onClick: mousedown fires before the input's
              // blur, so preventDefault keeps focus on the input and stops the
              // list closing out from under the click.
              onMouseDown={(e) => {
                e.preventDefault();
                commit(opt);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className="listbox-option"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
