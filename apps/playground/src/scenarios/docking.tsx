/**
 * Tier 4 probe: `docking-layout`.
 *
 * The pieces of a workspace were measured one at a time (`panel-resize`,
 * `panel-nested`, `workspace-tab-drag`, `workspace-panes`,
 * `workspace-restore`). This probe measures the composition a docking grid
 * needs, and the four mechanics none of those covered:
 *
 * - a pane's rectangle read by component code during a gesture
 *   (`ref` → `PublicInstance.id` → `renderer.getElementBounds`);
 * - a pixel-exact drop indicator inside a nested `position: "relative"` pane;
 * - an edge drop that wraps the target group in a new split, with the emptied
 *   source pruned and its split collapsed;
 * - a recursive layout, including every nested divider size, restored through
 *   a keyed remount.
 *
 * The tree model, its geometry and its drop rules are pure (`panels/dock.ts`).
 * Measured facts: plan `184` §7.
 */
import { useCallback, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { SplitPane } from "../panels/split-pane.js";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  INITIAL_DOCK,
  SURFACE_HEIGHT,
  SURFACE_WIDTH,
  activate,
  decodeDock,
  describeDock,
  dropSize,
  dropTab,
  encodeDock,
  groups,
  indicatorRect,
  rects,
  resize,
  zoneAt,
  type DockEdge,
  type DockGroup,
  type DockNode,
  type Rectangle,
} from "../panels/dock.js";

/** A point in window coordinates, as GPUI reports input. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** The pane region under the pointer during a drag. */
interface DropTarget {
  readonly group: string;
  readonly edge: DockEdge;
  readonly box: Rectangle;
}

interface Drag {
  readonly tabId: string;
  readonly from: string;
  readonly target: Option.Option<DropTarget>;
}

/** The group under `point`, if any, with the zone and box the drop would use. */
const hitTest = (
  node: DockNode,
  surface: Rectangle,
  point: Point,
): Option.Option<DropTarget> => {
  const boxes = rects(node, surface);
  return Option.flatMap(
    Arr.findFirst(groups(node), (candidate) =>
      Option.match(Option.fromNullishOr(boxes[candidate.id]), {
        onNone: () => false,
        onSome: (box) => Option.isSome(zoneAt(point, box)),
      }),
    ),
    (candidate) =>
      Option.flatMap(Option.fromNullishOr(boxes[candidate.id]), (box) =>
        Option.map(zoneAt(point, box), (edge) => ({
          group: candidate.id,
          edge,
          box,
        })),
      ),
  );
};

const DockGroupView = ({
  group,
  target,
  onSelect,
  onPress,
  onMove,
  onRelease,
}: {
  readonly group: DockGroup;
  readonly target: Option.Option<DropTarget>;
  readonly onSelect: (groupId: string, tabId: string) => void;
  readonly onPress: (groupId: string, tabId: string) => void;
  readonly onMove: (point: Point) => void;
  readonly onRelease: () => void;
}) => {
  const theme = useTheme();
  const indicator = Option.match(target, {
    onNone: () => null,
    onSome: (drop) => {
      const bar = indicatorRect(drop.edge, drop.box);
      return (
        <div
          testId={`dock-indicator-${group.id}`}
          style={{
            position: "absolute",
            left: bar.x,
            top: bar.y,
            width: bar.width,
            height: bar.height,
            backgroundColor: theme.colors.primary,
            opacity: drop.edge === "center" ? 0.18 : 1,
            pointerEvents: "none",
          }}
        />
      );
    },
  });

  return (
    <div
      testId={`dock-group-${group.id}`}
      aria-id={`dock-group-${group.id}`}
      role="region"
      aria-label={group.title}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <div
        role="tablist"
        aria-id={`dock-tablist-${group.id}`}
        aria-label={group.title}
        style={{
          display: "flex",
          gap: 2,
          padding: 4,
          flexShrink: 0,
          backgroundColor: theme.colors.muted,
        }}
      >
        {group.tabs.map((tab) => (
          <div
            key={tab.id}
            testId={`dock-tab-${tab.id}`}
            role="tab"
            aria-selected={group.active === tab.id}
            tabIndex={0}
            onClick={() => onSelect(group.id, tab.id)}
            onMouseDown={() => onPress(group.id, tab.id)}
            onMouseMove={(event) =>
              onMove({ x: event.x ?? 0, y: event.y ?? 0 })
            }
            onMouseUp={() => onRelease()}
            style={{
              padding: 4,
              borderRadius: 4,
              cursor: "pointer",
              backgroundColor:
                group.active === tab.id
                  ? theme.colors.card
                  : theme.colors.muted,
              hover: { backgroundColor: theme.colors.card },
            }}
          >
            <text style={{ color: theme.colors.foreground }}>{tab.title}</text>
          </div>
        ))}
        {group.tabs.length === 0 ? (
          <text style={{ color: theme.colors.placeholder }}>empty</text>
        ) : null}
      </div>
      <div
        role="tabpanel"
        aria-id={`dock-tabpanel-${group.id}`}
        aria-label={`${group.title} body`}
        style={{ flexGrow: 1, minHeight: 0, padding: 6 }}
      >
        <Readout testId={`dock-body-${group.id}`}>{`${group.id}:${
          group.active === "" ? "none" : group.active
        }`}</Readout>
      </div>
      {indicator}
    </div>
  );
};

