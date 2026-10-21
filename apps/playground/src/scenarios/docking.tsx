/**
 * Tier 4 probe: `docking-nested` — a dock layout composed from nested splits.
 *
 * The docking question is whether the panel primitives compose: a sidebar, a
 * split inside the sidebar's neighbour, and a tabbed panel inside *that* split.
 * Each level owns its own width, so dragging one divider must move the other
 * level's box without changing its size. The sidebar is caller-owned (`size`)
 * because collapsing it is a layout decision, not a drag: the width goes to the
 * nested split, which is exactly what a dock does when a panel group closes.
 *
 * Measured limitation, asserted below: a split's `max` is the caller's number,
 * not its container's width, so the nested split does not re-clamp when the
 * sidebar opens. The outer pane clips its overflow and the inner pane shrinks to
 * nothing — a dock needs the container's width (0.11.0's `onLayout` supplies it;
 * this probe pins the fixed-width behaviour the existing scenarios rely on).
 */
import { useState } from "react";
import { Effect, Option } from "effect";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import type { ScenarioBody } from "../types.js";

const SIDEBAR_OPEN = 140;

const Tab = ({
  id,
  active,
  onSelect,
}: {
  readonly id: string;
  readonly active: boolean;
  readonly onSelect: () => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={`dock-tab-${id}`}
      tabIndex={0}
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      style={{
        padding: 6,
        borderRadius: 4,
        cursor: "pointer",
        backgroundColor: active ? theme.colors.card : theme.colors.muted,
        hover: { backgroundColor: theme.colors.card },
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{id}</text>
    </div>
  );
};

/** The editor pane: a tab strip and the one document the selected tab names. */
const EditorPane = () => {
  const theme = useTheme();
  const [active, setActive] = useState("notes");
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.card,
      }}
    >
      <div
        testId="dock-tabstrip"
        style={{ display: "flex", gap: 4, padding: 4 }}
      >
        {["notes", "log"].map((id) => (
          <Tab
            key={id}
            id={id}
            active={active === id}
            onSelect={() => setActive(id)}
          />
        ))}
      </div>
      <div style={{ padding: 8 }}>
        <text testId="dock-content" style={{ color: theme.colors.foreground }}>
          {`document=${active}`}
        </text>
      </div>
    </div>
  );
};

const DockingProbe = () => {
  const theme = useTheme();
  const [sidebar, setSidebar] = useState(SIDEBAR_OPEN);
  /** The width to restore, so collapsing a dragged sidebar reopens at its own size. */
  const [restore, setRestore] = useState(SIDEBAR_OPEN);
  const [editor, setEditor] = useState(260);

  const collapse = () => {
    setRestore(sidebar);
    setSidebar(0);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 660 }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Readout testId="dock-readout">
          {`sidebar=${sidebar} editor=${editor}`}
        </Readout>
        <div
          testId="dock-collapse"
          tabIndex={0}
          role="button"
          onClick={collapse}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>collapse</text>
        </div>
        <div
          testId="dock-expand"
          tabIndex={0}
          role="button"
          onClick={() => setSidebar(restore)}
          style={{
            padding: 6,
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: theme.colors.muted,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>expand</text>
        </div>
      </div>
      <div style={{ height: 260 }}>
        <SplitPane
          id="dock"
          initial={SIDEBAR_OPEN}
          size={sidebar}
          min={0}
          max={240}
          onResize={setSidebar}
          primary={
            <div
              style={{
                height: "100%",
                padding: 8,
                backgroundColor: theme.colors.muted,
              }}
            >
              <text testId="dock-sidebar" style={{ color: theme.colors.mutedForeground }}>
                explorer
              </text>
            </div>
          }
          secondary={
            <SplitPane
              id="dock-inner"
              initial={260}
              size={editor}
              min={120}
              max={480}
              onResize={setEditor}
              primary={<EditorPane />}
              secondary={
                <div
                  style={{
                    height: "100%",
                    padding: 8,
                    backgroundColor: theme.colors.background,
                  }}
                >
                  <text
                    testId="dock-inspector"
                    style={{ color: theme.colors.mutedForeground }}
                  >
                    inspector
                  </text>
                </div>
              }
            />
          }
        />
      </div>
      <Readout testId="dock-note">
        0.11.0 has onLayout; this probe pins the fixed-width split the panels
        scenarios use, so the nested `max` is the caller's number
      </Readout>
    </div>
  );
};

/** `testId`'s painted text, or a failed check. */
const text = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Effect.Effect<string, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `${testId} paints text`,
    Option.fromNullishOr(ctx.host.text(testId)),
  );

