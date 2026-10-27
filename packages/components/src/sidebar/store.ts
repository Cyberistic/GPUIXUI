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
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
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
  /** The single source of truth. */
  readonly state: SubscriptionRef.SubscriptionRef<SidebarSnapshot>;
  /** The current value, for `useSyncExternalStore`. */
  readonly read: () => SidebarSnapshot;
  /** Register a subscriber; the returned function unregisters it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** The snapshot, re-emitted on every change. */
  readonly changes: Stream.Stream<SidebarSnapshot>;
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

    const state = yield* SubscriptionRef.make<SidebarSnapshot>({
      open,
      mobileOpen: false,
      tooltip: Option.none(),
    });
    const listeners = yield* Ref.make<ReadonlyArray<() => void>>(Arr.empty());

    const announce = Effect.fnUntraced(function* () {
      const current = yield* Ref.get(listeners);
      yield* Effect.sync(() => Arr.forEach(current, (listener) => listener()));
    });

    const write = Effect.fnUntraced(function* (next: SidebarSnapshot) {
      yield* SubscriptionRef.set(state, next);
      yield* announce();
    });

    const setOpen = Effect.fn("SidebarStore.setOpen")(function* (
      next: boolean,
    ) {
      const current = yield* SubscriptionRef.get(state);
      yield* write({ ...current, open: next });
      yield* preference.write(next);
    });

    const toggle = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(state);
      yield* setOpen(!current.open);
    });

    const setMobileOpen = Effect.fn("SidebarStore.setMobileOpen")(function* (
      next: boolean,
    ) {
      const current = yield* SubscriptionRef.get(state);
      yield* write({ ...current, mobileOpen: next });
    });

    const toggleMobile = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(state);
      yield* setMobileOpen(!current.mobileOpen);
    });

    const showTooltip = Effect.fn("SidebarStore.showTooltip")(function* (
      label: string,
    ) {
      const current = yield* SubscriptionRef.get(state);
      yield* write({ ...current, tooltip: Option.some(label) });
    });

    const hideTooltip = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(state);
      if (Option.isNone(current.tooltip)) return;
      yield* write({ ...current, tooltip: Option.none() });
    });

    const subscribe = (listener: () => void): (() => void) => {
      Effect.runSync(
        Ref.update(listeners, (current) => Arr.append(current, listener)),
      );
      return () => {
        Effect.runSync(
          Ref.update(listeners, (current) =>
            Arr.filter(current, (held) => held !== listener),
          ),
        );
      };
    };

    return {
      state,
      // `getUnsafe` is the read `useSyncExternalStore` needs: the value as it
      // stands, in the turn the write signalled.
      read: () => SubscriptionRef.getUnsafe(state),
      subscribe,
      changes: SubscriptionRef.changes(state),
      setOpen,
      toggle,
      setMobileOpen,
      toggleMobile,
      showTooltip,
      hideTooltip,
    };
  });

/** Run a store command from a React handler. */
export const send = (command: Effect.Effect<void>): void => {
  Effect.runFork(command);
};

/** The state a row's active and disabled look is read through. */
export const tooltipShown = (
  tooltip: Option.Option<string>,
  label: string,
): boolean =>
  pipe(
    tooltip,
    Option.exists((shown) => shown === label),
  );
