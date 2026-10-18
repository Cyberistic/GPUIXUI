/**
 * `root-single-child` / `root-wrapper` — the native app root keeps exactly one
 * child, and it is the last one.
 *
 * A fragment with two roots loses the earlier root: it is absent from the tree,
 * unpainted and unaddressable, while its host nodes stay retained. A wrapper
 * element keeps every sibling. Nothing warns, so this is the rule every
 * consumer's top-level tree sits on — and the reason a test fixture (or an app
 * shell) with two sibling roots must be wrapped.
 *
 * The probe measures both sides: the silent drop and the working wrapper.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { PlaygroundScenario } from "../types.js";

/** Two sibling roots at the app boundary. Only the last survives. */
export const RootTwoProbe = () => {
  const theme = useTheme();
  return (
    <>
      <div
        testId="root-first"
        style={{
          width: 120,
          height: 40,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text>first root (dropped)</text>
      </div>
      <div
        testId="root-last"
        style={{
          width: 200,
          height: 40,
          backgroundColor: theme.colors.background,
        }}
      >
        <text>last root survives</text>
      </div>
    </>
  );
};

/** One root element keeps both children. */
export const RootWrapperProbe = () => {
  const theme = useTheme();
  return (
    <div
      testId="root-wrap"
      style={{
        display: "flex",
        gap: 12,
        width: 320,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="wrap-left"
        style={{ width: 100, height: 40, backgroundColor: theme.colors.muted }}
      >
        <text>left</text>
      </div>
      <div
        testId="wrap-right"
        style={{
          width: 120,
          height: 40,
          backgroundColor: theme.colors.primary,
        }}
      >
        <text>right</text>
      </div>
    </div>
  );
};

/** Whether any painted run contains `needle`. */
const paintedContains = (
  runs: ReadonlyArray<string>,
  needle: string,
): boolean => Arr.some(runs, Str.includes(needle));

export const rootSingleChildScenario: PlaygroundScenario = {
  id: "root-single-child",
  title: "The app root keeps only its last child",
  capability: "root",
  view: () => <RootTwoProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const firstType = Option.fromNullishOr(
        ctx.host.elementType("root-first"),
      );
      yield* ctx.expectEqual(
        "the earlier root is not addressable",
        Option.isNone(firstType),
        true,
      );
      yield* ctx.expectEqual(
        "the earlier root paints nothing",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("root-first"))),
        true,
      );

      const painted = ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the dropped root's text is not painted",
        paintedContains(painted, "first root"),
        false,
      );
      yield* ctx.expectEqual(
        "only the last root's text is painted",
        paintedContains(painted, "last root survives"),
        true,
      );

      const last = yield* ctx.expectSome(
        "the last root paints",
        Option.fromNullishOr(ctx.host.bounds("root-last")),
      );
      yield* ctx.expectNear(
        "the surviving root is 200 wide",
        last.width,
        200,
        1,
      );
      yield* ctx.expectNear(
        "the surviving root starts at the origin x",
        last.x,
        0,
        1,
      );
      yield* ctx.expectNear(
        "the surviving root starts at the origin y",
        last.y,
        0,
        1,
      );

      const retained = yield* ctx.expectSome(
        "the runtime reports retained nodes",
        Option.fromNullishOr(ctx.host.retainedElements()),
      );
      yield* ctx.expectEqual(
        "the dropped root's host nodes are still retained",
        retained,
        6,
      );
    }),
};

export const rootWrapperScenario: PlaygroundScenario = {
  id: "root-wrapper",
  title: "One root element keeps every child",
  capability: "root",
  view: () => <RootWrapperProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const wrap = yield* ctx.expectSome(
        "the wrapper paints",
        Option.fromNullishOr(ctx.host.bounds("root-wrap")),
      );
      yield* ctx.expectNear("the wrapper is 320 wide", wrap.width, 320, 1);
      yield* ctx.expectNear("the wrapper is content-high", wrap.height, 40, 1);

      const left = yield* ctx.expectSome(
        "the left child paints",
        Option.fromNullishOr(ctx.host.bounds("wrap-left")),
      );
      const right = yield* ctx.expectSome(
        "the right child paints",
        Option.fromNullishOr(ctx.host.bounds("wrap-right")),
      );
      yield* ctx.expectNear(
        "the gap between the children",
        right.x - (left.x + left.width),
        12,
        1,
      );

      const painted = ctx.host.paintedText();
      yield* ctx.expectEqual(
        "the left child's text is painted",
        paintedContains(painted, "left"),
        true,
      );
      yield* ctx.expectEqual(
        "the right child's text is painted",
        paintedContains(painted, "right"),
        true,
      );

      const retained = yield* ctx.expectSome(
        "the runtime reports retained nodes",
        Option.fromNullishOr(ctx.host.retainedElements()),
      );
      yield* ctx.expectEqual("the wrapper keeps every host node", retained, 7);
    }),
};
