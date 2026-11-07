import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { sidebarStateJar, type SidebarPreference } from "./preference.js";

export interface SidebarSnapshot {
  readonly open: boolean;
  readonly mobileOpen: boolean;

  readonly tooltip: Option.Option<string>;
}

export interface SidebarStoreService {
  readonly local: LocalState<SidebarSnapshot>;

  readonly setOpen: (open: boolean) => Effect.Effect<void>;

  readonly toggle: Effect.Effect<void>;

  readonly setMobileOpen: (open: boolean) => Effect.Effect<void>;

  readonly toggleMobile: Effect.Effect<void>;

  readonly showTooltip: (label: string) => Effect.Effect<void>;

  readonly hideTooltip: Effect.Effect<void>;
}

export interface SidebarStoreOptions {
  readonly initialOpen?: boolean;

  readonly preference?: SidebarPreference;
}

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

export const tooltipShown = (
  tooltip: Option.Option<string>,
  label: string,
): boolean =>
  pipe(
    tooltip,
    Option.exists((shown) => shown === label),
  );
