import { useEffect } from "react";
import {
  isSearchShortcut,
  shouldFocusDestination,
  shouldReturnFocus,
} from "./focus";

/**
 * Manages focus around the search palette (plan 506).
 *
 * Fumadocs opens a **controlled** Radix dialog, so there is no `DialogTrigger`
 * for Radix to restore to: Escape landed the reader on `<body>`, and choosing a
 * result left focus there while the destination page rendered. This listens for
 * the two ways the palette opens, watches the dialog leave, and then either
 * returns focus to the opener (Escape) or moves it to the start of the page a
 * chosen result opened. Renders nothing.
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

/** The focusable content region both layouts already expose to the skip link. */
const pageContent = (): HTMLElement | null =>
  document.querySelector<HTMLElement>("#nd-page, #main-content");

export function SearchFocusRestore() {
  useEffect(() => {
    let returnTarget: HTMLElement | null = null;
    let dismissedByEscape = false;
    let wasOpen = searchDialog() !== null;
    let pathAtOpen = location.pathname;
    let destinationTimer: ReturnType<typeof setTimeout> | null = null;

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

    // A chosen result navigates: the route updates after the dialog closes, and
    // the destination may render a frame later, so wait briefly for both.
    const focusDestination = (closedWasOpen: boolean) => {
      const deadline = performance.now() + 750;
      const attempt = () => {
        const changed = shouldFocusDestination({
          wasOpen: closedWasOpen,
          open: false,
          dismissedByEscape,
          pathChanged: location.pathname !== pathAtOpen,
        });
        const target = changed ? pageContent() : null;
        if (target !== null) {
          target.focus();
          return;
        }
        if (performance.now() < deadline) {
          destinationTimer = setTimeout(attempt, 50);
        }
      };
      attempt();
    };

    const observer = new MutationObserver(() => {
      const open = searchDialog() !== null;
      if (open) {
        if (destinationTimer !== null) {
          clearTimeout(destinationTimer);
          destinationTimer = null;
        }
        if (!wasOpen) pathAtOpen = location.pathname;
        wasOpen = true;
        return;
      }
      const closedWasOpen = wasOpen;
      if (closedWasOpen) {
        if (
          shouldReturnFocus({
            wasOpen: closedWasOpen,
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
        } else {
          focusDestination(closedWasOpen);
        }
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
      if (destinationTimer !== null) clearTimeout(destinationTimer);
    };
  }, []);

  return null;
}