/** The painted left edge and width of `testId`, or a failed check. */
const box = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `${testId} painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

export const dockingScenario: ScenarioBody = {
  view: () => <DockingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const read = (): string =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("dock-readout")),
          () => "",
        );

      yield* ctx.expectContains(
        "the dock starts with an open sidebar",
        read(),
        "sidebar=140 editor=260",
      );

      const sidebar = yield* box(ctx, "dock-pane-a");
      const inner = yield* box(ctx, "dock-inner-pane-a");
      yield* ctx.expectNear("the sidebar is its own width", sidebar.width, 140, 1);
      yield* ctx.expectNear(
        "the nested split starts after the sidebar and its divider",
        inner.x,
        sidebar.width + 6,
        1,
      );
      yield* ctx.expectNear(
        "the nested split owns the editor width",
        inner.width,
        260,
        1,
      );

      // Independent levels: the outer divider moves the inner split's origin and
      // leaves the inner width alone.
      ctx.host.drag("dock-divider", 60, 0, 6);
      yield* ctx.expectContains(
        "the outer divider widens the sidebar",
        read(),
        "sidebar=200 editor=260",
      );
      const moved = yield* box(ctx, "dock-inner-pane-a");
      yield* ctx.expectNear(
        "the nested split follows the sidebar",
        moved.x,
        206,
        1,
      );
      yield* ctx.expectNear(
        "the inner width survives the outer drag",
        moved.width,
        260,
        1,
      );

      // …and the inner divider touches nothing above it.
      ctx.host.drag("dock-inner-divider", 80, 0, 6);
      yield* ctx.expectContains(
        "the inner divider widens the editor",
        read(),
        "sidebar=200 editor=340",
      );
      const outer = yield* box(ctx, "dock-pane-a");
      yield* ctx.expectNear(
        "the sidebar keeps its width",
        outer.width,
        200,
        1,
      );

      // Collapsing is the layout's decision, not a drag: the width goes to the
      // nested split, and the inner split state is untouched.
      ctx.host.click("dock-collapse");
      yield* ctx.expectContains(
        "collapsing empties the sidebar",
        read(),
        "sidebar=0 editor=340",
      );
      const collapsed = yield* box(ctx, "dock-inner-pane-a");
      yield* ctx.expectNear(
        "the nested split takes the collapsed width",
        collapsed.x,
        6,
        1,
      );
      yield* ctx.expectNear(
        "the editor keeps its width while the sidebar is closed",
        collapsed.width,
        340,
        1,
      );
      yield* ctx.expectNear(
        "the sidebar pane paints no width",
        (yield* box(ctx, "dock-pane-a")).width,
        0,
        0,
      );

      // A tabbed panel inside the dock: the pane's box holds, its content changes.
      const beforeTabs = yield* box(ctx, "dock-inner-pane-a");
      ctx.host.click("dock-tab-log");
      yield* ctx.expectEqual(
        "selecting a tab repaints its pane",
        yield* text(ctx, "dock-content"),
        "document=log",
      );
      const afterTabs = yield* box(ctx, "dock-inner-pane-a");
      yield* ctx.expectNear(
        "a tab switch does not move the panel",
        afterTabs.width,
        beforeTabs.width,
        1,
      );
      ctx.host.click("dock-tab-notes");
      yield* ctx.expectEqual(
        "selecting the other tab repaints it back",
        yield* text(ctx, "dock-content"),
        "document=notes",
      );

      // Re-opening restores the arrangement the dock held — the width the sidebar
      // had when it closed, not the one it started with.
      ctx.host.click("dock-expand");
      yield* ctx.expectContains(
        "re-opening restores the sidebar's own width",
        read(),
        "sidebar=200 editor=340",
      );
      const restored = yield* box(ctx, "dock-inner-pane-a");
      yield* ctx.expectNear("the restored split follows", restored.x, 206, 1);
      yield* ctx.expectNear(
        "the restored editor width is the one it had",
        restored.width,
        340,
        1,
      );
    }),
};
