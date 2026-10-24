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
    }),
};
