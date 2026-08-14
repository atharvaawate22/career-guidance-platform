"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a popup when the user clicks outside it or presses Escape.
 *
 * CustomSelect, ComboBox and MultiSelect each carried their own byte-identical
 * copy of these two effects. Same behaviour, three places to fix a bug in —
 * and when the Escape handler was added to one it was not added to the others
 * consistently.
 *
 * Both listeners are attached only while `open`, so a page with a dozen of
 * these does not keep a dozen idle document listeners alive.
 *
 * @param onDismiss must be stable (useCallback) or the effect re-subscribes on
 *        every render.
 */
export function useDismissable(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, containerRef, onDismiss]);
}
