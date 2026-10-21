/**
 * `layout-flex` — flex layout, gaps and absolute positioning.
 *
 * Verifies the arithmetic the whole component library sits on: explicit widths
 * are exact, `gap` is the space between boxes, and `position: "absolute"`
 * resolves against the nearest positioned ancestor. Every assertion is a
 * measured bound within 1px, never a pixel of a screenshot.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { ScenarioBody } from "../types.js";

const LayoutProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="layout-root"
      style={{
        position: "relative",
        display: "flex",
        gap: 8,
        width: 640,
        height: 200,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="layout-a"
        style={{
          width: 200,
          height: 40,
          backgroundColor: theme.colors.primary,
        }}
      />
      <div
        testId="layout-b"
        style={{ width: 320, height: 40, backgroundColor: theme.colors.muted }}
      />
      <div
        testId="layout-abs"
        style={{
          position: "absolute",
          left: 24,
          top: 16,
          width: 60,
          height: 20,
          backgroundColor: theme.colors.success,
        }}
      />
    </div>
  );
};

export const layoutScenario: ScenarioBody = {
  view: () => <LayoutProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const root = yield* ctx.expectSome(
        "layout root painted",
        Option.fromNullishOr(ctx.host.bounds("layout-root")),
      );
      const a = yield* ctx.expectSome(
        "box a painted",
        Option.fromNullishOr(ctx.host.bounds("layout-a")),
      );
      const b = yield* ctx.expectSome(
        "box b painted",
        Option.fromNullishOr(ctx.host.bounds("layout-b")),
      );
      const absolute = yield* ctx.expectSome(
        "absolute box painted",
        Option.fromNullishOr(ctx.host.bounds("layout-abs")),
      );
      yield* ctx.expectNear("root width", root.width, 640, 1);
      yield* ctx.expectNear("box a width", a.width, 200, 1);
      yield* ctx.expectNear("box b width", b.width, 320, 1);
      yield* ctx.expectNear("gap between a and b", b.x - (a.x + a.width), 8, 1);
      yield* ctx.expectNear("absolute left", absolute.x - root.x, 24, 1);
      yield* ctx.expectNear("absolute top", absolute.y - root.y, 16, 1);
    }),
};
