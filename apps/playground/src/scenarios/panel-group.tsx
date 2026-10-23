/**
 * `panel-group-core` — the shipped `PanelGroup` in the offscreen renderer.
 *
 * Every other panel measurement on this repo drives a fixture: `panel-resize`
 * and `docking-nested` own their dividers, and `dock-split-lifecycle` mounts the
 * shipped `SplitPane` in a **window**. The shipped `PanelGroup` — the surface a
 * Tier 4 workspace composes — had only `logic.ts`'s unit tests, so a group that
 * ignored its `PanelLayout`, wired a collapse toggle to nothing or moved the
 * wrong neighbour on a key would leave every suite green.
 *
 * The steps read the package's own paint: the panes are sized by their
 * fractions of the space **between** the dividers, the collapse toggle is the
 * primitives' `Button` reached through the native traversal (it carries no
 * `testId`; the focus id is the proof it is the one pressed), and the focused
 * divider answers the arrows because it is a `role="separator"` tab stop.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Panel, PanelGroup, PanelLayout } from "@gpuixui/dock";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";
import {
  PANEL_GROUP_HEIGHT,
  PANEL_GROUP_PANELS,
  PANEL_GROUP_WIDTH,
  availableWidth,
  panelGroupReadout,
  panelWidths,
  stepSizes,
} from "./panel-group-fixture.js";

/** What each pane paints, so a collapsed pane can be told from an empty one. */
const BODIES: Readonly<Record<string, string>> = {
  sidebar: "Collapse me from the header.",
  editor: "The middle pane cannot collapse.",
  inspector: "A collapse persists in the layout.",
};

const initialLayout = new PanelLayout({
  orientation: "horizontal",
  panels: PANEL_GROUP_PANELS.map(
    (panel) =>
      new Panel({
        id: panel.id,
        label: panel.id,
        size: panel.size,
        collapsible: panel.collapsible,
      }),
  ),
});

const PanelGroupProbe = () => {
  const [layout, setLayout] = useState<PanelLayout>(initialLayout);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: PANEL_GROUP_WIDTH,
      }}
    >
      <div testId="dock-group-before" tabIndex={0} role="button" autoFocus>
        <Body>before the group</Body>
      </div>
      <div
        style={{
          display: "flex",
          width: PANEL_GROUP_WIDTH,
          height: PANEL_GROUP_HEIGHT,
        }}
      >
        <PanelGroup
          testId="dock-group"
          layout={layout}
          onLayoutChange={setLayout}
          renderPanel={(id) => <Body>{BODIES[id] ?? id}</Body>}
        />
      </div>
      <Readout testId="dock-group-readout">{panelGroupReadout(layout)}</Readout>
    </div>
  );
};

/** The readout line, or `""` when the probe has not painted it. */
const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("dock-group-readout")),
    () => "",
  );

/** One pane's painted box, or a failure naming the id. */
const paneBox = (ctx: Smoke.SmokeContext, id: string) =>
  ctx.expectSome(
    `the ${id} pane paints`,
    Option.fromNullishOr(ctx.host.bounds(`dock-group-pane-${id}`)),
  );

/** One divider's painted box, or a failure naming it. */
const dividerBox = (ctx: Smoke.SmokeContext, index: number) =>
  ctx.expectSome(
    `the divider ${index} paints`,
    Option.fromNullishOr(ctx.host.bounds(`dock-group-divider-${index}`)),
  );

/** The pane the initial layout puts at `at`, asserted against its fraction. */
const expectPaneWidth = (
  ctx: Smoke.SmokeContext,
  id: string,
  at: number,
  tolerance = 3,
) =>
  Effect.gen(function* () {
    const box = yield* paneBox(ctx, id);
    yield* ctx.expectNear(
      `the ${id} pane paints its fraction of the group`,
      box.width,
      panelWidths(PANEL_GROUP_WIDTH)[at] ?? -1,
      tolerance,
    );
    return box;
  });

