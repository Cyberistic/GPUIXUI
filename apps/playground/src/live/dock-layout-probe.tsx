import { Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { DockLayout, type DockNode } from "@gpuixui/dock";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { Pressable, Readout } from "../ui.js";
import { isColour } from "./box-paint.js";
import { captureScale, colourAt, type Point } from "./frame.js";
import {
  DOCK_HEIGHT,
  DOCK_IDS,
  DOCK_PANES,
  DOCK_SECOND_X,
  DOCK_TAB_LABELS,
  DOCK_TAB_ZONE,
  DOCK_WIDTH,
  DOCK_ZONE_FILLS,
  dockBody,
  dockBodyId,
  dockLayoutReadout,
  dockLayoutTree,
  dockReadoutLine,
} from "./dock-layout.js";
import { settleUntil } from "./settle.js";

const REST = "dock-layout-rest";

const TabBody = ({ tab }: { readonly tab: string }): ReactNode => {
  const theme = useTheme();
  const zone = DOCK_TAB_ZONE[tab] ?? "explorer";
  return (
    <div
      testId={dockBodyId(tab)}
      style={{
        display: "flex",
        flexGrow: 1,
        flexBasis: 0,
        minHeight: 0,
        padding: theme.spacing.sm,
        backgroundColor: DOCK_ZONE_FILLS[zone],
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.background }}
      >
        {dockBody(tab)}
      </text>
    </div>
  );
};

export const DockLayoutProbe = (): ReactNode => {
  const theme = useTheme();
  const [layout, setLayout] = useState<DockNode>(dockLayoutTree);
  const [report, setReport] = useState("none");
  const [changes, setChanges] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId={DOCK_IDS.stage}
        style={{
          display: "flex",
          width: DOCK_WIDTH,
          height: DOCK_HEIGHT,
        }}
      >
        <DockLayout
          testId={DOCK_IDS.layout}
          layout={layout}
          onLayoutChange={(next) => {
            setLayout(next);
            setReport(`${next.kind}:${next.id}`);
            setChanges((count) => count + 1);
          }}
          renderTab={(id) => <TabBody tab={id} />}
        />
      </div>
      <Readout testId={DOCK_IDS.readout}>
        {dockLayoutReadout(layout, report, changes)}
      </Readout>
      <Pressable
        testId={DOCK_IDS.reset}
        onClick={() => {
          setLayout(dockLayoutTree());
          setReport("none");
        }}
        style={{ alignSelf: "flex-start" }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
          }}
        >
          Reset
        </text>
      </Pressable>
    </div>
  );
};

