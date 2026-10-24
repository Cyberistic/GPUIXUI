/**
 * `shell-selection` — the entry a press reaches is the scenario the app opens.
 *
 * `shell-navigation` proves every registry entry is reachable (the list
 * scrolls). It presses none: the app's `selected` state, the header that reads
 * it and the stage that mounts `scenario.view()` had no check between them, so
 * a press could paint its highlight over a stage that never changed and the
 * whole suite would stay green — the playground broken for a human, the evidence
 * suite intact. This is the reverse guard, and it is measured in the renderer:
 *
 *   - the app opens on the registry's first entry: the header names it, its row
 *     paints the accent, and an entry no one has pressed paints the page;
 *   - the chosen scenario's own view is not mounted — its marker has no box;
 *   - a press on that row moves the header to its title and mounts its view,
 *     which is **live**, not a picture: a press into the field it owns types a
 *     value through to that scenario's own readout;
 *   - the selection moves to the pressed row and the row the app opened on
 *     returns to the page;
 *   - the palette switch repaints the shell — the root's fill and the selected
 *     row's accent both become the light palette's own roles — so the switch is
 *     a `ThemeProvider` re-render and not a repaint of the swatch alone.
 *
 * The keyboard half is the sidebar's roving contract: the open row is the
 * list's **only** tab stop, an arrow steps the cursor with a clamp, opens the
 * entry it lands on and carries the native focus with it, and a move to either
 * end reveals the row it opened. A sidebar of one stop per row cost a keyboard
 * reader a press per scenario to reach the stage, and no key moved between rows.
 *
 * The row has to be **revealed** before the press: the renderer keeps a scroll
 * offset per `testId`, so a list another scenario left scrolled can hold the row
 * outside the viewport (see `shell-nav.ts`).
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { App } from "../app.js";
import { palettes, type PaletteId } from "../palettes.js";
import { scenarios } from "./index.js";
import {
  SHELL_LIST,
  fillOf,
  focusTo,
  inside,
  navId,
  press,
  revealRow,
  textOf,
} from "./shell-nav.js";
import type { ScenarioBody } from "../types.js";

/** The registry entry a press opens, and the view its own scenario paints. */
export const SELECTION_TARGET = "input-edit";
/** A `testId` only the target's own view declares. */
export const TARGET_MARKER = "input-field";
/** The readout the target's view writes what it was typed into. */
export const TARGET_READOUT = "input-readout";
/** The palette the switch is pressed to, from the shell's own palette ids. */
export const TARGET_PALETTE: PaletteId = "light";

const paletteId = (palette: string): string => `theme-mode-${palette}`;