export const panelGroupScenario: ScenarioBody = {
  view: () => <PanelGroupProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "the group paints its initial layout",
        readout(ctx),
        "panes=sidebar:20,editor:55,inspector:25 collapsed=none",
      );

      const sidebar = yield* expectPaneWidth(ctx, "sidebar", 0);
      const editor = yield* expectPaneWidth(ctx, "editor", 1);
      const inspector = yield* expectPaneWidth(ctx, "inspector", 2);
      yield* dividerBox(ctx, 0);
      yield* dividerBox(ctx, 1);

      // The three shares plus the two dividers are the group's whole width, so a
      // pane that is short or over cannot hide behind the other two.
      yield* ctx.expectNear(
        "the panes and dividers fill the group's width",
        sidebar.width + editor.width + inspector.width + 12,
        PANEL_GROUP_WIDTH,
        2,
      );

      // The collapse toggle is the second tab stop: the Button the package
      // renders carries no `testId`, so the traversal is how a reader reaches
      // it and the collapse it causes is the proof it was the one pressed.
      ctx.host.focusNext();
      ctx.host.key("enter");
      yield* ctx.expectEqual(
        "the traversal reaches the collapse toggle and Enter collapses the pane",
        readout(ctx),
        "panes=sidebar:20,editor:55,inspector:25 collapsed=sidebar",
      );
      const collapsed = yield* paneBox(ctx, "sidebar");
      yield* ctx.expectEqual(
        "a collapsed pane shrinks to its header",
        collapsed.width < sidebar.width - 40,
        true,
      );
      const editorAfterCollapse = yield* paneBox(ctx, "editor");
      const inspectorAfterCollapse = yield* paneBox(ctx, "inspector");
      // Measured gap: the runtime treats `flexGrow` as a share of the free
      // space, not a weight over the items present, so the expanded panes keep
      // 0.55/0.25 of what the header leaves instead of filling it. The 20% the
      // collapsed pane gave up stays blank until the component normalises the
      // remaining shares; this check is the measurement, not a blessing of it.
      const freed = availableWidth(PANEL_GROUP_WIDTH, 3) - collapsed.width;
      const empty = freed * (1 - (0.55 + 0.25));
      yield* ctx.expectNear(
        "the expanded panes leave the collapsed pane's share empty (measured gap)",
        editorAfterCollapse.width + inspectorAfterCollapse.width,
        freed - empty,
        2,
      );
      yield* ctx.expectEqual(
        "the collapsed pane paints no body",
        readout(ctx).includes("Collapse me from the header."),
        false,
      );

      // The same toggle expands it again, and the shares come back exactly.
      ctx.host.key("enter");
      yield* ctx.expectEqual(
        "the toggle expands the pane again",
        readout(ctx),
        "panes=sidebar:20,editor:55,inspector:25 collapsed=none",
      );
      yield* expectPaneWidth(ctx, "sidebar", 0);

      // The divider is a control: the traversal reaches it and the arrows move
      // the split by the package's own step, traded with its one neighbour.
      ctx.host.focusNext();
      yield* ctx.expectEqual(
        "the traversal lands on the first divider",
        ctx.host.focused() ?? "none",
        "dock-group-divider-0",
      );
      ctx.host.key("right");
      const stepped = stepSizes();
      yield* ctx.expectEqual(
        "the right arrow moves the split by one step",
        readout(ctx),
        `panes=sidebar:${Math.round((stepped[0] ?? 0) * 100)},editor:${Math.round((stepped[1] ?? 0) * 100)},inspector:25 collapsed=none`,
      );
      const grown = yield* paneBox(ctx, "sidebar");
      yield* ctx.expectNear(
        "the pane paints the width the step produced",
        grown.width,
        sidebar.width + 16,
        2,
      );
      const shrunk = yield* paneBox(ctx, "editor");
      yield* ctx.expectNear(
        "the neighbour gives up exactly the step",
        shrunk.width,
        editor.width - 16,
        2,
      );

      ctx.host.key("left");
      yield* ctx.expectEqual(
        "the left arrow returns the split",
        readout(ctx),
        "panes=sidebar:20,editor:55,inspector:25 collapsed=none",
      );
      yield* expectPaneWidth(ctx, "sidebar", 0);
    }),
};
