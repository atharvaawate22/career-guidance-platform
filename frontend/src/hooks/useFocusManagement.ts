"use client";

import { useEffect, type RefObject } from "react";

/**
 * Selector for elements that can receive keyboard focus. `:not([disabled])`
 * and the negative-tabindex exclusion matter — a disabled button or a
 * programmatically-focusable-only element must not be a Tab stop.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // offsetParent is null for display:none subtrees; the rect check catches
    // zero-size elements such as the visually-hidden validation mirror inputs.
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

/**
 * Moves focus into a surface when it opens and returns it to whatever had
 * focus before when it closes.
 *
 * This is the half of dialog focus behaviour that BOTH modal and non-modal
 * surfaces need. Nothing in this repo implemented it: opening the chat widget,
 * a Modal or a SlideOver left focus behind on the page, so a keyboard user had
 * to Tab through the entire document to reach the thing that had just opened,
 * and on close was dumped back at the top of the page.
 */
export function useFocusOnOpen(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Captured now, not read in the cleanup: React nulls refs before running
    // effect cleanup on unmount, so containerRef.current is unreliable there.
    let container: HTMLElement | null = containerRef.current;

    // A macrotask's grace so the surface has actually rendered — both Modal and
    // SlideOver gate their content behind a `visible` transition flag.
    //
    // setTimeout, not requestAnimationFrame: rAF callbacks do not run while a
    // tab is not compositing (backgrounded, or a hidden preview pane), so an
    // rAF-based focus move silently never happened there and left the user on
    // whatever opened the surface. Timers still fire.
    const timer = setTimeout(() => {
      container = containerRef.current ?? container;
      const explicit = initialFocusRef?.current;
      // A disabled or detached target cannot take focus; fall through to the
      // container's first focusable rather than silently doing nothing.
      if (explicit && !explicit.hasAttribute("disabled") && explicit.isConnected) {
        explicit.focus();
        return;
      }
      if (container) focusableWithin(container)[0]?.focus();
    }, 0);

    return () => {
      clearTimeout(timer);
      // Restore focus unless the user has deliberately moved it somewhere else
      // — in that case yanking it back would be the disorienting behaviour.
      //
      // The test has to be "focus is on some OTHER real element", not "focus is
      // outside the container". useEffect cleanup runs after React has already
      // detached the surface from the DOM, so at this point focus has normally
      // fallen back to <body> and a contains() check would report every close
      // as an escape — which is exactly why focus used to end up nowhere.
      const activeEl = document.activeElement;
      const focusMovedElsewhere =
        !!activeEl &&
        activeEl !== document.body &&
        !!container &&
        !container.contains(activeEl);
      if (!focusMovedElsewhere && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

/**
 * Confines Tab / Shift+Tab to a container.
 *
 * Use ONLY for genuinely modal surfaces — ones that render a backdrop and lock
 * body scroll, where the rest of the page is inert by design (Modal,
 * SlideOver). Applying this to a non-modal surface such as the floating chat
 * panel would be actively harmful: with no backdrop the page behind stays
 * usable, so trapping focus would strand a keyboard user inside a widget they
 * never asked to be confined to. Those surfaces get useFocusOnOpen plus Escape
 * and nothing more.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusables = focusableWithin(container);
      if (focusables.length === 0) {
        // Nothing to focus — keep Tab inside rather than letting it escape to
        // the inert page behind.
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (!container.contains(activeEl)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}
