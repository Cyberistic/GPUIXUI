/**
 * `window-layout` — the window is the layout root.
 *
 * Every desktop workspace sits on the window's paintable size: a shell folds its
 * sidebar and toolbar below a breakpoint, and a dialog's veil is sized from the
 * same number. `useWindowSize` is the only React-visible source for it (0.10.0
 * has no container query and no `onLayout`), so this probe measures the contract
 * those components rest on: the size the hook reports, the layout derived from
 * it, and a window-sized overlay placed at the origin.
 *
 * The live twin (`live-window`) reuses this exact view and changes the real
 * window's size with `zoomWindow`, which is where the observer and the reflow
 * are proven.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowInsets, useWindowSize } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";
import {
  TOOLBAR_HEIGHT,
  layoutFor,
  type WindowSize,
} from "./window-layout-model.js";

/** The edge shape both inset sets report, typed structurally. */
interface Edges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** `top,right,bottom,left`. */
const edges = (values: Edges): string =>
  `${values.top},${values.right},${values.bottom},${values.left}`;

/** The window's own size and the layout it selects, with a window-sized veil. */
export const WindowLayoutProbe = () => {
  const theme = useTheme();
  const size: WindowSize = useWindowSize();
  const insets = useWindowInsets();
  const layout = layoutFor(size);

  return (
    <div
      testId="wl-frame"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: size.width,
        height: size.height,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* The dialog-veil pattern: absolute, window-sized, painted first. */}
      <div
        testId="wl-veil"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size.width,
          height: size.height,
          backgroundColor: theme.colors.muted,
        }}
      />
      <div
        testId="wl-toolbar"
        style={{
          height: TOOLBAR_HEIGHT,
          flexShrink: 0,
          flexDirection: "row",
          gap: 12,
          padding: 8,
          backgroundColor: theme.colors.background,
        }}
      >
        <text testId="wl-size">{`${size.width}x${size.height}`}</text>
        <text testId="wl-mode">{`mode=${layout.mode}`}</text>
        <text testId="wl-insets">{`safe=${edges(insets.safeArea)} ime=${edges(insets.ime)}`}</text>
        <text testId="wl-actions">{`actions=${layout.actions}`}</text>
      </div>
      <div
        testId="wl-body"
        style={{
          flexGrow: 1,
          flexDirection: "row",
          backgroundColor: theme.colors.background,
        }}
      >
        {layout.sidebar > 0 ? (
          <div
            testId="wl-sidebar"
            style={{
              width: layout.sidebar,
              height: size.height - TOOLBAR_HEIGHT,
              backgroundColor: theme.colors.muted,
            }}
          >
            <text>sidebar</text>
          </div>
        ) : null}
        <div
          testId="wl-main"
          style={{ flexGrow: 1, height: size.height - TOOLBAR_HEIGHT }}
        >
          <text>main</text>
        </div>
      </div>
    </div>
  );
};

/** The text `testId` paints, or a failure naming the missing id. */
const textOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.text(testId)),
  );

export const windowLayoutScenario: PlaygroundScenario = {
  id: "window-layout",
  title: "The window is the layout root",
  capability: "window",
  view: () => <WindowLayoutProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const reported = ctx.host.windowSize();
      yield* ctx.expectEqual(
        "the hook reports the runner's window",
        yield* textOf(ctx, "wl-size"),
        `${reported.width}x${reported.height}`,
      );
      yield* ctx.expectEqual(
        "the reported window is the offscreen 1280x800",
        `${reported.width}x${reported.height}`,
        "1280x800",
      );
      yield* ctx.expectEqual(
        "the breakpoint is derived from the window",
        yield* textOf(ctx, "wl-mode"),
        "mode=wide",
      );
      yield* ctx.expectEqual(
        "the desktop insets are zero",
        yield* textOf(ctx, "wl-insets"),
        "safe=0,0,0,0 ime=0,0,0,0",
      );
      yield* ctx.expectEqual(
        "the wide layout shows six actions",
        yield* textOf(ctx, "wl-actions"),
        "actions=6",
      );

      const frame = yield* ctx.expectSome(
        "the frame paints",
        Option.fromNullishOr(ctx.host.bounds("wl-frame")),
      );
      yield* ctx.expectNear(
        "the frame is the window's width",
        frame.width,
        1280,
        1,
      );
      yield* ctx.expectNear(
        "the frame is the window's height",
        frame.height,
        800,
        1,
      );
      yield* ctx.expectNear("the frame starts at the origin", frame.x, 0, 1);

      const veil = yield* ctx.expectSome(
        "the window-sized veil paints",
        Option.fromNullishOr(ctx.host.bounds("wl-veil")),
      );
      yield* ctx.expectNear(
        "the veil is the window's width",
        veil.width,
        1280,
        1,
      );
      yield* ctx.expectNear(
        "the veil is the window's height",
        veil.height,
        800,
        1,
      );
      yield* ctx.expectNear("the veil starts at the origin", veil.y, 0, 1);

      const toolbar = yield* ctx.expectSome(
        "the toolbar paints",
        Option.fromNullishOr(ctx.host.bounds("wl-toolbar")),
      );
      yield* ctx.expectNear(
        "the toolbar is the declared height",
        toolbar.height,
        36,
        1,
      );

      const sidebar = yield* ctx.expectSome(
        "the sidebar paints in the wide layout",
        Option.fromNullishOr(ctx.host.bounds("wl-sidebar")),
      );
      yield* ctx.expectNear(
        "the sidebar is the declared width",
        sidebar.width,
        240,
        1,
      );
      yield* ctx.expectNear(
        "the sidebar starts below the toolbar",
        sidebar.y,
        toolbar.y + toolbar.height,
        1,
      );
      yield* ctx.expectNear(
        "the sidebar ends at the window's bottom",
        sidebar.y + sidebar.height,
        frame.y + frame.height,
        1,
      );

      ctx.host.advance(600);
      yield* ctx.expectEqual(
        "the poll re-reads without changing the layout",
        yield* textOf(ctx, "wl-size"),
        "1280x800",
      );
      yield* ctx.expectEqual(
        "the re-read keeps the breakpoint",
        yield* textOf(ctx, "wl-mode"),
        "mode=wide",
      );
    }),
};
