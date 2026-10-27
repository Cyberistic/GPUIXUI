/**
 * The sidebar store's one source of truth.
 *
 * The bugs these guard: a collapse that lands in the store but not the
 * preference (so a remount forgets it), a tooltip that stays open after its row
 * leaves, a subscriber that is not told in the turn of the write, and a mobile
 * sheet that is persisted as if it were the desktop choice.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { makeSidebarStore, tooltipShown } from "./store.js";
import type { SidebarPreference } from "./preference.js";

/** A preference held in one closure cell, so a write is observable. */
const remembered = (initial?: boolean): SidebarPreference => {
  let held = Option.fromNullishOr(initial);
  return {
    read: Effect.sync(() => held),
    write: (open) =>
      Effect.sync(() => {
        held = Option.some(open);
      }),
  };
};

describe("SidebarStore", () => {
  it.effect("starts from the stored preference when no state is passed", () =>
    Effect.gen(function* () {
      const store = yield* makeSidebarStore({
        preference: remembered(false),
      });
      expect(store.local.read().open).toBe(false);
    }),
  );

  it.effect("lets an explicit initial state win over the preference", () =>
    Effect.gen(function* () {
      const store = yield* makeSidebarStore({
        initialOpen: true,
        preference: remembered(false),
      });
      expect(store.local.read().open).toBe(true);
    }),
  );

  it.effect("persists a collapse and notifies its subscribers", () =>
    Effect.gen(function* () {
      const preference = remembered(true);
      const store = yield* makeSidebarStore({ preference });
      let notified = 0;
      const unsubscribe = store.local.subscribe(() => {
        notified += 1;
      });

      yield* store.setOpen(false);
      expect(store.local.read().open).toBe(false);
      expect(yield* preference.read).toEqual(Option.some(false));
      expect(notified).toBe(1);

      unsubscribe();
      yield* store.toggle;
      expect(store.local.read().open).toBe(true);
      expect(notified).toBe(1);
    }),
  );

  it.effect("keeps the sheet out of the preference", () =>
    Effect.gen(function* () {
      const preference = remembered(true);
      const store = yield* makeSidebarStore({ preference });
      yield* store.toggleMobile;
      expect(store.local.read().mobileOpen).toBe(true);
      expect(yield* preference.read).toEqual(Option.some(true));
      yield* store.setMobileOpen(false);
      expect(store.local.read().mobileOpen).toBe(false);
    }),
  );

  it.effect("holds one tooltip at a time and closes it", () =>
    Effect.gen(function* () {
      const store = yield* makeSidebarStore({
        initialOpen: false,
        preference: remembered(false),
      });
      yield* store.showTooltip("Models");
      expect(tooltipShown(store.local.read().tooltip, "Models")).toBe(true);
      yield* store.showTooltip("Settings");
      expect(tooltipShown(store.local.read().tooltip, "Models")).toBe(false);
      expect(tooltipShown(store.local.read().tooltip, "Settings")).toBe(true);
      yield* store.hideTooltip;
      expect(Option.isNone(store.local.read().tooltip)).toBe(true);
      // A second close is a no-op rather than a notification.
      let notified = 0;
      const unsubscribe = store.local.subscribe(() => {
        notified += 1;
      });
      yield* store.hideTooltip;
      expect(notified).toBe(0);
      unsubscribe();
    }),
  );
});
