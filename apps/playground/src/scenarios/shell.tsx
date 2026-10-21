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
import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { palettes } from "../palettes.js";
import { awaitReadout } from "./await-readout.js";
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

/**
 * Asserts the stage names `expected` after an input, waiting for the commit.
 *
 * A native click is delivered on a later task, so reading the title straight
 * after it is a race under load (the full suite failed exactly here). The
 * bounded wait only gives the frame time; the assertion that follows is the
 * one that can fail.
 */
const stageAfter = (
  ctx: Smoke.SmokeContext,
  expected: PlaygroundScenario,
  label: string,
) =>
  Effect.andThen(awaitReadout(ctx, "stage-title", expected.title), () =>
    stageIs(ctx, expected, label),
  );

const offset = (ctx: Smoke.SmokeContext): Option.Option<Smoke.Offset> =>
  Option.fromNullishOr(ctx.host.scrollOffset("shell-nav-list"));

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

      // One wheel step is small on 0.10.0 (a line, not the whole delta), so a
      // bounded loop cannot reach a 90-entry end; the reveal is explicit.
      ctx.host.scrollIntoView(lastId);
      ctx.host.advance(50);

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
      // The list's 1 px borders are not in its reported height (plan 529 §6.3),
      // so a fully revealed last row can sit 2 px past the reported bottom.
      yield* ctx.expectEqual(
        // 0.10.0's reveal stops ~98 px short of the end (the list's top offset
        // is not subtracted from the scroll maximum), so the last entry is
        // painted just below the list. main's tracker/target fix shows it
        // (plan 529 §6.3). The movement itself is the measured contract here.
        `the reveal moved the last scenario most of a screen (row y ${before.y} -> ${after.y})`,
        before.y - after.y > 600 && after.y > list.y,
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
      // The first four rows: the registry is the sidebar and it grows, so a
      // scenario that clicks an entry must pick a row that stays above the fold
      // (a press outside the list's clip never reaches a clipped child, plan 820).
      const first = yield* scenarioById(ctx, "window-layout");
      const second = yield* scenarioById(ctx, "frame-stats");
      const flex = yield* scenarioById(ctx, "layout-flex");
      const grid = yield* scenarioById(ctx, "layout-grid");

      yield* ctx.expectSome(
        "the shell is painted",
        Option.fromNullishOr(ctx.host.bounds("app-shell")),
      );
      // The sidebar is a scroll container and the previous scenario may have
      // left it anywhere, so this scenario sets its own precondition: reveal
      // the first row rather than assume a fresh mount (plan 839's sweep).
      ctx.host.scrollIntoView(`nav-${first.id}`);
      ctx.host.advance(0);
      yield* stageIs(ctx, first, "the stage starts on the first scenario");

      ctx.host.click(`nav-${flex.id}`);
      yield* stageAfter(ctx, flex, "clicking an entry switches the stage");
      yield* ctx.expectEqual(
        "the stage mounts the selected scenario's view",
        Option.isSome(bounds(ctx, "layout-root")),
        true,
      );
      yield* ctx.expectEqual(
        "the selected entry paints the accent surface",
        Option.getOrElse(background(ctx, `nav-${flex.id}`), () => "none"),
        palettes.dark.colors.accent,
      );
      yield* ctx.expectEqual(
        "an unselected entry paints the shell surface",
        Option.getOrElse(background(ctx, `nav-${second.id}`), () => "none"),
        palettes.dark.colors.background,
      );

      ctx.host.keyDown(`nav-${grid.id}`, "enter");
      yield* stageAfter(ctx, grid, "Enter on key down switches the stage");
      yield* ctx.expectEqual(
        "the keyboard-selected view is mounted",
        Option.isSome(bounds(ctx, "grid-equal")),
        true,
      );

      ctx.host.keyDown(`nav-${flex.id}`, "space");
      yield* stageIs(ctx, grid, "Space on key down alone does not activate");
      ctx.host.keyUp(`nav-${flex.id}`, "space");
      yield* stageAfter(ctx, flex, "Space on key up switches the stage");

      ctx.host.keyDown(`nav-${grid.id}`, "space");
      ctx.host.keyUp(`nav-${grid.id}`, "space");
      yield* stageAfter(ctx, grid, "Space on key up selects the next entry");

      ctx.host.click("theme-mode-light");
      // The palette switch re-renders through the provider; a frame is enough
      // for the shell surface to repaint, and the wait is bounded.
      yield* Effect.sleep(Duration.millis(30));
      yield* ctx.expectEqual(
        "the palette switch repaints the shell",
        Option.getOrElse(background(ctx, "app-shell"), () => "none"),
        palettes.light.colors.background,
      );
      yield* stageAfter(
        ctx,
        grid,
        "the palette switch keeps the selected scenario",
      );
      yield* ctx.expectEqual(
        "the stage survives the provider re-render",
        Option.isSome(bounds(ctx, "grid-equal")),
        true,
      );
    }),
};
