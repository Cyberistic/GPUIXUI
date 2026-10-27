/**
 * The sidebar store: one Effect service holding the panel, the sheet and the
 * one tooltip that may be open.
 *
 * The state is a `SubscriptionRef`, so it has one source of truth and one
 * subscriber list; `read` and `subscribe` are the thin half
 * `useSyncExternalStore` needs, and every command is an `Effect` the provider
 * runs at the React boundary. A collapse writes shadcn's `sidebar_state`
 * preference, and a mount reads it back — which is why the state survives a
 * remount with no React state above it.
 *
 * Three values live here because they are one gesture's state:
 *
 * - `open` is the desktop panel, persisted;
 * - `mobileOpen` is the sheet, deliberately **not** persisted: a phone opens
 *   the sheet to navigate, and a window reopened with it covering the page
 *   would be a maze, not a preference;
 * - `tooltip` names the one icon-mode label that is showing, so two rows can
 *   never paint two tips and a suite can read which one opened.
 */

import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { sidebarStateJar, type SidebarPreference } from "./preference.js";

/** The three pieces of sidebar state, in one value so a write is atomic. */
export interface SidebarSnapshot {
  readonly open: boolean;
  readonly mobileOpen: boolean;
  /** The icon-mode tooltip showing, if any. The label is its own key. */
  readonly tooltip: Option.Option<string>;
}

/** What the store can do. */
export interface SidebarStoreService {
  /** The state and the one seam that binds it to React. */
  readonly local: LocalState<SidebarSnapshot>;
  /** Set the desktop panel and persist the choice. */
  readonly setOpen: (open: boolean) => Effect.Effect<void>;
  /** Flip the desktop panel. */
  readonly toggle: Effect.Effect<void>;
  /** Set the sheet. */
  readonly setMobileOpen: (open: boolean) => Effect.Effect<void>;
  /** Flip the sheet. */
  readonly toggleMobile: Effect.Effect<void>;
  /** Show the icon-mode tooltip whose label is `label`. */
  readonly showTooltip: (label: string) => Effect.Effect<void>;
  /** Close the icon-mode tooltip. */
  readonly hideTooltip: Effect.Effect<void>;
}

/** How a store is built. */
export interface SidebarStoreOptions {
  /**
   * The open state to start with. Omit it to read the preference; a caller that
   * passes it (a controlled `open`, or `defaultOpen`) wins over the stored
   * value for this mount.
   */
  readonly initialOpen?: boolean;
  /** Where the state is kept. Default {@link sidebarStateJar}. */
  readonly preference?: SidebarPreference;
}

/** Build one store. */
export const makeSidebarStore = (
  options?: SidebarStoreOptions,
): Effect.Effect<SidebarStoreService> =>
  Effect.gen(function* () {
    const preference = options?.preference ?? sidebarStateJar();
    const stored =
      options?.initialOpen === undefined
        ? yield* preference.read
        : Option.none<boolean>();
    const open = options?.initialOpen ?? Option.getOrElse(stored, () => true);

    const local = yield* makeLocalState<SidebarSnapshot>({
      open,
      mobileOpen: false,
      tooltip: Option.none(),
    });

    const setOpen = Effect.fn("SidebarStore.setOpen")(function* (
      next: boolean,
    ) {
      yield* local.write({ ...local.read(), open: next });
      yield* preference.write(next);
    });

    const toggle = Effect.gen(function* () {
      yield* setOpen(!local.read().open);
    });

    const setMobileOpen = Effect.fn("SidebarStore.setMobileOpen")(function* (
      next: boolean,
    ) {
      yield* local.write({ ...local.read(), mobileOpen: next });
    });

    const toggleMobile = Effect.gen(function* () {
      yield* setMobileOpen(!local.read().mobileOpen);
    });

    const showTooltip = Effect.fn("SidebarStore.showTooltip")(function* (
      label: string,
    ) {
      const current = local.read();
      if (Option.exists(current.tooltip, (shown) => shown === label)) return;
      yield* local.write({ ...current, tooltip: Option.some(label) });
    });

    const hideTooltip = Effect.gen(function* () {
      const current = local.read();
      if (Option.isNone(current.tooltip)) return;
      yield* local.write({ ...current, tooltip: Option.none() });
    });

    return {
      local,
      setOpen,
      toggle,
      setMobileOpen,
      toggleMobile,
      showTooltip,
      hideTooltip,
    };
  });

/** The state a row's active and disabled look is read through. */
export const tooltipShown = (
  tooltip: Option.Option<string>,
  label: string,
): boolean =>
  pipe(
    tooltip,
    Option.exists((shown) => shown === label),
  );
