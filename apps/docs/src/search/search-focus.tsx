import { useEffect } from "react";
import { isSearchShortcut, shouldReturnFocus } from "./focus";

/**
 * Returns focus to whatever opened the search palette (plan 506).
 *
 * Fumadocs opens a **controlled** Radix dialog, so there is no `DialogTrigger`
 * for Radix to restore to and Escape lands the reader on `<body>`. This listens
 * for the two ways the palette opens, watches the dialog leave, and moves focus
 * back only when the reader dismissed it — choosing a result navigates instead.
 * Renders nothing.
 */

const SEARCH_TRIGGER = "button[data-search], button[data-search-full]";

/** The palette, not any other dialog: it owns the combobox input. */
const searchDialog = (): Element | null =>
  document.querySelector('[role="dialog"] input[role="combobox"]');

const visibleTrigger = (): HTMLElement | null =>
  [
    ...document.querySelectorAll<HTMLElement>(
      "button[data-search-full], button[data-search]",
    ),
  ].find((trigger) => trigger.getClientRects().length > 0) ?? null;

export function SearchFocusRestore() {
  useEffect(() => {
    let returnTarget: HTMLElement | null = null;
    let dismissedByEscape = false;
    let wasOpen = searchDialog() !== null;

    const remember = (target: Element | null) => {
      returnTarget =
        target instanceof HTMLElement && target !== document.body
          ? target
          : null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (searchDialog() !== null) dismissedByEscape = true;
        return;
      }
      if (isSearchShortcut(event) && searchDialog() === null) {
        dismissedByEscape = false;
        remember(document.activeElement);
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest(SEARCH_TRIGGER);
      if (trigger === null) return;
      dismissedByEscape = false;
      remember(trigger);
    };

    const observer = new MutationObserver(() => {
      const open = searchDialog() !== null;
      if (open) {
        wasOpen = true;
        return;
      }
      if (
        shouldReturnFocus({
          wasOpen,
          open,
          dismissedByEscape,
        })
      ) {
        const target =
          returnTarget !== null && returnTarget.isConnected
            ? returnTarget
            : visibleTrigger();
        // Radix finishes its own close work first; then focus belongs back on
        // the control the reader used, never on the body.
        queueMicrotask(() => target?.focus());
      }
      wasOpen = false;
      dismissedByEscape = false;
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
