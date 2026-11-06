import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Panel, PanelGroup, PanelLayout } from "@gpuixui/dock";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { Readout } from "../ui.js";
import { palettes } from "../palettes.js";
import { isColour } from "./box-paint.js";
import { captureScale, colourAt, type Point } from "./frame.js";
import {
  PANEL_GROUP_HEIGHT,
  PANEL_GROUP_PANELS,
  PANEL_GROUP_WIDTH,
  panelGroupReadout,
  panelWidths,
} from "../scenarios/panel-group-fixture.js";
import {
  PANE_BODIES,
  PANE_FILLS,
  PANEL_IDS,
  collapsedShares,
  dividerId,
  dividerStart,
  paneContent,
  paneId,
} from "./panel-group.js";
import { settleUntil } from "./settle.js";

const REST = "panel-group-rest";
const COLLAPSED = "panel-group-collapsed";

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

const PaneBody = ({ id }: { readonly id: string }): ReactNode => {
  const theme = useTheme();
  const content = paneContent(id, {
    fill: theme.colors.card,
    body: id,
  });
  return (
    <div
      style={{
        height: "100%",
        padding: theme.spacing.sm,
        backgroundColor: content.fill,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.background }}
      >
        {content.body}
      </text>
    </div>
  );
};

export const PanelGroupProbe = (): ReactNode => {
  const theme = useTheme();
  const [layout, setLayout] = useState<PanelLayout>(initialLayout);
  return (
    <div
      style={{
        width: PANEL_GROUP_WIDTH + theme.spacing.xl * 2,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId={PANEL_IDS.before}
        tabIndex={0}
        role="button"
        style={{ alignSelf: "flex-start" }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          before the group
        </text>
      </div>
      <div
        style={{
          display: "flex",
          width: PANEL_GROUP_WIDTH,
          height: PANEL_GROUP_HEIGHT,
        }}
      >
        <PanelGroup
          testId={PANEL_IDS.group}
          layout={layout}
          onLayoutChange={setLayout}
          renderPanel={(id) => <PaneBody id={id} />}
        />
      </div>
      <Readout testId={PANEL_IDS.readout}>{panelGroupReadout(layout)}</Readout>
    </div>
  );
};

export const panelGroupSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(PANEL_IDS.group);

    yield* Effect.sleep(Duration.millis(200));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    const box = (
      testId: string,
    ): Effect.Effect<Smoke.Bounds | null, Smoke.SmokeHostError> =>
      settleUntil(ctx.host.bounds(testId), (value) => value !== null);

    const optionBox = (
      testId: string,
    ): Effect.Effect<Option.Option<Smoke.Bounds>, Smoke.SmokeHostError> =>
      Effect.map(box(testId), Option.fromNullishOr);

    const capture = (
      name: string,
    ): Effect.Effect<
      Option.Option<{ readonly frame: Pixels.Pixels; readonly scale: number }>,
      Failure
    > =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const frame = yield* ctx.host.pixels(name);
        const size = yield* ctx.host.windowSize();
        return Option.map(captureScale(frame, size), (scale) => ({
          frame,
          scale,
        }));
      });

    const fillPoint = (painted: Smoke.Bounds): Point => ({
      x: painted.x + painted.width / 2,
      y: painted.y + painted.height * 0.75,
    });

    const readout = (expected: string): Effect.Effect<string, Failure> =>
      settleUntil(ctx.host.text(PANEL_IDS.readout), (line) =>
        line.includes(expected),
      );

    const group = yield* ctx.expectSome(
      "the group paints its box",
      yield* optionBox(PANEL_IDS.group),
    );
    const widths = panelWidths(PANEL_GROUP_WIDTH);
    const sidebar = yield* ctx.expectSome(
      "the sidebar pane paints",
      yield* optionBox(paneId("sidebar")),
    );
    const editor = yield* ctx.expectSome(
      "the editor pane paints",
      yield* optionBox(paneId("editor")),
    );
    const inspector = yield* ctx.expectSome(
      "the inspector pane paints",
      yield* optionBox(paneId("inspector")),
    );
    const firstDivider = yield* ctx.expectSome(
      "the first divider paints",
      yield* optionBox(dividerId(0)),
    );
    const secondDivider = yield* ctx.expectSome(
      "the second divider paints",
      yield* optionBox(dividerId(1)),
    );

    yield* ctx.expectNear(
      "the group paints the width its caller declared",
      group.width,
      PANEL_GROUP_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the group paints the height its caller declared",
      group.height,
      PANEL_GROUP_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the group paints its initial layout",
      yield* ctx.host.text(PANEL_IDS.readout),
      panelGroupReadout({
        panels: PANEL_GROUP_PANELS.map((panel) => ({
          ...panel,
          collapsed: false,
        })),
      }),
    );
    yield* ctx.expectNear(
      "the sidebar paints its fraction of the pane space",
      sidebar.width,
      widths[0] ?? Number.NaN,
      3,
    );
    yield* ctx.expectNear(
      "the editor paints its fraction of the pane space",
      editor.width,
      widths[1] ?? Number.NaN,
      3,
    );
    yield* ctx.expectNear(
      "the inspector paints its fraction of the pane space",
      inspector.width,
      widths[2] ?? Number.NaN,
      3,
    );
    yield* ctx.expectNear(
      "the panes and dividers fill the group's width",
      sidebar.width + editor.width + inspector.width + 12,
      PANEL_GROUP_WIDTH,
      2,
    );
    yield* ctx.expectNear(
      "the first divider paints the package's thickness",
      firstDivider.width,
      6,
      1,
    );
    yield* ctx.expectNear(
      "the second divider paints the package's thickness",
      secondDivider.width,
      6,
      1,
    );
    yield* ctx.expectNear(
      "the first divider sits on the sidebar's right edge",
      firstDivider.x,
      group.x + dividerStart(group.width, 0),
      2,
    );
    yield* ctx.expectNear(
      "the second divider sits on the editor's right edge",
      secondDivider.x,
      group.x + dividerStart(group.width, 1),
      2,
    );

    const rest = yield* ctx.expectSome(
      "the rest capture is the window at a whole device scale",
      yield* capture(REST),
    );
    yield* ctx.expectEqual(
      "the sidebar paints its own fill at its centre",
      isColour(
        yield* ctx.expectSome(
          "the sidebar's fill point is in the capture",
          colourAt(rest.frame, fillPoint(sidebar), rest.scale),
        ),
        PANE_FILLS.sidebar,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the editor paints its own fill at its centre",
      isColour(
        yield* ctx.expectSome(
          "the editor's fill point is in the capture",
          colourAt(rest.frame, fillPoint(editor), rest.scale),
        ),
        PANE_FILLS.editor,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the inspector paints its own fill at its centre",
      isColour(
        yield* ctx.expectSome(
          "the inspector's fill point is in the capture",
          colourAt(rest.frame, fillPoint(inspector), rest.scale),
        ),
        PANE_FILLS.inspector,
      ),
      true,
    );

    yield* ctx.host.focusElement(PANEL_IDS.before);
    yield* ctx.host.focusNext();
    yield* ctx.host.key("enter");
    yield* ctx.expectContains(
      "the traversal's first stop collapses the sidebar",
      yield* readout("collapsed=sidebar"),
      "collapsed=sidebar",
    );
    const collapsed = yield* settleUntil(
      ctx.host.bounds(paneId("sidebar")),
      (value) => value !== null && value.width < sidebar.width - 40,
    );
    yield* ctx.expectEqual(
      "a collapsed pane shrinks to its header",
      collapsed !== null && collapsed.width < sidebar.width - 40,
      true,
    );
    yield* ctx.expectEqual(
      "a collapsed pane paints no body",
      Arr.contains(yield* ctx.host.paintedText(), PANE_BODIES.sidebar),
      false,
    );

    const reopenedSum =
      (yield* ctx.expectSome(
        "the editor pane paints after the collapse",
        yield* optionBox(paneId("editor")),
      )).width +
      (yield* ctx.expectSome(
        "the inspector pane paints after the collapse",
        yield* optionBox(paneId("inspector")),
      )).width;
    const shares = collapsedShares(
      PANEL_GROUP_WIDTH,
      "sidebar",
      collapsed?.width ?? 0,
    );
    yield* ctx.expectNear(
      "the expanded panes keep their fractions of the freed space (measured gap)",
      reopenedSum,
      shares.expanded,
      3,
    );
    const collapsedFrame = yield* ctx.expectSome(
      "the collapsed capture is the window at a whole device scale",
      yield* capture(COLLAPSED),
    );
    yield* ctx.expectEqual(
      "the freed share paints the page behind the group, not a pane",
      isColour(
        yield* ctx.expectSome(
          "the group's right edge is in the capture",
          colourAt(
            collapsedFrame.frame,
            {
              x: group.x + group.width - 12,
              y: group.y + group.height / 2,
            },
            collapsedFrame.scale,
          ),
        ),
        palettes.dark.colors.background,
      ),
      true,
    );
    const inspectorNow = yield* ctx.expectSome(
      "the inspector pane still paints beside the gap",
      yield* optionBox(paneId("inspector")),
    );
    yield* ctx.expectEqual(
      "the inspector keeps its own fill beside the gap",
      isColour(
        yield* ctx.expectSome(
          "the inspector's fill point is in the captured collapse",
          colourAt(
            collapsedFrame.frame,
            fillPoint(inspectorNow),
            collapsedFrame.scale,
          ),
        ),
        PANE_FILLS.inspector,
      ),
      true,
    );

    yield* ctx.host.key("enter");
    yield* ctx.expectContains(
      "the toggle expands the pane again",
      yield* readout("collapsed=none"),
      "collapsed=none",
    );
    yield* ctx.expectNear(
      "the sidebar paints its fraction again",
      (yield* ctx.expectSome(
        "the sidebar pane paints again",
        yield* optionBox(paneId("sidebar")),
      )).width,
      widths[0] ?? Number.NaN,
      3,
    );

    yield* ctx.host.focusNext();
    yield* ctx.expectEqual(
      "the traversal lands on the first divider",
      (yield* ctx.host.focused()) ?? "none",
      dividerId(0),
    );
    yield* ctx.host.key("right");
    yield* ctx.expectContains(
      "the right arrow moves the split by one step",
      yield* readout("sidebar:23"),
      "panes=sidebar:23,editor:52,inspector:25 collapsed=none",
    );
    const grown = yield* ctx.expectSome(
      "the sidebar pane paints after the step",
      yield* optionBox(paneId("sidebar")),
    );
    yield* ctx.expectNear(
      "the sidebar paints the width the step produced",
      grown.width,
      sidebar.width + 16,
      2,
    );
    const shrunk = yield* ctx.expectSome(
      "the editor pane paints after the step",
      yield* optionBox(paneId("editor")),
    );
    yield* ctx.expectNear(
      "the editor gives up exactly the step",
      shrunk.width,
      editor.width - 16,
      2,
    );
    yield* ctx.host.key("left");
    yield* ctx.expectContains(
      "the left arrow returns the split",
      yield* readout("sidebar:20"),
      "panes=sidebar:20,editor:55,inspector:25 collapsed=none",
    );
    yield* ctx.expectNear(
      "the sidebar paints its first width again",
      (yield* ctx.expectSome(
        "the sidebar pane paints after the return",
        yield* optionBox(paneId("sidebar")),
      )).width,
      widths[0] ?? Number.NaN,
      3,
    );
  });
