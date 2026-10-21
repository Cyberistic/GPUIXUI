/**
 * `text-selection` — native text selection over the shipped `Text` primitive.
 *
 * Two claims the library makes and no suite measured: `selectable` (`userSelect:
 * "text"`) really lets the window select a line, and the default `select-text`-off
 * node really opts out. The probe drives the renderer's own `dragSelect`, because
 * selection listeners are registered during **paint**: a hand-rolled
 * down/move/up with no flush between the steps selects nothing, so a pointer
 * `drag` would pass or fail for reasons that have nothing to do with `Text`.
 *
 * What it means for the library: a log viewer, code block or message row can be
 * copied by dragging, and a toolbar or line-number gutter cannot be swept into
 * the clipboard.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Text, ThemeProvider } from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import type { ScenarioBody } from "../types.js";

/** The selectable line: a word the checks can name in a failure. */
const SELECTABLE = "hello selectable world";

/** The chrome line: it must never reach the clipboard. */
const CHROME = "chrome must not select";

const SelectionProbe = () => {
  const theme = useTheme();
  return (
    <ThemeProvider theme={palettes.dark}>
      <div
        testId="selection-probe"
        style={{
          width: 600,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text testId="selectable-line" selectable>
          {SELECTABLE}
        </Text>
        <Text testId="chrome-line">{CHROME}</Text>
      </div>
    </ThemeProvider>
  );
};

/** A point just inside the left edge of `testId`, at the middle of its line. */
const startOf = (bounds: Smoke.Bounds): Smoke.Offset => ({
  x: bounds.x + 2,
  y: bounds.y + bounds.height / 2,
});

/** A point past the right edge, so a partial first character is still included. */
const endOf = (bounds: Smoke.Bounds): Smoke.Offset => ({
  x: bounds.x + bounds.width + 4,
  y: bounds.y + bounds.height / 2,
});

const box = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.Bounds> => Option.fromNullishOr(ctx.host.bounds(testId));

export const textSelectionScenario: ScenarioBody = {
  view: () => <SelectionProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const selectable = yield* ctx.expectSome(
        "the selectable line is painted",
        box(ctx, "selectable-line"),
      );
      const chrome = yield* ctx.expectSome(
        "the chrome line is painted",
        box(ctx, "chrome-line"),
      );

      ctx.host.clearSelection();
      ctx.host.dragSelect(startOf(selectable), endOf(selectable));
      const selected = yield* ctx.expectSome(
        "a drag over the selectable line produces a selection",
        Option.fromNullishOr(ctx.host.selectedText()),
      );
      yield* ctx.expectContains(
        "the whole selectable line is selected",
        selected,
        SELECTABLE,
      );

      // The opt-out: dragging the same way over a default node must select
      // nothing, so a toolbar or gutter cannot be swept into the clipboard.
      ctx.host.clearSelection();
      yield* ctx.expectEqual(
        "clearing drops the selection",
        Option.isNone(Option.fromNullishOr(ctx.host.selectedText())),
        true,
      );
      ctx.host.dragSelect(startOf(chrome), endOf(chrome));
      yield* ctx.expectEqual(
        "a drag over the chrome line selects nothing",
        Option.isNone(Option.fromNullishOr(ctx.host.selectedText())),
        true,
      );
    }),
};
