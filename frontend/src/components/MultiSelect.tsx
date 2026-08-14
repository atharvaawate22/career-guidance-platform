"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import { useDismissable } from "@/hooks/useDismissable";

type Opt = string | { value: string; label: string };

/** One-click bulk selection row pinned above the options (e.g. a branch family). */
export interface QuickGroup {
  label: string;
  values: string[];
}

interface Props {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: Opt[];
  placeholder?: string;
  disabled?: boolean;
  quickGroups?: QuickGroup[];
}

/**
 * Multi-value picker with search and optional bulk-select rows (Branch, City).
 *
 * Implements the ARIA multi-selectable listbox pattern. Before this it had no
 * ARIA and its options and quick-group rows were <div>s wired to onMouseDown,
 * so selecting a branch or city was impossible without a mouse — a WCAG 2.1
 * Level A failure (2.1.1 Keyboard) on the main filter of both the Cutoff
 * Explorer and the Predictor. Only the chip remove buttons were reachable,
 * which meant a keyboard user could unpick values but never pick them.
 *
 * Focus stays on the search input; the active row is tracked with
 * aria-activedescendant. Quick-group rows participate in the same arrow-key
 * sequence as the options (they occupy indices 0..groups.length-1) so Enter
 * works uniformly, and they are real <button>s so they are announced as
 * actionable.
 */
export default function MultiSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select options…",
  disabled = false,
  quickGroups,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const listboxId = `${baseId}-listbox`;

  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const labelByValue = new Map(normalized.map((o) => [o.value, o.label]));
  const filtered = search
    ? normalized.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) &&
          !value.includes(o.value),
      )
    : normalized.filter((o) => !value.includes(o.value));

  // Quick groups are hidden while searching — the user is after one specific
  // option at that point, not a bulk action.
  const visibleGroups =
    !search && quickGroups ? quickGroups.filter((g) => g.values.length > 0) : [];

  // Groups and options share one index space so a single pair of arrow keys
  // walks the whole popup in visual order.
  const rowCount = visibleGroups.length + filtered.length;

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  }, []);

  useDismissable(open, containerRef, close);

  // A narrowed list can invalidate the highlight, so reset it as the set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-row-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const toggleGroup = (group: QuickGroup) => {
    const allSelected = group.values.every((v) => value.includes(v));
    if (allSelected) {
      const drop = new Set(group.values);
      onChange(value.filter((v) => !drop.has(v)));
    } else {
      onChange(Array.from(new Set([...value, ...group.values])));
    }
  };

  /** Activate whichever row the shared index currently points at. */
  const commitRow = (index: number) => {
    if (index < 0) return;
    if (index < visibleGroups.length) {
      toggleGroup(visibleGroups[index]);
      return;
    }
    const opt = filtered[index - visibleGroups.length];
    if (opt) {
      toggle(opt.value);
      setSearch("");
    }
  };

  /**
   * Selecting anything changes which rows exist — `filtered` excludes values
   * already chosen, and a quick-group toggle moves many at once — so the old
   * index would point at a different option than the one just picked, and
   * aria-activedescendant would follow it there. Clearing the highlight is the
   * honest state: nothing is highlighted until the user moves again.
   *
   * The `[search]` effect cannot cover this: in the arrow-key flow `search` is
   * already "", so setting it to "" is not a state change and the effect never
   * re-runs.
   */
  const commitRowAndResetHighlight = (index: number) => {
    commitRow(index);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (open) {
        e.stopPropagation();
        close();
      }
      return;
    }

    // Backspace on an empty search removes the last chip — the conventional
    // shortcut for this control, and previously unavailable entirely.
    if (e.key === "Backspace" && search === "" && value.length > 0) {
      e.preventDefault();
      remove(value[value.length - 1]);
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

    if (rowCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1 >= rowCount ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? rowCount - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(rowCount - 1);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        commitRowAndResetHighlight(activeIndex);
      }
    } else if (e.key === "Tab") {
      close();
    }
  };

  const showList = open && !disabled && rowCount > 0;

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
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{
              background: "var(--primary-50)",
              color: "var(--primary-700)",
              border: "1px solid var(--primary-200)",
            }}
          >
            {labelByValue.get(v) ?? v}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(v);
              }}
              className="chip-remove leading-none ml-0.5 text-sm transition-colors"
              aria-label={`Remove ${labelByValue.get(v) ?? v}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={baseId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${baseId}-row-${activeIndex}` : undefined
          }
          value={search}
          placeholder={value.length === 0 ? placeholder : "Add more…"}
          autoComplete="off"
          onChange={(e) => {
            if (disabled) return;
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
          className="flex-1 outline-none bg-transparent text-sm"
          style={{
            color: "var(--slate-900)",
            minWidth: "7rem",
            caretColor: "var(--primary-600)",
          }}
        />
      </div>

      {showList && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={placeholder}
          ref={listRef}
          className="absolute z-50 w-full mt-1 overflow-y-auto max-h-64"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--slate-200)",
            borderRadius: ".5rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {visibleGroups.map((group, idx) => {
            const allSelected = group.values.every((v) => value.includes(v));
            return (
              // role="option", not <button>. A listbox may only contain
              // option/group children, so a real <button> here would be an
              // invalid ARIA structure and screen readers may skip or
              // misreport it. These rows behave like options anyway — they
              // toggle a whole family on and off — so aria-selected carries
              // exactly the right meaning.
              <div
                key={group.label}
                id={`${baseId}-row-${idx}`}
                role="option"
                aria-selected={allSelected}
                data-row-index={idx}
                data-active={idx === activeIndex}
                data-selected={allSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggleGroup(group);
                  setActiveIndex(-1);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className="listbox-group-action"
              >
                <span>
                  {group.label}{" "}
                  <span style={{ color: "var(--slate-500)", fontWeight: 400 }}>
                    ({group.values.length})
                  </span>
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--primary-600)" }}>
                  {allSelected ? "Clear" : "Select all"}
                </span>
              </div>
            );
          })}

          {visibleGroups.length > 0 && (
            <div aria-hidden="true" style={{ borderTop: "1px solid var(--slate-100)" }} />
          )}

          {filtered.map((opt, i) => {
            const idx = visibleGroups.length + i;
            return (
              <div
                key={opt.value}
                id={`${baseId}-row-${idx}`}
                data-row-index={idx}
                role="option"
                aria-selected={false}
                data-active={idx === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(opt.value);
                  setSearch("");
                  setActiveIndex(-1);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className="listbox-option"
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
