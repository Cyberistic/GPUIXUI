/**
 * `panel-nested` — the panel layout a docking workspace needs.
 *
 * `panel-resize` proved one horizontal divider. This probe adds the three
 * facts a nested workspace rests on: the **vertical** split (pointer delta on
 * `y`, painted height), **isolation** (resizing the split nested in a pane does
 * not move its parent), and a **collapsible sidebar** whose width `0` really
 * leaves the layout. The divider also proves its keyboard path — arrows grow
 * and shrink it — because a splitter that needs a mouse is not a panel
 * primitive.
 *
 * Measured facts: plan `175` §8.
 */
import { useState } from "react";
import { Effect, Option } from "effect";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { nodeFor, fieldText as text } from "../a11y.js";
import { Readout, Pressable } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import type { PlaygroundScenario } from "../types.js";

const OUTER_INITIAL = 180;
const INNER_INITIAL = 300;
const SIDEBAR_OPEN = 160;

const PanelNestedProbe = () => {
  const theme = useTheme();
  const [outer, setOuter] = useState(OUTER_INITIAL);
  const [inner, setInner] = useState(INNER_INITIAL);
  const [sidebar, setSidebar] = useState(SIDEBAR_OPEN);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 660,
        height: 380,
      }}
    >
      <Readout testId="panel-state">
        {`outer=${outer} inner=${inner} sidebar=${sidebar}`}
      </Readout>
      <div style={{ display: "flex", gap: 8 }}>
        <Pressable
          testId="panel-sidebar-toggle"
          onClick={() =>
            setSidebar((current) =>
              current === SIDEBAR_OPEN ? 0 : SIDEBAR_OPEN,
            )
          }
        >
          <text>toggle sidebar</text>
        </Pressable>
      </div>
      <div style={{ height: 320 }}>
        <SplitPane
          id="outer"
          orientation="vertical"
          initial={OUTER_INITIAL}
          min={120}
          max={260}
          onResize={setOuter}
          label="Resize the top panel"
          primary={
            <div style={{ display: "flex", height: "100%", minWidth: 0 }}>
              <div
                testId="panel-sidebar"
                style={{
                  width: sidebar,
                  flexShrink: 0,
                  overflow: "hidden",
                  backgroundColor: theme.colors.muted,
                }}
              >
                <text style={{ color: theme.colors.foreground }}>sidebar</text>
              </div>
              <div
                style={{
                  display: "flex",
                  flexGrow: 1,
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <SplitPane
                  id="inner"
                  initial={INNER_INITIAL}
                  min={120}
                  max={400}
                  onResize={setInner}
                  label="Resize the inner panel"
                  primary={
                    <div
                      style={{
                        height: "100%",
                        backgroundColor: theme.colors.card,
                        padding: 6,
                      }}
                    >
                      <text style={{ color: theme.colors.foreground }}>
                        editor
                      </text>
                    </div>
                  }
                  secondary={
                    <div
                      style={{
                        height: "100%",
                        backgroundColor: theme.colors.background,
                        padding: 6,
                      }}
                    >
                      <text style={{ color: theme.colors.foreground }}>
                        inspector
                      </text>
                    </div>
                  }
                />
              </div>
            </div>
          }
          secondary={
            <div
              style={{
                height: "100%",
                backgroundColor: theme.colors.background,
                padding: 6,
              }}
            >
              <text style={{ color: theme.colors.foreground }}>log</text>
            </div>
          }
        />
      </div>
    </div>
  );
};

const state = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("panel-state")),
    () => "",
  );

/** A painted bound on one axis, or the assertion that the node is missing. */
const bound = (
  ctx: Smoke.SmokeContext,
  testId: string,
  axis: "width" | "height",
) =>
  Effect.map(
    ctx.expectSome(
      `${testId} paints`,
      Option.fromNullishOr(ctx.host.bounds(testId)),
    ),
    (bounds) => bounds[axis],
  );

