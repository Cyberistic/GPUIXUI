/**
 * `floating-placement` — how `<anchored>` places a panel.
 *
 * `@gpuix/react/floating`'s `FloatingLayer` is the only positioning engine the
 * library has: it renders a native `<anchored side align gap offset fit="snap"
 * snapMargin>` and does no React-side measurement. Popover, DropdownMenu,
 * ContextMenu and CommandMenu all sit on it, so the geometry has to be measured
 * once, here, instead of assumed in four components.
 *
 * The layer renders **inside** its anchor: the native anchored element measures
 * against its parent, not a trigger rect (upstream README, "Overlay menus").
 *
 * Measured on this host (plan `140` §4, plan `156` §8): `side`, `sideOffset`,
 * `align="start"`/`"end"` and the window-edge snap are exact. `align="center"`
 * is **not** centred — it aligns the panel's end to the anchor's centre line,
 * i.e. it is short by half the panel's own size on the cross axis
 * (`anchored.rs` wraps the layer in a full-height zero-width flex box *and*
 * positions it from the anchor point). The scenario pins that behaviour so a
 * fix upstream fails the check instead of silently changing every menu.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useWindowSize } from "@gpuix/react";
import type { StyleDesc } from "@gpuix/react";
import { FloatingLayer } from "@gpuix/react/floating";
import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const GAP = 6;
const COLLISION = 8;
const ANCHOR = { left: 200, top: 120, width: 120, height: 40 } as const;
const PANEL = { width: 160, height: 80 } as const;

const FloatingProbe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<FloatingSide>("bottom");
  const [align, setAlign] = useState<FloatingAlign>("start");
  const [edge, setEdge] = useState(false);

  const surface = (left: number, top: number, height: number): StyleDesc => ({
    position: "absolute",
    left,
    top,
    width: ANCHOR.width,
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backgroundColor: theme.colors.muted,
  });

  const panel = (label: string) => (
    <div
      testId="float-panel"
      style={{
        width: PANEL.width,
        height: PANEL.height,
        padding: 8,
        pointerEvents: "auto",
        backgroundColor: theme.colors.popover,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
      }}
    >
      <Body>{label}</Body>
    </div>
  );

  return (
    <div
      testId="float-window"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="float-anchor"
        tabIndex={0}
        role="button"
        onClick={() => setOpen(!open)}
        style={surface(ANCHOR.left, ANCHOR.top, ANCHOR.height)}
      >
        <Body>anchor</Body>
        {open ? (
          <FloatingLayer
            side={side}
            align={align}
            sideOffset={GAP}
            collisionPadding={COLLISION}
          >
            {panel(`${side} ${align}`)}
          </FloatingLayer>
        ) : null}
      </div>

      <div
        testId="float-switch"
        tabIndex={0}
        role="button"
        onClick={() => setSide(side === "bottom" ? "right" : "bottom")}
        style={surface(340, 200, 32)}
      >
        <Body>switch side</Body>
      </div>
      <div
        testId="float-align"
        tabIndex={0}
        role="button"
        onClick={() => setAlign(align === "start" ? "center" : "start")}
        style={surface(340, 240, 32)}
      >
        <Body>switch align</Body>
      </div>
      <div style={{ position: "absolute", left: 200, top: 300 }}>
        <Readout testId="float-readout">{`open=${open} side=${side} align=${align} edge=${edge}`}</Readout>
      </div>

      <div
        testId="float-edge-anchor"
        tabIndex={0}
        role="button"
        onClick={() => setEdge(!edge)}
        style={surface(ANCHOR.left, window.height - 70, ANCHOR.height)}
      >
        <Body>edge</Body>
        {edge ? (
          <FloatingLayer
            side="bottom"
            align="start"
            sideOffset={GAP}
            collisionPadding={COLLISION}
          >
            {panel("edge panel")}
          </FloatingLayer>
        ) : null}
      </div>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext): Option.Option<string> =>
  Option.fromNullishOr(ctx.host.text("float-readout"));

const bounds = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.Bounds> => Option.fromNullishOr(ctx.host.bounds(testId));

export const floatingScenario: ScenarioBody = {
  view: () => <FloatingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("float-anchor");
      const opened = yield* ctx.expectSome(
        "float readout after open",
        readout(ctx),
      );
      yield* ctx.expectContains(
        "the anchor opened the layer",
        opened,
        "open=true side=bottom align=start",
      );

      const anchor = yield* ctx.expectSome(
        "the anchor is painted",
        bounds(ctx, "float-anchor"),
      );
      const below = yield* ctx.expectSome(
        "the panel is painted",
        bounds(ctx, "float-panel"),
      );
      yield* ctx.expectNear(
        "side=bottom sits one gap below the anchor",
        below.y,
        anchor.y + anchor.height + GAP,
        1,
      );
      yield* ctx.expectNear(
        "align=start puts the panel on the anchor's left edge",
        below.x,
        anchor.x,
        1,
      );

      ctx.host.click("float-switch");
      const switched = yield* ctx.expectSome(
        "float readout after switching side",
        readout(ctx),
      );
      yield* ctx.expectContains(
        "the side switched",
        switched,
        "side=right align=start",
      );
      const right = yield* ctx.expectSome(
        "the panel is still painted",
        bounds(ctx, "float-panel"),
      );
      yield* ctx.expectNear(
        "side=right sits one gap right of the anchor",
        right.x,
        anchor.x + anchor.width + GAP,
        1,
      );
      yield* ctx.expectNear(
        "align=start keeps the panel at the anchor's top edge",
        right.y,
        anchor.y,
        1,
      );

      ctx.host.click("float-align");
      const centred = yield* ctx.expectSome(
        "float readout after switching align",
        readout(ctx),
      );
      yield* ctx.expectContains("the align switched", centred, "align=center");
      const centre = yield* ctx.expectSome(
        "the panel is painted for align=center",
        bounds(ctx, "float-panel"),
      );
      yield* ctx.expectNear(
        "align=center ends the panel at the anchor's centre, not around it",
        centre.y + centre.height,
        anchor.y + anchor.height / 2,
        1,
      );

      ctx.host.click("float-anchor");
      ctx.host.click("float-edge-anchor");
      const edgeReadout = yield* ctx.expectSome(
        "float readout after opening the edge layer",
        readout(ctx),
      );
      yield* ctx.expectContains(
        "the edge layer opened",
        edgeReadout,
        "edge=true",
      );
      const edgeAnchor = yield* ctx.expectSome(
        "the edge anchor is painted",
        bounds(ctx, "float-edge-anchor"),
      );
      const windowBox = yield* ctx.expectSome(
        "the window box is painted",
        bounds(ctx, "float-window"),
      );
      const edgePanel = yield* ctx.expectSome(
        "the edge panel is painted",
        bounds(ctx, "float-panel"),
      );
      yield* ctx.expectEqual(
        `the layer snapped inside the window [panel bottom ${edgePanel.y + edgePanel.height}, window bottom ${windowBox.y + windowBox.height}]`,
        edgePanel.y + edgePanel.height <=
          windowBox.y + windowBox.height - COLLISION + 1,
        true,
      );
      yield* ctx.expectEqual(
        `the layer stayed past the top margin [panel top ${edgePanel.y}]`,
        edgePanel.y >= COLLISION,
        true,
      );
      yield* ctx.expectEqual(
        `0.10.0 snaps above the anchor instead of flipping [panel ${edgePanel.y}..${edgePanel.y + edgePanel.height}, anchor ${edgeAnchor.y}..${edgeAnchor.y + edgeAnchor.height}]`,
        edgePanel.y + edgePanel.height > edgeAnchor.y,
        true,
      );
    }),
};
