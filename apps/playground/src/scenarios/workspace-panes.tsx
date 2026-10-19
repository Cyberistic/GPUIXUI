/**
 * `workspace-panes` — a tabbed workspace composed from the pieces the earlier
 * probes measured one at a time: a vertical split, a tab strip, two panes and a
 * `<virtual-list>`.
 *
 * The composition is where the API decisions are, and none of these was
 * measured:
 *
 * - **hide vs unmount** — `display: "none"` turned out to be a **no-op** in
 *   0.10.0 (the binding maps `display` only for `"flex"`/`"grid"`), so the
 *   probe measures the honest mechanism: absolute slots with
 *   `visibility: "hidden"` keeping each pane mounted and its state intact.
 * - **the tab order** — does a hidden pane's control stop being a tab stop?
 * - **scroll chaining** — a wheel at the bottom of a nested scroller: does it
 *   escape into the ancestor scroller?
 * - **a resized pane** — does the `<virtual-list>` re-window when a split drag
 *   changes its height, and does its anchor survive?
 *
 * The pane state lives **inside** each pane (not in the shell) so an unmounting
 * tab switch loses it — that is what makes the preservation checks meaningful.
 *
 * Measured facts: plan `177` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout, Pressable } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import type { PlaygroundScenario } from "../types.js";

const TOP_INITIAL = 240;
const TREE_ROWS = 40;
const TREE_ROW_HEIGHT = 24;
const LOG_ROWS = 60;
const LOG_ROW_HEIGHT = 20;
const INNER_ROWS = 30;
const INNER_ROW_HEIGHT = 20;

/** The editor pane's draft is local: unmounting this pane must lose it. */
const EditorPane = ({ height }: { readonly height: number }) => {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  return (
    <div
      testId="ws-pane-editor"
      style={{ display: "flex", flexDirection: "column", gap: 4, height }}
    >
      <Readout testId="ws-editor-marker">Editor pane</Readout>
      <input
        testId="ws-editor"
        value={draft}
        aria-label="draft"
        placeholder="type a draft"
        onChange={(event) => setDraft(event.value ?? "")}
        style={{
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          padding: 6,
        }}
      />
      <Readout testId="ws-draft">{`draft=${draft === "" ? "-" : draft}`}</Readout>
    </div>
  );
};

/**
 * The tree pane owns its pick and its virtual list, so a remount resets both.
 *
 * The list height is explicit: a `height: "100%"` chain through the split's
 * pane, a tab strip and two nested flex levels does not resolve in 0.10.0, so a
 * tabbed pane derives its content height from the split size (measured §8).
 */