export const panelNestedScenario: PlaygroundScenario = {
  id: "panel-nested",
  title: "Panels: vertical split, nested isolation and a collapsible sidebar",
  capability: "panel",
  view: () => <PanelNestedProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the workspace starts at its defaults",
        state(ctx),
        `outer=${OUTER_INITIAL} inner=${INNER_INITIAL} sidebar=${SIDEBAR_OPEN}`,
      );
      yield* ctx.expectNear(
        "the top pane paints its initial height",
        yield* bound(ctx, "outer-pane-a", "height"),
        OUTER_INITIAL,
        2,
      );
      yield* ctx.expectNear(
        "the inner pane paints its initial width",
        yield* bound(ctx, "inner-pane-a", "width"),
        INNER_INITIAL,
        2,
      );

      ctx.host.drag("outer-divider", 0, 48);
      yield* ctx.expectContains(
        "the vertical drag grew the top pane",
        state(ctx),
        `outer=${OUTER_INITIAL + 48}`,
      );
      yield* ctx.expectNear(
        "the vertical pane repainted at its new height",
        yield* bound(ctx, "outer-pane-a", "height"),
        OUTER_INITIAL + 48,
        2,
      );
      yield* ctx.expectContains(
        "the vertical drag left the nested split alone",
        state(ctx),
        `inner=${INNER_INITIAL}`,
      );

      ctx.host.drag("inner-divider", 60, 0);
      yield* ctx.expectContains(
        "the nested drag grew the inner pane",
        state(ctx),
        `inner=${INNER_INITIAL + 60}`,
      );
      yield* ctx.expectNear(
        "the nested pane repainted at its new width",
        yield* bound(ctx, "inner-pane-a", "width"),
        INNER_INITIAL + 60,
        2,
      );
      yield* ctx.expectContains(
        "the nested drag left its parent alone",
        state(ctx),
        `outer=${OUTER_INITIAL + 48}`,
      );

      ctx.host.click("panel-sidebar-toggle");
      yield* ctx.expectContains(
        "the sidebar collapses",
        state(ctx),
        "sidebar=0",
      );
      yield* ctx.expectNear(
        "the collapsed sidebar has no painted width",
        yield* bound(ctx, "panel-sidebar", "width"),
        0,
        1,
      );
      yield* ctx.expectContains(
        "the collapsed sidebar left the nested split alone",
        state(ctx),
        `inner=${INNER_INITIAL + 60}`,
      );

      ctx.host.click("panel-sidebar-toggle");
      yield* ctx.expectContains(
        "the sidebar expands again",
        state(ctx),
        `sidebar=${SIDEBAR_OPEN}`,
      );
      yield* ctx.expectNear(
        "the expanded sidebar paints its width",
        yield* bound(ctx, "panel-sidebar", "width"),
        SIDEBAR_OPEN,
        2,
      );

      ctx.host.click("inner-divider");
      const dividerFocus = yield* ctx.expectSome(
        "the divider takes native focus",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the focused node is the divider",
        dividerFocus,
        "inner-divider",
      );

      ctx.host.key("right");
      yield* ctx.expectContains(
        "ArrowRight grows the divider's pane",
        state(ctx),
        `inner=${INNER_INITIAL + 60 + 16}`,
      );
      yield* ctx.expectNear(
        "the keyboard resize repaints",
        yield* bound(ctx, "inner-pane-a", "width"),
        INNER_INITIAL + 60 + 16,
        2,
      );
      ctx.host.key("left");
      yield* ctx.expectContains(
        "ArrowLeft shrinks it back",
        state(ctx),
        `inner=${INNER_INITIAL + 60}`,
      );

      // The divider is a stop in the native traversal chain: one Tab leaves it.
      // The reverse edge does not re-enter this nested divider (measured; §8).
      ctx.host.focusNext();
      const afterDivider = yield* ctx.expectSome(
        "traversal leaves the divider",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        `Tab moved off the divider (to ${afterDivider})`,
        afterDivider === "inner-divider",
        false,
      );

      const tree = yield* ctx.expectSome(
        "the runtime painted an accessibility tree",
        Option.fromNullishOr(ctx.host.a11y()),
      );
      const divider = yield* ctx.expectSome(
        "the divider is exposed to assistive technology",
        nodeFor(tree, "inner-divider"),
      );
      yield* ctx.expectEqual(
        `the divider's role is reported (${text(divider.role)})`,
        text(divider.role) === "none",
        false,
      );
      yield* ctx.expectEqual(
        "the divider's size rides on aria-valuetext",
        text(divider.value),
        `${INNER_INITIAL + 60}px`,
      );
    }),
};