const DockTree = ({
  node,
  target,
  onSelect,
  onPress,
  onMove,
  onRelease,
  onResize,
}: {
  readonly node: DockNode;
  readonly target: Option.Option<DropTarget>;
  readonly onSelect: (groupId: string, tabId: string) => void;
  readonly onPress: (groupId: string, tabId: string) => void;
  readonly onMove: (point: Point) => void;
  readonly onRelease: () => void;
  readonly onResize: (splitId: string, size: number) => void;
}) =>
  node.kind === "group" ? (
    <DockGroupView
      group={node}
      target={Option.filter(target, (drop) => drop.group === node.id)}
      onSelect={onSelect}
      onPress={onPress}
      onMove={onMove}
      onRelease={onRelease}
    />
  ) : (
    // The key is load bearing: a collapse reparents the surviving split into
    // its parent's position, and without it React reuses the parent's state.
    <SplitPane
      key={node.id}
      id={node.id}
      orientation={node.orientation}
      initial={node.size}
      min={node.min}
      max={node.max}
      label={`Resize ${node.id}`}
      onResize={(size) => onResize(node.id, size)}
      primary={
        <DockTree
          node={node.primary}
          target={target}
          onSelect={onSelect}
          onPress={onPress}
          onMove={onMove}
          onRelease={onRelease}
          onResize={onResize}
        />
      }
      secondary={
        <DockTree
          node={node.secondary}
          target={target}
          onSelect={onSelect}
          onPress={onPress}
          onMove={onMove}
          onRelease={onRelease}
          onResize={onResize}
        />
      }
    />
  );

const DockingProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [tree, setTree] = useState<DockNode>(INITIAL_DOCK);
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState<Option.Option<string>>(Option.none());
  const [notice, setNotice] = useState("none");
  const [drag, setDrag] = useState<Option.Option<Drag>>(Option.none());
  const surfaceId = useRef<Option.Option<number>>(Option.none());
  const dropSequence = useRef(0);

  const surfaceRef = useCallback((instance: PublicInstance | null) => {
    surfaceId.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);

  const move = (point: Point) =>
    Option.match(drag, {
      onNone: () => {},
      onSome: (current) => {
        const surface = Option.flatMap(surfaceId.current, (id) =>
          Option.fromNullishOr(renderer?.getElementBounds?.(id)),
        );
        const target = Option.flatMap(surface, (box) =>
          hitTest(tree, box, point),
        );
        setDrag(Option.some({ ...current, target }));
      },
    });

  const release = () =>
    Option.match(drag, {
      onNone: () => {},
      onSome: (current) => {
        Option.match(current.target, {
          onNone: () => {},
          onSome: (target) => {
            const extent =
              target.edge === "left" || target.edge === "right"
                ? target.box.width
                : target.box.height;
            const { size, min, max } = dropSize(extent);
            dropSequence.current += 1;
            const sequence = dropSequence.current;
            setTree((node) =>
              dropTab(node, {
                tabId: current.tabId,
                target: target.group,
                edge: target.edge,
                newGroup: `panel-${sequence}`,
                newSplit: `split-${sequence}`,
                title: `Panel ${sequence}`,
                size,
                min,
                max,
              }),
            );
          },
        });
        setDrag(Option.none());
      },
    });

  const save = () => {
    setSaved(Option.some(encodeDock(tree)));
    setNotice("saved");
    setDrag(Option.none());
  };

  const reset = () => {
    setTree(INITIAL_DOCK);
    setVersion((current) => current + 1);
    setNotice("reset");
    setDrag(Option.none());
  };

  const restore = () =>
    Option.match(saved, {
      onNone: () => setNotice("none"),
      onSome: (json) =>
        Option.match(decodeDock(json), {
          onNone: () => setNotice("invalid"),
          onSome: (node) => {
            setTree(node);
            setVersion((current) => current + 1);
            setNotice("restored");
            setDrag(Option.none());
          },
        }),
    });

  const dragText = Option.match(drag, {
    onNone: () => "none",
    onSome: (current) =>
      `${current.tabId}@${current.from}>${Option.match(current.target, {
        onNone: () => "none",
        onSome: (target) => `${target.group}:${target.edge}`,
      })}`,
  });

  const onSelect = (groupId: string, tabId: string) =>
    setTree((node) => activate(node, groupId, tabId));
  const onPress = (groupId: string, tabId: string) =>
    setDrag(
      Option.some({
        tabId,
        from: groupId,
        target: Option.none(),
      }),
    );
  const onResize = (splitId: string, size: number) =>
    setTree((node) => resize(node, splitId, size));

  return (
    <div
      testId="dock-root"
      style={{
        width: SURFACE_WIDTH,
        height: SURFACE_HEIGHT + 80,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="dock-signature">{describeDock(tree)}</Readout>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Readout testId="dock-drag">{dragText}</Readout>
        <Readout testId="dock-saved">{`saved=${
          Option.isSome(saved) ? "yes" : "no"
        } notice=${notice}`}</Readout>
        <Pressable testId="dock-save" onClick={save}>
          <text>save</text>
        </Pressable>
        <Pressable testId="dock-restore" onClick={restore}>
          <text>restore</text>
        </Pressable>
        <Pressable testId="dock-reset" onClick={reset}>
          <text>reset</text>
        </Pressable>
      </div>
      <div
        testId="dock-surface"
        ref={surfaceRef}
        style={{
          width: SURFACE_WIDTH,
          height: SURFACE_HEIGHT,
          backgroundColor: theme.colors.background,
        }}
      >
        <DockTree
          key={version}
          node={tree}
          target={Option.flatMap(drag, (current) => current.target)}
          onSelect={onSelect}
          onPress={onPress}
          onMove={move}
          onRelease={release}
          onResize={onResize}
        />
      </div>
    </div>
  );
};

export const dockingScenario: PlaygroundScenario = {
  id: "docking-layout",
  title: "Docking: drop zones, split creation, prune and layout restore",
  capability: "docking",
  view: () => <DockingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const read = (testId: string): string =>
        Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");
      const boxOf = (testId: string) =>
        ctx.expectSome(
          `bounds of ${testId}`,
          Option.fromNullishOr(ctx.host.bounds(testId)),
        );
      const surface = yield* boxOf("dock-surface");
      const near = (label: string, actual: number, expected: number) =>
        ctx.expectNear(label, actual, expected, 1);

      const INITIAL =
        "left=explorer,search,notes@explorer editor=main.ts@main.ts terminal=shell@shell main=h240 centre=v320";
      const AFTER_RIGHT =
        "left=explorer,notes@explorer editor=main.ts@main.ts panel-1=search@search terminal=shell@shell main=h240 centre=v320 split-1=h324";
      const AFTER_TOP =
        "left=explorer,notes@explorer editor=main.ts@main.ts panel-2=shell@shell panel-1=search@search main=h240 split-1=h324 split-2=v157";
      const SAVED =
        "left=explorer,notes@explorer editor=main.ts@main.ts panel-2=shell@shell panel-1=search@search main=h280 split-1=h324 split-2=v197";

      yield* ctx.expectEqual(
        "initial dock signature",
        read("dock-signature"),
        INITIAL,
      );

      const left = yield* boxOf("dock-group-left");
      yield* near(
        "the left group starts at the surface origin",
        left.x,
        surface.x,
      );
      yield* near(
        "the left group is the split's primary size",
        left.width,
        240,
      );
      yield* near("the left group fills the surface height", left.height, 480);

      const editor = yield* boxOf("dock-group-editor");
      yield* near(
        "the editor starts after the divider",
        editor.x,
        left.x + 246,
      );
      yield* near("the editor takes the remaining width", editor.width, 654);
      yield* near(
        "the editor is the vertical split's primary size",
        editor.height,
        320,
      );

      const terminal = yield* boxOf("dock-group-terminal");
      yield* near(
        "the terminal starts below the divider",
        terminal.y,
        editor.y + 326,
      );
      yield* near(
        "the terminal takes the remaining height",
        terminal.height,
        154,
      );

      ctx.host.press("dock-tab-search");
      ctx.host.movePointer(editor.x + editor.width - 20, editor.y + 160);
      yield* ctx.expectEqual(
        "a held move over the right band targets the editor's right edge",
        read("dock-drag"),
        "search@left>editor:right",
      );
      const rightBar = yield* boxOf("dock-indicator-editor");
      yield* near(
        "the right bar ends at the pane's right edge",
        rightBar.x,
        editor.x + editor.width - 4,
      );
      yield* near("the right bar is the pane's height", rightBar.height, 320);
      yield* ctx.expectEqual(
        "the drop indicator is the theme's primary colour",
        Option.getOrElse(
          Option.map(
            Option.fromNullishOr(
              ctx.host.paintedStyle("dock-indicator-editor"),
            ),
            (style) => Option.getOrElse(style.backgroundColor, () => ""),
          ),
          () => "",
        ),
        palettes.dark.colors.primary,
      );
      ctx.host.releasePointer(editor.x + editor.width - 20, editor.y + 160);
      yield* ctx.expectEqual(
        "the right drop split the editor",
        read("dock-signature"),
        AFTER_RIGHT,
      );
      const panelOne = yield* boxOf("dock-group-panel-1");
      const editorAfterDrop = yield* boxOf("dock-group-editor");
      yield* near(
        "the editor keeps the primary half",
        editorAfterDrop.width,
        324,
      );
      yield* near(
        "the new group takes the secondary half",
        panelOne.width,
        324,
      );
      yield* near(
        "the new group starts after the new divider",
        panelOne.x,
        editorAfterDrop.x + 330,
      );
      yield* ctx.expectEqual(
        "the indicator leaves once the drop is applied",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds("dock-indicator-editor")),
        ),
        true,
      );

      ctx.host.press("dock-tab-shell");
      ctx.host.movePointer(panelOne.x + 100, panelOne.y + 20);
      yield* ctx.expectEqual(
        "a held move over the top band targets that pane's top edge",
        read("dock-drag"),
        "shell@terminal>panel-1:top",
      );
      const topBar = yield* boxOf("dock-indicator-panel-1");
      yield* near("the top bar spans the pane", topBar.width, 324);
      yield* near(
        "the top bar sits on the pane's top edge",
        topBar.y,
        panelOne.y,
      );

      ctx.host.releasePointer(panelOne.x + 100, panelOne.y + 20);
      yield* ctx.expectEqual(
        "the top drop nested a split",
        read("dock-signature"),
        AFTER_TOP,
      );
      yield* ctx.expectEqual(
        "the emptied terminal group is gone",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds("dock-group-terminal")),
        ),
        true,
      );
      const panelTwo = yield* boxOf("dock-group-panel-2");
      const panelOneAfterDrop = yield* boxOf("dock-group-panel-1");
      const editorAfterCollapse = yield* boxOf("dock-group-editor");
      yield* near(
        "the collapsed centre gives the split the full height",
        editorAfterCollapse.height,
        480,
      );
      yield* near(
        "the top group is the new split's primary size",
        panelTwo.height,
        157,
      );
      yield* near(
        "the target group keeps the rest",
        panelOneAfterDrop.height,
        317,
      );
      yield* near(
        "the target group starts after the vertical divider",
        panelOneAfterDrop.y,
        panelTwo.y + 163,
      );

      ctx.host.drag("split-2-divider", 0, 40);
      yield* ctx.expectContains(
        "the nested divider resized its split",
        read("dock-signature"),
        "split-2=v197",
      );
      const panelTwoResized = yield* boxOf("dock-group-panel-2");
      const panelOneResized = yield* boxOf("dock-group-panel-1");
      yield* near("the primary pane grew", panelTwoResized.height, 197);
      yield* near("the secondary pane shrank", panelOneResized.height, 277);

      ctx.host.drag("main-divider", 40, 0);
      yield* ctx.expectContains(
        "the outer divider resized",
        read("dock-signature"),
        "main=h280",
      );
      const leftResized = yield* boxOf("dock-group-left");
      yield* near(
        "the left group took the pointer delta",
        leftResized.width,
        280,
      );
      const editorResized = yield* boxOf("dock-group-editor");
      yield* near(
        "the outer resize moved the whole nested layout",
        editorResized.x,
        surface.x + 286,
      );
      yield* near(
        "the nested split kept its primary size",
        editorResized.width,
        324,
      );
      const panelOneNarrow = yield* boxOf("dock-group-panel-1");
      yield* near(
        "the nested split's secondary took the shrink",
        panelOneNarrow.width,
        284,
      );

      ctx.host.click("dock-save");
      yield* ctx.expectContains(
        "the layout was saved",
        read("dock-saved"),
        "saved=yes",
      );

      ctx.host.click("dock-reset");
      yield* ctx.expectEqual(
        "a reset returns to the initial layout",
        read("dock-signature"),
        INITIAL,
      );
      yield* ctx.expectContains(
        "the saved layout survives the reset",
        read("dock-saved"),
        "saved=yes",
      );

      ctx.host.click("dock-restore");
      yield* ctx.expectEqual(
        "the saved layout is restored",
        read("dock-signature"),
        SAVED,
      );
      const leftRestored = yield* boxOf("dock-group-left");
      yield* near(
        "the outer divider size was restored",
        leftRestored.width,
        280,
      );
      const panelTwoRestored = yield* boxOf("dock-group-panel-2");
      const panelOneRestored = yield* boxOf("dock-group-panel-1");
      yield* near(
        "the nested primary size was restored",
        panelTwoRestored.height,
        197,
      );
      yield* near(
        "the nested secondary size was restored",
        panelOneRestored.height,
        277,
      );
      yield* ctx.expectEqual(
        "the pruned group was not resurrected",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds("dock-group-terminal")),
        ),
        true,
      );

      ctx.host.click("dock-tab-notes");
      yield* ctx.expectContains(
        "the restored tree answers a tab click",
        read("dock-signature"),
        "left=explorer,notes@notes",
      );

      const nodes = Option.match(Option.fromNullishOr(ctx.host.a11y()), {
        onNone: () => [],
        onSome: (tree) =>
          Arr.getSomes(Arr.map(R.values(tree.nodes), (entry) => entry.aria)),
      });
      const hasRole = (node: Smoke.A11yNode, role: string): boolean =>
        Option.match(node.role, {
          onNone: () => false,
          onSome: (value) => value === role,
        });
      yield* ctx.expectEqual(
        "a panel is an announced region",
        Arr.some(
          nodes,
          (node) =>
            hasRole(node, "Region") &&
            Option.match(node.label, {
              onNone: () => false,
              onSome: (label) => label === "Left panel",
            }),
        ),
        true,
      );
      yield* ctx.expectEqual(
        "the tabs are announced as selected tabs",
        Arr.some(
          nodes,
          (node) =>
            hasRole(node, "Tab") &&
            Option.match(node.selected, {
              onNone: () => false,
              onSome: (selected) => selected,
            }),
        ),
        true,
      );

      const editorRestored = yield* boxOf("dock-group-editor");
      ctx.host.press("dock-tab-explorer");
      ctx.host.movePointer(
        editorRestored.x + editorRestored.width / 2,
        editorRestored.y + editorRestored.height / 2,
      );
      yield* ctx.expectEqual(
        "a held move over a pane's body targets the centre",
        read("dock-drag"),
        "explorer@left>editor:center",
      );
      const centreIndicator = yield* boxOf("dock-indicator-editor");
      yield* near(
        "the centre indicator covers the pane's width",
        centreIndicator.width,
        324,
      );
      yield* near(
        "the centre indicator covers the pane's height",
        centreIndicator.height,
        480,
      );
      ctx.host.releasePointer(
        editorRestored.x + editorRestored.width / 2,
        editorRestored.y + editorRestored.height / 2,
      );
      yield* ctx.expectContains(
        "a centre drop merges without creating a split",
        read("dock-signature"),
        "editor=main.ts,explorer@explorer",
      );
      yield* ctx.expectContains(
        "the source kept its last tab",
        read("dock-signature"),
        "left=notes@notes",
      );

      const editorFinal = yield* boxOf("dock-group-editor");
      ctx.host.press("dock-tab-notes");
      ctx.host.movePointer(
        editorFinal.x + editorFinal.width / 2,
        editorFinal.y + editorFinal.height / 2,
      );
      ctx.host.releasePointer(
        editorFinal.x + editorFinal.width / 2,
        editorFinal.y + editorFinal.height / 2,
      );
      yield* ctx.expectEqual(
        "emptying the left pane collapses the outer split",
        read("dock-signature"),
        "editor=main.ts,explorer,notes@notes panel-2=shell@shell panel-1=search@search split-1=h324 split-2=v197",
      );
      yield* ctx.expectEqual(
        "the emptied group is gone",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("dock-group-left"))),
        true,
      );
      yield* ctx.expectEqual(
        "the collapsed divider is gone",
        Option.isNone(
          Option.fromNullishOr(ctx.host.bounds("dock-main-divider")),
        ),
        true,
      );
      const editorAtOrigin = yield* boxOf("dock-group-editor");
      yield* near(
        "the survivor takes the surface origin",
        editorAtOrigin.x,
        surface.x,
      );
      yield* near(
        "the survivor keeps its own split size",
        editorAtOrigin.width,
        324,
      );
      yield* ctx.expectEqual(
        "the last move is active",
        read("dock-body-editor"),
        "editor:notes",
      );
    }),
};
