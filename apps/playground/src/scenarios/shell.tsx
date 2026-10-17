/**
 * `shell-navigation` — the playground's own sidebar is usable.
 *
 * The registry **is** the sidebar, so a scenario the sidebar cannot reach is a
 * scenario the app cannot open. The list is taller than the 720px window, and
 * before this scenario the sidebar had no scroller: every entry past the fold
 * was painted outside the window and unreachable.
 *
 * It mounts the real `App` and proves the list is a scroll container, that the
 * wheel moves it, and that the last entry ends up inside the list's bounds —
 * the regression guard is the first step, which sees `offset.y = 0` and an
 * off-list last entry without the `overflowY`. The scroll is a loop until the
 * offset stops changing, so adding a scenario cannot break the guard.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { palettes } from "../palettes.js";
import { scenarios } from "./index.js";
import type { PlaygroundScenario } from "../types.js";

const bounds = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.Bounds> => Option.fromNullishOr(ctx.host.bounds(testId));

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

const background = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.backgroundColor,
  );

/** The scenario with `id`, or a labelled failure naming the registry entry. */
const scenarioById = (ctx: Smoke.SmokeContext, id: string) =>
  ctx.expectSome(
    `the registry holds ${id}`,
    Arr.findFirst(scenarios, (scenario) => scenario.id === id),
  );

/** Asserts that the stage header names `expected`. */
const stageIs = (
  ctx: Smoke.SmokeContext,
  expected: PlaygroundScenario,
  label: string,
) => ctx.expectEqual(label, readout(ctx, "stage-title"), expected.title);

const offset = (ctx: Smoke.SmokeContext): Option.Option<Smoke.Offset> =>
  Option.fromNullishOr(ctx.host.scrollOffset("shell-nav-list"));

const STEP = 600;
const MAX_STEPS = 40;

/** Wheels to the end; stops as soon as an offset repeats. */
const scrollToEnd = (
  ctx: Smoke.SmokeContext,
  previous: Option.Option<Smoke.Offset>,
  remaining: number,
): Effect.Effect<Option.Option<Smoke.Offset>> =>
  remaining <= 0
    ? Effect.succeed(previous)
    : Effect.gen(function* () {
        ctx.host.wheel("shell-nav-list", 0, -STEP);
        ctx.host.advance(50);
        const current = offset(ctx);
        const stable = Option.exists(previous, (before) =>
          Option.exists(current, (after) => after.y === before.y),
        );
        return stable
          ? current
          : yield* scrollToEnd(ctx, current, remaining - 1);
      });

export const shellNavigationScenario: PlaygroundScenario = {
  id: "shell-navigation",
  title: "Playground shell: the scenario list scrolls",
  capability: "layout",
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const last = yield* ctx.expectSome(
        "the registry has a last scenario",
        Arr.last(scenarios),
      );
      const lastId = `nav-${last.id}`;

      const list = yield* ctx.expectSome(
        "the sidebar list is painted",
        bounds(ctx, "shell-nav-list"),
      );
      const before = yield* ctx.expectSome(
        "the last scenario is in the list",
        bounds(ctx, lastId),
      );
      yield* ctx.expectEqual(
        "the list starts at the top",
        Option.getOrElse(
          Option.map(
            Option.fromNullishOr(ctx.host.scrollOffset("shell-nav-list")),
            (offset) => offset.y,
          ),
          () => -1,
        ),
        0,
      );

      yield* scrollToEnd(ctx, Option.none(), MAX_STEPS);

      const scrolled = yield* ctx.expectSome(
        "the list reports a scroll offset",
        offset(ctx),
      );
      yield* ctx.expectEqual(
        "the wheel scrolled the list",
        scrolled.y < 0,
        true,
      );

      const after = yield* ctx.expectSome(
        "the last scenario after scrolling",
        bounds(ctx, lastId),
      );
      yield* ctx.expectEqual(
        "the last scenario moved up",
        after.y < before.y,
        true,
      );
      yield* ctx.expectEqual(
        "the last scenario is inside the list's bounds",
        after.y >= list.y && after.y + after.height <= list.y + list.height,
        true,
      );
    }),
};

/**
 * `shell-selection` — the shell's own navigation, keyboard contract and palette
 * switch.
 *
 * The registry is the sidebar, so selecting an entry must mount that scenario's
 * real view. This mounts the real `App` and drives it with native input: a click,
 * Enter on key down, Space on key up (and *not* on the down alone), and a palette
 * click that repaints the shell without losing the selection.
 */
export const shellSelectionScenario: PlaygroundScenario = {
  id: "shell-selection",
  title: "Playground shell: selection, keyboard and palette",
  capability: "layout",
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const first = yield* scenarioById(ctx, "layout-flex");
      const text = yield* scenarioById(ctx, "text-native");
      const input = yield* scenarioById(ctx, "input-edit");

      yield* ctx.expectSome(
        "the shell is painted",
        Option.fromNullishOr(ctx.host.bounds("app-shell")),
      );
      yield* stageIs(ctx, first, "the stage starts on the first scenario");

      ctx.host.click(`nav-${text.id}`);
      yield* stageIs(ctx, text, "clicking an entry switches the stage");
      yield* ctx.expectEqual(
        "the stage mounts the selected scenario's view",
        readout(ctx, "text-plain"),
        "hello gpuix",
      );
      yield* ctx.expectEqual(
        "the selected entry paints the accent surface",
        Option.getOrElse(background(ctx, `nav-${text.id}`), () => "none"),
        palettes.dark.colors.accent,
      );
      yield* ctx.expectEqual(
        "an unselected entry paints the shell surface",
        Option.getOrElse(background(ctx, `nav-${first.id}`), () => "none"),
        palettes.dark.colors.background,
      );

      ctx.host.keyDown(`nav-${input.id}`, "enter");
      yield* stageIs(ctx, input, "Enter on key down switches the stage");
      yield* ctx.expectEqual(
        "the keyboard-selected view is mounted",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.elementType("input-field")),
          () => "none",
        ),
        "input",
      );

      ctx.host.keyDown(`nav-${text.id}`, "space");
      yield* stageIs(ctx, input, "Space on key down alone does not activate");
      ctx.host.keyUp(`nav-${text.id}`, "space");
      yield* stageIs(ctx, text, "Space on key up switches the stage");

      ctx.host.keyDown(`nav-${input.id}`, "space");
      ctx.host.keyUp(`nav-${input.id}`, "space");
      yield* stageIs(ctx, input, "Space on key up selects the next entry");

      ctx.host.click("theme-mode-light");
      yield* ctx.expectEqual(
        "the palette switch repaints the shell",
        Option.getOrElse(background(ctx, "app-shell"), () => "none"),
        palettes.light.colors.background,
      );
      yield* stageIs(
        ctx,
        input,
        "the palette switch keeps the selected scenario",
      );
      yield* ctx.expectEqual(
        "the stage survives the provider re-render",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.elementType("input-field")),
          () => "none",
        ),
        "input",
      );
    }),
};