export const shellSelectionScenario: ScenarioBody = {
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const first = yield* ctx.expectSome(
        "the registry has an entry the app opens on",
        Arr.head(scenarios),
      );
      const target = yield* ctx.expectSome(
        "the entry a press opens is in the registry",
        Arr.findFirst(
          scenarios,
          (scenario) => scenario.id === SELECTION_TARGET,
        ),
      );
      yield* ctx.expectEqual(
        "pressing the entry would change the stage",
        target.id === first.id,
        false,
      );
      yield* ctx.expectEqual(
        "the two palettes paint different pages",
        palettes.dark.colors.background === palettes.light.colors.background,
        false,
      );

      const opened = yield* ctx.expectSome(
        "the shell paints its root",
        fillOf(ctx, "app-shell"),
      );
      yield* ctx.expectEqual(
        "the shell opens on the dark palette",
        opened,
        palettes.dark.colors.background,
      );
      yield* ctx.expectEqual(
        "the header names the scenario the app opens on",
        yield* ctx.expectSome(
          "the header paints its title",
          textOf(ctx, "app-title"),
        ),
        first.title,
      );
      yield* ctx.expectEqual(
        "the open row paints the accent",
        yield* ctx.expectSome(
          "the open row paints a fill",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.dark.colors.accent,
      );
      yield* ctx.expectEqual(
        "an unpressed row paints the page",
        yield* ctx.expectSome(
          "the unpressed row paints a fill",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.dark.colors.background,
      );
      yield* ctx.expectEqual(
        "the stage holds none of the pressed scenario yet",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds(TARGET_MARKER))),
        true,
      );

      const listed = yield* ctx.expectSome(
        "the sidebar paints its list",
        Option.fromNullishOr(ctx.host.bounds(SHELL_LIST)),
      );
      const revealed = yield* ctx.expectSome(
        "the entry a press opens is on screen",
        yield* revealRow(ctx, SHELL_LIST, navId(target.id)),
      );
      yield* ctx.expectEqual(
        "the revealed row sits inside the list",
        inside(listed, revealed),
        true,
      );

      press(ctx, navId(target.id));

      yield* ctx.expectEqual(
        "the header names the pressed scenario",
        yield* ctx.expectSome(
          "the header paints its title after the press",
          textOf(ctx, "app-title"),
        ),
        target.title,
      );
      const marker = yield* ctx.expectSome(
        "the pressed scenario's view is mounted",
        Option.fromNullishOr(ctx.host.bounds(TARGET_MARKER)),
      );
      yield* ctx.expectEqual(
        "the mounted view has a box",
        marker.width > 0 && marker.height > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the pressed row paints the accent",
        yield* ctx.expectSome(
          "the pressed row paints a fill",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.dark.colors.accent,
      );
      yield* ctx.expectEqual(
        "the row the app opened on returns to the page",
        yield* ctx.expectSome(
          "the retired row paints a fill",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.dark.colors.background,
      );

      press(ctx, TARGET_MARKER);
      ctx.host.key("g");
      yield* ctx.expectContains(
        "typing reaches the mounted scenario's own readout",
        yield* ctx.expectSome(
          "the mounted scenario paints its readout",
          textOf(ctx, TARGET_READOUT),
        ),
        "value=g",
      );

      press(ctx, paletteId(TARGET_PALETTE));

      yield* ctx.expectEqual(
        "the palette switch repaints the shell's root",
        yield* ctx.expectSome(
          "the shell root paints a fill after the switch",
          fillOf(ctx, "app-shell"),
        ),
        palettes.light.colors.background,
      );
      yield* ctx.expectEqual(
        "the selected row follows the palette",
        yield* ctx.expectSome(
          "the selected row paints a fill after the switch",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.light.colors.accent,
      );

      // The keyboard route: the sidebar is **one roving stop** — the row the app
      // has open — so a reader who never touches the pointer reaches it from the
      // palette and leaves the list in one more press. The arrows step the
      // cursor with a clamp and carry the native focus and the scroller with it,
      // the contract `focus-reveal-lifecycle` measured for the library's lists.
      // The palette press above left the focus on its own button.
      yield* ctx.expectEqual(
        "the palette press left the focus on that button",
        ctx.host.focused() === paletteId(TARGET_PALETTE),
        true,
      );
      yield* ctx.expectEqual(
        "the Tab walk reaches the row the app has open",
        yield* focusTo(ctx, navId(target.id)),
        true,
      );

      ctx.host.focusNext();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "one more Tab leaves the list for the stage",
        ctx.host.focused() === TARGET_MARKER,
        true,
      );
      ctx.host.focusPrevious();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "the step back returns to the list's one stop",
        ctx.host.focused() === navId(target.id),
        true,
      );
      ctx.host.focusPrevious();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "the open row is the list's only stop",
        ctx.host.focused() === paletteId("high"),
        true,
      );
      ctx.host.focusNext();
      ctx.host.advance(16);

      const targetIndex = yield* ctx.expectSome(
        "the pressed entry sits in the registry",
        Arr.findFirstIndex(scenarios, (scenario) => scenario.id === target.id),
      );
      const following = yield* ctx.expectSome(
        "the registry lists an entry after the pressed one",
        Option.fromNullishOr(scenarios[targetIndex + 1]),
      );

      ctx.host.key("down");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "an arrow opens the entry after the open one",
        yield* ctx.expectSome(
          "the header paints its title after the arrow",
          textOf(ctx, "app-title"),
        ),
        following.title,
      );
      yield* ctx.expectEqual(
        "the arrow's row paints the accent",
        yield* ctx.expectSome(
          "the arrow's row paints a fill",
          fillOf(ctx, navId(following.id)),
        ),
        palettes.light.colors.accent,
      );
      yield* ctx.expectEqual(
        "the row the arrow left returns to the page",
        yield* ctx.expectSome(
          "the row the arrow left paints a fill",
          fillOf(ctx, navId(target.id)),
        ),
        palettes.light.colors.background,
      );
      yield* ctx.expectEqual(
        "the native focus follows the cursor",
        ctx.host.focused() === navId(following.id),
        true,
      );
      yield* ctx.expectEqual(
        "the entry the cursor left is unmounted",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds(TARGET_MARKER))),
        true,
      );

      ctx.host.key("up");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "an arrow back opens the entry it came from",
        yield* ctx.expectSome(
          "the header paints its title after the arrow back",
          textOf(ctx, "app-title"),
        ),
        target.title,
      );

      // The list is taller than its box, so a move to either end owes the reader
      // the reveal the runtime does not do for free (`focus-reveal-lifecycle`).
      const listBox = yield* ctx.expectSome(
        "the sidebar paints its scroller",
        Option.fromNullishOr(ctx.host.bounds(SHELL_LIST)),
      );
      const last = yield* ctx.expectSome(
        "the registry has a last entry",
        Arr.last(scenarios),
      );
      const lastBefore = yield* ctx.expectSome(
        "the last row is painted off screen",
        Option.fromNullishOr(ctx.host.bounds(navId(last.id))),
      );
      yield* ctx.expectEqual(
        "the last row starts outside the list",
        inside(listBox, lastBefore),
        false,
      );

      ctx.host.key("end");
      ctx.host.advance(16);
      const lastAfter = yield* ctx.expectSome(
        "the last row is painted after End",
        Option.fromNullishOr(ctx.host.bounds(navId(last.id))),
      );
      yield* ctx.expectEqual(
        "End opens the last entry",
        yield* ctx.expectSome(
          "the header paints the last title",
          textOf(ctx, "app-title"),
        ),
        last.title,
      );
      yield* ctx.expectEqual(
        "End reveals the row it opened",
        inside(listBox, lastAfter),
        true,
      );

      ctx.host.key("home");
      ctx.host.advance(16);
      const firstAfter = yield* ctx.expectSome(
        "the first row is painted after Home",
        Option.fromNullishOr(ctx.host.bounds(navId(first.id))),
      );
      yield* ctx.expectEqual(
        "Home opens the first entry",
        yield* ctx.expectSome(
          "the header paints the first title",
          textOf(ctx, "app-title"),
        ),
        first.title,
      );
      yield* ctx.expectEqual(
        "Home reveals the row it opened",
        inside(listBox, firstAfter),
        true,
      );

      ctx.host.key("up");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "an arrow up at the first row keeps it",
        yield* ctx.expectSome(
          "the header still paints the first title",
          textOf(ctx, "app-title"),
        ),
        first.title,
      );
      yield* ctx.expectEqual(
        "the focus stays on the clamped row",
        ctx.host.focused() === navId(first.id),
        true,
      );

      // The palette's own keyboard route: the same walk backwards lands on the
      // first palette button.
      yield* ctx.expectEqual(
        "the walk back reaches the palette",
        yield* focusTo(ctx, paletteId("dark"), 10, true),
        true,
      );
      ctx.host.key("enter");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "Enter switches the palette it landed on",
        yield* ctx.expectSome(
          "the shell root paints a fill after Enter",
          fillOf(ctx, "app-shell"),
        ),
        palettes.dark.colors.background,
      );
      yield* ctx.expectEqual(
        "the selected row follows the palette back",
        yield* ctx.expectSome(
          "the selected row paints a fill after Enter",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.dark.colors.accent,
      );

      // Space is the shell's other activating key, and the runtime spells it
      // `space` — the name the library's own controls read, not the DOM's `" "`.
      // Enter alone would leave a rule that answers only half the pair green.
      ctx.host.focusNext();
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "the walk on from dark reaches the light palette",
        ctx.host.focused() === paletteId(TARGET_PALETTE),
        true,
      );
      ctx.host.key("space");
      ctx.host.advance(16);
      yield* ctx.expectEqual(
        "Space switches the palette it landed on",
        yield* ctx.expectSome(
          "the shell root paints a fill after Space",
          fillOf(ctx, "app-shell"),
        ),
        palettes.light.colors.background,
      );
      yield* ctx.expectEqual(
        "the selected row follows the palette after Space",
        yield* ctx.expectSome(
          "the selected row paints a fill after Space",
          fillOf(ctx, navId(first.id)),
        ),
        palettes.light.colors.accent,
      );
    }),
};
