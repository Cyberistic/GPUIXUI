import { Effect } from "effect";
import * as Option from "effect/Option";
import { Text, ThemeProvider } from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import type { ScenarioBody } from "../types.js";

const SELECTABLE = "hello selectable world";

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

const startOf = (bounds: Smoke.Bounds): Smoke.Offset => ({
  x: bounds.x + 2,
  y: bounds.y + bounds.height / 2,
});

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
