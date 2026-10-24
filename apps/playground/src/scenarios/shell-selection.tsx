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
 */
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { App } from "../app.js";
import { palettes, type PaletteId } from "../palettes.js";
import type { Smoke } from "@gpuixui/testing";
import { scenarios } from "./index.js";
import type { ScenarioBody } from "../types.js";

/** The registry entry a press opens, and the view its own scenario paints. */
export const SELECTION_TARGET = "input-edit";
/** The sidebar's scroller, whose offset is per `testId` and survives a mount. */
export const SHELL_LIST = "shell-nav-list";
/** A `testId` only the target's own view declares. */
export const TARGET_MARKER = "input-field";
/** The readout the target's view writes what it was typed into. */
export const TARGET_READOUT = "input-readout";
/** The palette the switch is pressed to, from the shell's own palette ids. */
export const TARGET_PALETTE: PaletteId = "light";

const navId = (id: string): string => `nav-${id}`;
const paletteId = (palette: string): string => `theme-mode-${palette}`;

/** One wheel's reach, and the most a reveal will take. */
const STEP = 400;
const MAX_STEPS = 40;

/** The fill the runtime reports for `testId`, or none when it is not painted. */
const fillOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    Option.flatMap((snapshot) => snapshot.backgroundColor),
  );

const textOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> => Option.fromNullishOr(ctx.host.text(testId));

/** Whether `row` sits wholly inside `list`'s box, so a press can hit it. */
const inside = (list: Smoke.Bounds, row: Smoke.Bounds): boolean =>
  row.y >= list.y && row.y + row.height <= list.y + list.height;

/**
 * Wheels the list until `rowId` is inside it, and answers the row's box.
 *
 * The renderer keeps a scroll offset per `testId`, so a list another scenario
 * (or another entry) left scrolled can hold the row anywhere — a press aimed at
 * a box outside the viewport hits whatever is painted there instead. A wheel
 * *positive* `deltaY` scrolls up, the opposite of the DOM.
 */
const revealRow = (
  ctx: Smoke.SmokeContext,
  listId: string,
  rowId: string,
  remaining: number,
): Effect.Effect<Option.Option<Smoke.Bounds>> =>
  Effect.gen(function* () {
    const list = Option.fromNullishOr(ctx.host.bounds(listId));
    const row = Option.fromNullishOr(ctx.host.bounds(rowId));
    if (Option.isNone(list) || Option.isNone(row)) return row;
    if (remaining <= 0 || inside(list.value, row.value)) return row;
    ctx.host.wheel(listId, 0, row.value.y < list.value.y ? STEP : -STEP);
    ctx.host.advance(50);
    return yield* revealRow(ctx, listId, rowId, remaining - 1);
  });

/** Presses `testId` and lets the commit paint before the next read. */
const press = (ctx: Smoke.SmokeContext, testId: string): void => {
  ctx.host.click(testId);
  ctx.host.advance(16);
};

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
        yield* revealRow(ctx, SHELL_LIST, navId(target.id), MAX_STEPS),
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