const TreePane = ({ height }: { readonly height: number }) => {
  const theme = useTheme();
  const [pick, setPick] = useState("none");
  return (
    <div
      testId="ws-pane-tree"
      style={{ display: "flex", flexDirection: "column", gap: 4, height }}
    >
      <Readout testId="ws-tree-marker">File tree</Readout>
      <Readout testId="ws-tree-pick">{`pick=${pick}`}</Readout>
      <Pressable testId="ws-tree-action" onClick={() => setPick("action")}>
        <text>tree action</text>
      </Pressable>
      <div style={{ display: "flex", height: Math.max(48, height - 104) }}>
        <virtual-list
          testId="ws-tree"
          estimatedItemHeight={TREE_ROW_HEIGHT}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {Array.from({ length: TREE_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`ws-tree-row-${index}`}
              onClick={() => setPick(`${index}`)}
              style={{ height: TREE_ROW_HEIGHT, paddingLeft: 4 }}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`tree row ${index}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

/**
 * A log pane: a scroll container with a nested scroller above its rows.
 *
 * `guarded` sets `pointerEvents: "auto"` on the inner scroller. The type
 * documents that this blocks the ancestor's wheel; the probe measures it,
 * because without it a nested pane cannot own its scroll edge.
 */
const LogPane = ({
  height,
  guarded,
}: {
  readonly height: number;
  readonly guarded: boolean;
}) => {
  const theme = useTheme();
  return (
    <div
      testId="ws-log-outer"
      style={{
        height,
        overflowY: "scroll",
        backgroundColor: theme.colors.muted,
      }}
    >
      <div
        testId="ws-log-inner"
        style={{
          height: 120,
          overflowY: "scroll",
          pointerEvents: guarded ? "auto" : "none",
          backgroundColor: theme.colors.card,
        }}
      >
        {Array.from({ length: INNER_ROWS }, (_, index) => (
          <div
            key={index}
            testId={`ws-inner-row-${index}`}
            style={{
              height: INNER_ROW_HEIGHT,
              paddingLeft: 4,
              backgroundColor: theme.colors.card,
            }}
          >
            <text style={{ color: theme.colors.foreground }}>
              {`inner row ${index}`}
            </text>
          </div>
        ))}
      </div>
      {Array.from({ length: LOG_ROWS }, (_, index) => (
        <div
          key={index}
          testId={`ws-log-row-${index}`}
          style={{ height: LOG_ROW_HEIGHT, paddingLeft: 4 }}
        >
          <text style={{ color: theme.colors.mutedForeground }}>
            {`log row ${index}`}
          </text>
        </div>
      ))}
    </div>
  );
};

const WorkspacePanesProbe = () => {
  const theme = useTheme();
  const [active, setActive] = useState<"tree" | "editor">("tree");
  const [guarded, setGuarded] = useState(false);
  const [top, setTop] = useState(TOP_INITIAL);
  // GPUix applies `display` only for "flex" and "grid" (pinned source,
  // `apply_styles`), so a hidden pane cannot use `display: "none"`. The slots
  // overlap absolutely and the inactive one is `visibility: "hidden"` with
  // pointer events off, which keeps its state and layout while it leaves the
  // paint. See plan `177` §8.
  const contentHeight = Math.max(80, top - 46);
  const logHeight = Math.max(80, 394 - top);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: 640,
        height: 420,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Readout testId="ws-readout">{`active=${active} top=${top} guard=${guarded ? "on" : "off"}`}</Readout>
        <Pressable
          testId="ws-log-guard"
          onClick={() => setGuarded((current) => !current)}
        >
          <text>guard wheel</text>
        </Pressable>
      </div>
      <div style={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <SplitPane
          id="workspace"
          orientation="vertical"
          initial={TOP_INITIAL}
          min={140}
          max={320}
          onResize={setTop}
          label="Resize the workspace and the log"
          primary={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                backgroundColor: theme.colors.background,
              }}
            >
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <Pressable
                  testId="ws-tab-tree"
                  onClick={() => setActive("tree")}
                >
                  <text>Files</text>
                </Pressable>
                <Pressable
                  testId="ws-tab-editor"
                  onClick={() => setActive("editor")}
                >
                  <text>Editor</text>
                </Pressable>
              </div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: contentHeight,
                }}
              >
                <div
                  testId="ws-slot-tree"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: contentHeight,
                    visibility: active === "tree" ? "visible" : "hidden",
                    pointerEvents: active === "tree" ? "auto" : "none",
                  }}
                >
                  <TreePane height={contentHeight} />
                </div>
                <div
                  testId="ws-slot-editor"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: contentHeight,
                    visibility: active === "editor" ? "visible" : "hidden",
                    pointerEvents: active === "editor" ? "auto" : "none",
                  }}
                >
                  <EditorPane height={contentHeight} />
                </div>
              </div>
            </div>
          }
          secondary={<LogPane height={logHeight} guarded={guarded} />}
        />
      </div>
    </div>
  );
};

const focused = (host: Smoke.SmokeHost): string =>
  Option.getOrElse(Option.fromNullishOr(host.focused()), () => "none");

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

const paintedRows = (ctx: Smoke.SmokeContext, prefix: string): number =>
  Arr.length(
    Arr.filter(ctx.host.paintedText(), (line) => Str.startsWith(prefix)(line)),
  );

const anchorOf = (
  ctx: Smoke.SmokeContext,
): Smoke.SmokeHost extends never ? never : readonly [number, number, number] =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.listScrollTop("ws-tree")),
    () => [0, 0, 0] as const,
  );

export const workspacePanesScenario: PlaygroundScenario = {
  id: "workspace-panes",
  title: "Tabbed panes: hidden state, tab order, nested scroll and resize",
  capability: "workspace",
  view: () => <WorkspacePanesProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const paintedBefore = paintedRows(ctx, "tree row ");
      yield* ctx.expectEqual(
        "the tree pane paints its virtual rows",
        paintedBefore > 0,
        true,
      );
      yield* ctx.expectEqual(
        "the inactive editor pane does not paint",
        ctx.host.paintedText().join("\n").includes("Editor pane"),
        false,
      );
      yield* ctx.expectEqual(
        "the inactive editor pane stays mounted",
        Option.isSome(Option.fromNullishOr(ctx.host.text("ws-editor-marker"))),
        true,
      );

      ctx.host.click("ws-tree-row-2");
      yield* ctx.expectContains(
        "a painted tree row records its pick",
        readout(ctx, "ws-tree-pick"),
        "pick=2",
      );

      ctx.host.drag("workspace-divider", 0, -60);
      yield* ctx.expectContains(
        "the vertical drag resized the workspace",
        readout(ctx, "ws-readout"),
        `top=${TOP_INITIAL - 60}`,
      );
      const paintedAfter = paintedRows(ctx, "tree row ");
      yield* ctx.expectEqual(
        "a shorter pane paints fewer virtual rows",
        paintedAfter < paintedBefore,
        true,
      );
      yield* ctx.expectEqual(
        "the list anchor survives the resize",
        anchorOf(ctx)[0],
        0,
      );

      ctx.host.scrollToItem("ws-tree", 20);
      yield* ctx.expectEqual(
        "scrollToItem anchors the tree",
        anchorOf(ctx)[0],
        20,
      );

      ctx.host.click("ws-tab-editor");
      yield* ctx.expectContains(
        "the tab switch activates the editor",
        readout(ctx, "ws-readout"),
        "active=editor",
      );
      yield* ctx.expectEqual(
        "the hidden tree pane leaves the paint",
        paintedRows(ctx, "tree row "),
        0,
      );
      ctx.host.click("ws-editor");
      ctx.host.key("n");
      ctx.host.key("o");
      ctx.host.key("t");
      yield* ctx.expectContains(
        "the editor keeps a local draft",
        readout(ctx, "ws-draft"),
        "draft=not",
      );

      ctx.host.click("ws-tab-tree");
      yield* ctx.expectEqual(
        "the tree pane repaints on its tab",
        paintedRows(ctx, "tree row ") > 0,
        true,
      );
      yield* ctx.expectContains(
        "a hidden pane keeps its pick",
        readout(ctx, "ws-tree-pick"),
        "pick=2",
      );
      yield* ctx.expectEqual(
        "a hidden pane keeps its list anchor",
        anchorOf(ctx)[0],
        20,
      );
      ctx.host.click("ws-tab-editor");
      yield* ctx.expectContains(
        "a hidden pane keeps its draft",
        readout(ctx, "ws-draft"),
        "draft=not",
      );

      ctx.host.click("ws-tab-editor");
      ctx.host.focusNext();
      yield* ctx.expectEqual(
        "a hidden pane leaves the tab order",
        focused(ctx.host),
        "ws-editor",
      );
      ctx.host.click("ws-tab-tree");
      ctx.host.focusNext();
      ctx.host.focusNext();
      yield* ctx.expectEqual(
        "the visible pane's control is the next stop",
        focused(ctx.host),
        "ws-tree-action",
      );

      const scrollY = (testId: string): number =>
        Option.match(Option.fromNullishOr(ctx.host.scrollOffset(testId)), {
          onNone: () => -1,
          onSome: (offset) => offset.y,
        });

      ctx.host.wheel("ws-log-inner", 0, -240);
      yield* ctx.expectEqual(
        "the nested scroller takes the wheel",
        scrollY("ws-log-inner"),
        -240,
      );
      yield* ctx.expectEqual(
        "an unguarded nested scroller chains to its ancestor",
        scrollY("ws-log-outer"),
        -240,
      );

      // The chained scroll pushed the inner out of view, so the way back is
      // over a visible outer row; that also proves the outer owns its own wheel.
      ctx.host.wheel("ws-log-row-10", 0, 240);
      yield* ctx.expectEqual(
        "a wheel on an outer row returns the outer scroller",
        scrollY("ws-log-outer"),
        0,
      );
      yield* ctx.expectEqual(
        "the inner keeps its offset while the outer moves",
        scrollY("ws-log-inner"),
        -240,
      );
      // The chain is proven above; this block pins the headless tracker defect:
      // a child's box is recorded only when that child paints, so after an
      // ancestor scroll the inner still reports the box it had while scrolled
      // away (y=-8 with the outer at 0). A pointer wheel is therefore aimed at
      // the wrong point, which is why the guard below is exercised over a
      // visible inner row, not over the container. main's on_painted tracker
      // fixes it (plan 529 §6.3).
      ctx.host.paint();
      const innerBox = Option.fromNullishOr(ctx.host.bounds("ws-log-inner"));
      const outerBox = Option.fromNullishOr(ctx.host.bounds("ws-log-outer"));
      yield* ctx.expectEqual(
        "the ancestor scroll leaves the inner's recorded box stale",
        Option.exists(innerBox, (box) =>
          Option.exists(outerBox, (outer) => box.y < outer.y),
        ),
        true,
      );

      ctx.host.click("ws-log-guard");
      yield* ctx.expectContains(
        "the wheel guard is on",
        readout(ctx, "ws-readout"),
        "guard=on",
      );
      ctx.host.wheel("ws-inner-row-14", 0, -120);
      yield* ctx.expectEqual(
        "the guarded inner scroller takes the wheel",
        scrollY("ws-log-inner"),
        -360,
      );
      yield* ctx.expectEqual(
        "the guard stops the wheel at the inner scroller",
        scrollY("ws-log-outer"),
        0,
      );

      ctx.host.scrollToItem("ws-tree", 30);
      ctx.host.drag("workspace-divider", 0, 60);
      yield* ctx.expectEqual(
        "the taller pane repaints more rows",
        paintedRows(ctx, "tree row ") > paintedAfter,
        true,
      );
      yield* ctx.expectEqual(
        "the list anchor survives the second resize",
        anchorOf(ctx)[0],
        30,
      );
    }),
};