export const dockLayoutSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(DOCK_IDS.layout);

    yield* Effect.sleep(Duration.millis(200));

    type Failure = Smoke.SmokeAssertionError | Smoke.SmokeHostError;

    const box = (
      testId: string,
    ): Effect.Effect<Option.Option<Smoke.Bounds>, Smoke.SmokeHostError> =>
      Effect.map(
        settleUntil(ctx.host.bounds(testId), (value) => value !== null),
        Option.fromNullishOr,
      );

    const readout = (expected: string): Effect.Effect<string, Failure> =>
      settleUntil(ctx.host.text(DOCK_IDS.readout), (line) =>
        line.includes(expected),
      );

    const fillPoint = (painted: Smoke.Bounds): Point => ({
      x: painted.x + painted.width / 2,
      y: painted.y + painted.height * 0.75,
    });

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

    const stage = yield* ctx.expectSome(
      "the stage paints its box",
      yield* box(DOCK_IDS.stage),
    );
    const root = yield* ctx.expectSome(
      "the layout paints its box",
      yield* box(DOCK_IDS.layout),
    );
    yield* ctx.expectNear(
      "the layout fills the stage's width",
      root.width,
      DOCK_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the layout fills the stage's height",
      root.height,
      DOCK_HEIGHT,
      1,
    );

    const files = yield* ctx.expectSome(
      "the explorer group paints its active tab's content",
      yield* box(dockBodyId("files")),
    );
    const notes = yield* ctx.expectSome(
      "the editor group paints its active tab's content",
      yield* box(dockBodyId("notes")),
    );
    yield* ctx.expectEqual(
      "the explorer group opens the tab the tree names",
      yield* ctx.host.text(dockBodyId("files")),
      dockBody("files"),
    );
    yield* ctx.expectEqual(
      "the editor group opens the tab the tree names",
      yield* ctx.host.text(dockBodyId("notes")),
      dockBody("notes"),
    );
    yield* ctx.expectEqual(
      "the tab the group did not select paints nothing",
      Option.isNone(yield* box(dockBodyId("outline"))),
      true,
    );
    yield* ctx.expectEqual(
      "the second group's other tab paints nothing",
      Option.isNone(yield* box(dockBodyId("logs"))),
      true,
    );
    yield* ctx.expectNear(
      "the first group paints its share of the split",
      files.width,
      DOCK_PANES[0],
      2,
    );
    yield* ctx.expectNear(
      "the second group starts after the divider",
      notes.x - stage.x,
      DOCK_SECOND_X,
      2,
    );
    yield* ctx.expectNear(
      "the second group paints the rest of the split",
      notes.width,
      DOCK_PANES[1],
      2,
    );
    yield* ctx.expectNear(
      "the two shares and the divider are the stage's width",
      files.width + notes.width + 6,
      DOCK_WIDTH,
      2,
    );
    yield* ctx.expectEqual(
      "the readout starts on the tree the probe built",
      yield* readout("layout=split:root"),
      dockLayoutReadout(dockLayoutTree(), "none", 0),
    );

    const rest = yield* ctx.expectSome(
      "the rest capture is the window at a whole device scale",
      yield* capture(REST),
    );
    yield* ctx.expectEqual(
      "the explorer group paints its content's own fill",
      isColour(
        yield* ctx.expectSome(
          "the explorer body's fill point is in the capture",
          colourAt(rest.frame, fillPoint(files), rest.scale),
        ),
        DOCK_ZONE_FILLS.explorer,
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the editor group paints its content's own fill",
      isColour(
        yield* ctx.expectSome(
          "the editor body's fill point is in the capture",
          colourAt(rest.frame, fillPoint(notes), rest.scale),
        ),
        DOCK_ZONE_FILLS.editor,
      ),
      true,
    );

    yield* ctx.host.clickText(DOCK_TAB_LABELS.logs ?? "Logs");
    const pressed = yield* readout("changes=1");
    yield* ctx.expectEqual(
      "the press reports the group it changed, not the tree",
      pressed,
      dockReadoutLine("tabs:editor", "tabs:editor", 1),
    );
    yield* ctx.expectEqual(
      "the pressed group opens the tab that was pressed",
      yield* ctx.host.text(dockBodyId("logs")),
      dockBody("logs"),
    );
    yield* ctx.expectEqual(
      "the group the report dropped leaves the stage",
      Option.isNone(yield* box(dockBodyId("files"))),
      true,
    );
    yield* ctx.expectEqual(
      "the retired group's line leaves the painted text",
      Arr.contains(yield* ctx.host.paintedText(), dockBody("files")),
      false,
    );
    const whole = yield* ctx.expectSome(
      "the group that remains paints",
      yield* box(dockBodyId("logs")),
    );
    yield* ctx.expectNear(
      "the remaining group takes the whole stage, because it became the tree",
      whole.width,
      DOCK_WIDTH,
      2,
    );

    yield* ctx.host.click(DOCK_IDS.reset);
    const restored = yield* readout("layout=split:root");
    yield* ctx.expectContains(
      "Reset restores the tree the probe built",
      restored,
      "reports=none",
    );
    const filesAgain = yield* ctx.expectSome(
      "the explorer group paints again",
      yield* box(dockBodyId("files")),
    );
    yield* ctx.expectNear(
      "the restored first group paints its share",
      filesAgain.width,
      DOCK_PANES[0],
      2,
    );
    yield* ctx.expectEqual(
      "the tab the first press opened is gone with the restored tree",
      Option.isNone(yield* box(dockBodyId("logs"))),
      true,
    );

    yield* ctx.host.clickText(DOCK_TAB_LABELS.files ?? "Files");
    const again = yield* readout("changes=2");
    yield* ctx.expectEqual(
      "a press that changes no tab still replaces the tree",
      again,
      dockReadoutLine("tabs:explorer", "tabs:explorer", 2),
    );
    yield* ctx.host.click(DOCK_IDS.reset);
    yield* readout("layout=split:root");
    yield* ctx.expectEqual(
      "the editor group paints again after the second Reset",
      yield* ctx.host.text(dockBodyId("notes")),
      dockBody("notes"),
    );
  });
