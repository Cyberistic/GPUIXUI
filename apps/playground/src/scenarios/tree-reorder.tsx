/**
 * `tree-reorder` — a hierarchical reorder inside a virtualized file tree.
 *
 * Plans `165` (flatten, indent, roving focus), `391` (the flat drop rule) and
 * `187` (event payloads) left one composition open: moving a **subtree**. This
 * probe measures the rules a file tree cannot guess:
 *
 * - a drop is a row plus `before` / `after` / `into`; `into` is the middle half
 *   of a directory with an indent step of horizontal travel, so a file never
 *   takes a child;
 * - the source is the whole subtree, and every moved node's depth shifts;
 * - a drop into the source's own descendant is refused, visibly;
 * - a collapsed target opens on drop and after a 500 ms hover;
 * - a `<virtual-list>` keeps its anchor across the move and the reflow.
 *
 * Measured facts: plan `392` §9.
 */
import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-key.js";
import { awaitReadout } from "./await-readout.js";
import { fieldOf, read } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  describeRows,
  indicatorAt,
  isMoved,
  moveSubtree,
  targetAt,
  visibleIndexOf,
  visibleRows,
  type DropTarget,
  type TreeItem,
  type TreeRow,
} from "./tree-reorder-model.js";

const ROW_HEIGHT = 32;
const V_ROW_HEIGHT = 24;
const V_HEIGHT = 240;
const INDENT_STEP = 16;
const HOVER_MS = 500;
const DRAG_THRESHOLD = 2;

const dir = (id: string, depth: number): TreeItem => ({
  id,
  kind: "dir",
  depth,
});
const file = (id: string, depth: number): TreeItem => ({
  id,
  kind: "file",
  depth,
});

/** The plain tree: four roots, one nested directory, three depths. */
const PLAIN: ReadonlyArray<TreeItem> = [
  dir("dir-0", 0),
  file("dir-0/a", 1),
  file("dir-0/b", 1),
  dir("dir-1", 0),
  file("dir-1/a", 1),
  file("dir-1/b", 1),
  dir("dir-1/sub", 1),
  file("dir-1/sub/a", 2),
  file("dir-1/sub/b", 2),
  dir("dir-2", 0),
  file("dir-2/a", 1),
  file("dir-2/b", 1),
  dir("dir-3", 0),
  file("dir-3/a", 1),
  file("dir-3/b", 1),
];

/** The virtual tree: `dir-0` holds eight files, the rest are empty folders. */
const VIRTUAL: ReadonlyArray<TreeItem> = Arr.appendAll(
  Arr.appendAll(
    [dir("dir-0", 0)],
    Arr.map(Arr.range(0, 7), (n) => file(`dir-0/f-${n}`, 1)),
  ),
  Arr.map(Arr.range(1, 29), (n) => dir(`dir-${n}`, 0)),
);

const VIRTUAL_EXPANDED: ReadonlyArray<string> = ["dir-0"];

interface Gesture {
  readonly id: string;
  readonly mode: "pointer" | "keyboard";
  readonly moved: boolean;
  readonly target: Option.Option<DropTarget>;
}

interface LastMove {
  readonly id: string;
  readonly at: number;
  readonly depth: number;
  readonly parent: string;
}

interface Config {
  readonly name: string;
  readonly initial: ReadonlyArray<TreeItem>;
  readonly initialExpanded: ReadonlyArray<string>;
  readonly rowHeight: number;
  readonly indentStep: number;
  readonly virtual: boolean;
}

const describeLast = (move: Option.Option<LastMove>): string =>
  Option.match(move, {
    onNone: () => "id=none at=none depth=none parent=none",
    onSome: (value) =>
      `id=${value.id} at=${value.at} depth=${value.depth} parent=${value.parent}`,
  });

/** The tree state machine, shared by the plain and the virtual sections. */
const useTree = (config: Config) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<Option.Option<PublicInstance>>(Option.none());
  const frameRef = useRef<Option.Option<PublicInstance>>(Option.none());
  const gesture = useRef<Option.Option<Gesture>>(Option.none());
  const pressY = useRef(0);
  const suppressClick = useRef(false);

  const [items, setItems] = useState(config.initial);
  const [expanded, setExpanded] = useState(config.initialExpanded);
  const [pending, setPending] = useState(Option.none<Gesture>());
  const [last, setLast] = useState(Option.none<LastMove>());
  const [refused, setRefused] = useState(Option.none<string>());
  const [activations, setActivations] = useState(0);
  const [log, setLog] = useState<ReadonlyArray<string>>([]);

  const rows = visibleRows(items, expanded);

  const record = (entry: string): void =>
    setLog((current) => Arr.append(current, entry));

  const setGesture = (next: Option.Option<Gesture>): void => {
    gesture.current = next;
    setPending(next);
  };

  const locate = (
    nextItems: ReadonlyArray<TreeItem>,
    nextExpanded: ReadonlyArray<string>,
    id: string,
  ): Option.Option<LastMove> => {
    const nextRows = visibleRows(nextItems, nextExpanded);
    return Option.flatMap(visibleIndexOf(nextRows, id), (at) =>
      Option.map(Arr.get(nextRows, at), (row) => ({
        id,
        at,
        depth: row.depth,
        parent: Option.getOrElse(row.parent, () => "root"),
      })),
    );
  };

  /** Commits a drop; returns whether the order changed. */
  const apply = (id: string, target: DropTarget): boolean => {
    const result = moveSubtree(items, id, target);
    if (!isMoved(result)) {
      setRefused(Option.some(result.reason));
      record(`refused:${result.reason}`);
      return false;
    }
    const nextExpanded =
      target.edge === "into" && !Arr.contains(expanded, target.id)
        ? Arr.append(expanded, target.id)
        : expanded;
    setItems(result.items);
    setExpanded(nextExpanded);
    setRefused(Option.none());
    setLast(locate(result.items, nextExpanded, id));
    record(`drop:${target.edge}:${target.id}`);
    return true;
  };

  const frame = (): {
    readonly left: number;
    readonly top: number;
    readonly offset: number;
  } =>
    Option.match(
      Option.orElse(frameRef.current, () => list.current),
      {
        onNone: () => ({ left: 0, top: 0, offset: 0 }),
        onSome: (instance) => {
          const bounds = Option.fromNullishOr(
            renderer?.getElementBounds?.(instance.id) ?? null,
          );
          const offset = config.virtual
            ? Option.getOrElse(
                Option.flatMap(list.current, (scroll) =>
                  Option.map(
                    Option.fromNullishOr(
                      renderer?.getListScrollTop?.(scroll.id) ?? null,
                    ),
                    (anchor) =>
                      (anchor[0] ?? 0) * config.rowHeight + (anchor[1] ?? 0),
                  ),
                ),
                () => 0,
              )
            : -(renderer?.getScrollOffset?.(instance.id)?.[1] ?? 0);
          return {
            left: Option.getOrElse(
              Option.map(bounds, (box) => box.x),
              () => 0,
            ),
            top: Option.getOrElse(
              Option.map(bounds, (box) => box.y),
              () => 0,
            ),
            offset,
          };
        },
      },
    );

  const onDown =
    (id: string) =>
    (event: EventPayload): void => {
      pressY.current = event.y ?? 0;
      setRefused(Option.none());
      setGesture(
        Option.some({
          id,
          mode: "pointer",
          moved: false,
          target: Option.none(),
        }),
      );
      record(`down:${id}`);
    };

  const onMove = (event: EventPayload): void => {
    Option.match(gesture.current, {
      onNone: () => undefined,
      onSome: (current) => {
        if (current.mode !== "pointer") return;
        const next = targetAt(
          { x: event.x ?? 0, y: event.y ?? 0 },
          {
            ...frame(),
            rowHeight: config.rowHeight,
            indentStep: config.indentStep,
          },
          rows,
        );
        const moved =
          current.moved ||
          Math.abs((event.y ?? 0) - pressY.current) > DRAG_THRESHOLD;
        const same = Option.match(next, {
          onNone: () => false,
          onSome: (candidate) =>
            Option.match(current.target, {
              onNone: () => false,
              onSome: (currentTarget) =>
                candidate.id === currentTarget.id &&
                candidate.edge === currentTarget.edge,
            }),
        });
        if (same && moved === current.moved) return;
        setGesture(Option.some({ ...current, moved, target: next }));
        Option.match(next, {
          onNone: () => undefined,
          onSome: (value) => record(`target:${value.edge}:${value.id}`),
        });
      },
    });
  };

  const onUp = (id: string) => (): void => {
    Option.match(gesture.current, {
      onNone: () => undefined,
      onSome: (current) => {
        if (current.mode !== "pointer") return;
        const changed = Option.match(current.target, {
          onNone: () => false,
          onSome: (target) => (current.moved ? apply(id, target) : false),
        });
        if (changed) suppressClick.current = true;
        setGesture(Option.none());
      },
    });
  };

  const onClick = (id: string) => (): void => {
    if (suppressClick.current) {
      suppressClick.current = false;
      record(`suppress:${id}`);
      return;
    }
    setActivations((count) => count + 1);
    record(`click:${id}`);
  };

  const cancel = (): void => {
    Option.match(gesture.current, {
      onNone: () => undefined,
      onSome: () => {
        record("cancel");
        setGesture(Option.none());
      },
    });
  };

  /** The first target a lifted row offers: the gap after its own subtree. */
  const liftTarget = (id: string): Option.Option<DropTarget> =>
    Option.flatMap(visibleIndexOf(rows, id), (at) => {
      const size = Arr.length(
        Arr.takeWhile(
          Arr.drop(rows, at + 1),
          (row) =>
            row.depth >
            Option.getOrElse(
              Option.map(Arr.get(rows, at), (row) => row.depth),
              () => 0,
            ),
        ),
      );
      return Option.map(Arr.get(rows, at + 1 + size), (row) => ({
        id: row.id,
        edge: "before" as const,
      }));
    });

  const onKeyDown =
    (id: string) =>
    (event: EventPayload): void => {
      const key = event.key ?? "";
      Option.match(gesture.current, {
        onNone: () => {
          if (key !== "enter" && key !== "space") return;
          setGesture(
            Option.some({
              id,
              mode: "keyboard",
              moved: true,
              target: liftTarget(id),
            }),
          );
          record(`lift:${id}`);
        },
        onSome: (current) => {
          if (key === "escape") return cancel();
          if (current.mode !== "keyboard" || current.id !== id) return;
          if (key === "enter") {
            Option.match(current.target, {
              onNone: () => undefined,
              onSome: (target) => {
                apply(id, target);
                setGesture(Option.none());
              },
            });
            return;
          }
          if (key === "right" || key === "left") {
            setGesture(
              Option.some({
                ...current,
                target: Option.map(current.target, (target) => ({
                  ...target,
                  edge:
                    key === "right" ? ("into" as const) : ("after" as const),
                })),
              }),
            );
            record(`edge:${key}`);
            return;
          }
          if (key !== "down" && key !== "up") return;
          Option.match(current.target, {
            onNone: () => undefined,
            onSome: (target) => {
              /** The next row in `delta`'s direction, skipping the source. */
              const step = (
                at: number,
                delta: number,
              ): Option.Option<TreeRow> =>
                Option.match(Arr.get(rows, at + delta), {
                  onNone: () => Option.none(),
                  onSome: (row) =>
                    row.id === id ? step(at + delta, delta) : Option.some(row),
                });
              Option.match(visibleIndexOf(rows, target.id), {
                onNone: () => undefined,
                onSome: (at) =>
                  Option.match(step(at, key === "down" ? 1 : -1), {
                    onNone: () => undefined,
                    onSome: (row) => {
                      setGesture(
                        Option.some({
                          ...current,
                          target: Option.some({ id: row.id, edge: "before" }),
                        }),
                      );
                      record(`step:${row.id}`);
                    },
                  }),
              });
            },
          });
        },
      });
    };

  /** A collapsed directory under an `into` target opens after a dwell. */
  const target = Option.flatMap(pending, (current) => current.target);
  const targetKey = Option.match(target, {
    onNone: () => "none",
    onSome: (value) => `${value.edge}:${value.id}`,
  });
  useEffect(() => {
    const value = Option.getOrUndefined(target);
    if (value === undefined || value.edge !== "into") return;
    const row = Option.getOrUndefined(
      Arr.findFirst(rows, (candidate) => candidate.id === value.id),
    );
    if (row === undefined || row.kind !== "dir") return;
    if (Arr.contains(expanded, row.id)) return;
    const timer = setTimeout(() => {
      setExpanded((current) => Arr.append(current, row.id));
      record(`expand:${row.id}`);
    }, HOVER_MS);
    return () => clearTimeout(timer);
  }, [targetKey, expanded]);

  const toggle = (id: string): void =>
    setExpanded((current) =>
      Arr.contains(current, id)
        ? Arr.filter(current, (value) => value !== id)
        : Arr.append(current, id),
    );

  const reset = (): void => {
    setItems(config.initial);
    setExpanded(config.initialExpanded);
    setGesture(Option.none());
    setLast(Option.none());
    setRefused(Option.none());
    setActivations(0);
    setLog([]);
    suppressClick.current = false;
  };

  const indicator = Option.flatMap(target, (value) => indicatorAt(rows, value));

  const drag = Option.match(pending, {
    onNone: () => "none",
    onSome: (current) => current.id,
  });
  const targetText = Option.match(target, {
    onNone: () => "none",
    onSome: (value) => `${value.edge}:${value.id}`,
  });
  const state =
    `drag=${drag} target=${targetText} ` +
    `boundary=${Option.match(indicator, { onNone: () => "none", onSome: (value) => `${value.boundary}` })} ` +
    `depth=${Option.match(indicator, { onNone: () => "none", onSome: (value) => `${value.depth}` })} ` +
    `refused=${Option.getOrElse(refused, () => "none")} open=${expanded.length} ` +
    `visible=${rows.length} size=${items.length} activations=${activations}`;

  return {
    theme,
    rows,
    expanded,
    indicator,
    target,
    state,
    order: describeRows(rows),
    last: describeLast(last),
    log: Arr.join(log, ">"),
    onDown,
    onMove,
    onUp,
    onClick,
    onKeyDown,
    cancel,
    toggle,
    reset,
    attach: (instance: PublicInstance | null): void => {
      list.current = Option.fromNullishOr(instance);
    },
    attachFrame: (instance: PublicInstance | null): void => {
      frameRef.current = Option.fromNullishOr(instance);
    },
  };
};

type Tree = ReturnType<typeof useTree>;

const Handle = ({
  tree,
  id,
  testId,
  height,
}: {
  readonly tree: Tree;
  readonly id: string;
  readonly testId: string;
  readonly height: number;
}) => {
  const theme = tree.theme;
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      aria-label={`Reorder ${id}`}
      onMouseDown={tree.onDown(id)}
      onMouseMove={tree.onMove}
      onMouseUp={tree.onUp(id)}
      onClick={tree.onClick(id)}
      onKeyDown={tree.onKeyDown(id)}
      style={{
        width: 20,
        height: Math.max(16, height - 8),
        flexShrink: 0,
        cursor: "grab",
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
      }}
    />
  );
};

const TreeRows = ({
  tree,
  name,
  rowHeight,
}: {
  readonly tree: Tree;
  readonly name: string;
  readonly rowHeight: number;
}) => (
  <>
    {Arr.map(tree.rows, (row: TreeRow) => {
      const open = Arr.contains(tree.expanded, row.id);
      return (
        <div
          key={row.id}
          testId={`${name}-node-${row.id}`}
          role="treeitem"
          aria-level={row.depth + 1}
          aria-expanded={row.kind === "dir" ? open : undefined}
          style={{
            height: rowHeight,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 4 + row.depth * INDENT_STEP,
            backgroundColor: tree.theme.colors.card,
          }}
        >
          {row.kind === "dir" ? (
            <div
              testId={`${name}-toggle-${row.id}`}
              onClick={() => tree.toggle(row.id)}
              style={{
                width: 16,
                height: rowHeight - 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <text
                style={{
                  fontSize: 12,
                  color: tree.theme.colors.mutedForeground,
                }}
              >
                {open ? "−" : "+"}
              </text>
            </div>
          ) : (
            <div style={{ width: 16 }} />
          )}
          <Handle
            tree={tree}
            id={row.id}
            testId={`${name}-handle-${row.id}`}
            height={rowHeight}
          />
          <text
            testId={`${name}-label-${row.id}`}
            style={{
              fontFamily: tree.theme.typography.mono,
              fontSize: 12,
              color: tree.theme.colors.foreground,
            }}
          >
            {row.id}
          </text>
        </div>
      );
    })}
  </>
);

const Section = ({
  tree,
  name,
  width,
  virtual,
}: {
  readonly tree: Tree;
  readonly name: string;
  readonly width: number;
  readonly virtual: boolean;
}) => {
  const theme = tree.theme;
  const indicator = Option.match(tree.indicator, {
    onNone: () => null,
    onSome: (value) => (
      <div
        testId={`${name}-indicator`}
        style={{
          position: "absolute",
          top: value.boundary * (virtual ? V_ROW_HEIGHT : ROW_HEIGHT),
          left: value.depth * INDENT_STEP,
          width: width - value.depth * INDENT_STEP,
          height: 2,
          backgroundColor: theme.colors.primary,
          pointerEvents: "none",
        }}
      />
    ),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width }}>
      <div
        style={{
          height: 88,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Readout testId={`${name}-state`}>{tree.state}</Readout>
        <Readout testId={`${name}-order`}>{tree.order}</Readout>
        <Readout testId={`${name}-last`}>{tree.last}</Readout>
      </div>
      {virtual ? (
        <div
          testId={`${name}-frame`}
          ref={tree.attachFrame}
          style={{ width, height: V_HEIGHT }}
        >
          <virtual-list
            testId={`${name}-list`}
            ref={tree.attach}
            estimatedItemHeight={V_ROW_HEIGHT}
            style={{ width, height: V_HEIGHT }}
          >
            <TreeRows tree={tree} name={name} rowHeight={V_ROW_HEIGHT} />
          </virtual-list>
        </div>
      ) : (
        <div
          testId={`${name}-list`}
          ref={tree.attach}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width,
            backgroundColor: theme.colors.background,
          }}
        >
          <TreeRows tree={tree} name={name} rowHeight={ROW_HEIGHT} />
          {indicator}
        </div>
      )}
      <Readout testId={`${name}-log`}>{tree.log}</Readout>
    </div>
  );
};

/** The probe; exported so the live twin mounts the same tree. */
export const TreeReorderProbe = () => {
  const plain = useTree({
    name: "tree",
    initial: PLAIN,
    initialExpanded: [],
    rowHeight: ROW_HEIGHT,
    indentStep: INDENT_STEP,
    virtual: false,
  });
  const virtual = useTree({
    name: "tree-v",
    initial: VIRTUAL,
    initialExpanded: VIRTUAL_EXPANDED,
    rowHeight: V_ROW_HEIGHT,
    indentStep: INDENT_STEP,
    virtual: true,
  });
  useWindowKey((event) => {
    if (event.key !== "escape") return;
    plain.cancel();
    virtual.cancel();
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 24,
        padding: 24,
        backgroundColor: plain.theme.colors.background,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          testId="tree-reset"
          onClick={plain.reset}
          style={{
            width: 80,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: plain.theme.radius.sm,
            backgroundColor: plain.theme.colors.muted,
          }}
        >
          <text style={{ fontSize: 12, color: plain.theme.colors.foreground }}>
            reset
          </text>
        </div>
        <Section tree={plain} name="tree" width={340} virtual={false} />
      </div>
      <Section tree={virtual} name="tree-v" width={320} virtual />
    </div>
  );
};

const box = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} is painted`,
    Option.fromNullishOr(ctx.host.bounds(testId)),
  );

const focused = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

const stateField = (
  ctx: Smoke.SmokeContext,
  name: string,
  key: string,
): string =>
  Option.getOrElse(fieldOf(read(ctx, `${name}-state`), key), () => "none");

export const treeReorderScenario: PlaygroundScenario = {
  id: "tree-reorder",
  title: "Hierarchical reorder: into, between, cycles and the flat index",
  capability: "tree-reorder",
  view: () => <TreeReorderProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. The plain tree starts collapsed.
      yield* ctx.expectEqual(
        "the tree starts with its four roots",
        read(ctx, "tree-order"),
        "dir-0,dir-1,dir-2,dir-3",
      );
      yield* ctx.expectContains(
        "no drop target exists before a gesture",
        read(ctx, "tree-state"),
        "target=none",
      );
      yield* ctx.expectContains(
        "the plain tree holds 15 nodes",
        read(ctx, "tree-state"),
        "open=0 visible=4 size=15",
      );
      yield* ctx.expectEqual(
        "no indicator paints before a gesture",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("tree-indicator"))),
        true,
      );

      // 2. Opening a folder reveals its children and their indent.
      ctx.host.click("tree-toggle-dir-1");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "opening dir-1 paints its children",
        read(ctx, "tree-order"),
        "dir-0,dir-1,dir-1/a,dir-1/b,dir-1/sub,dir-2,dir-3",
      );
      const dirOneRow = yield* box(ctx, "tree-node-dir-1");
      const dirOne = yield* box(ctx, "tree-label-dir-1");
      const child = yield* box(ctx, "tree-label-dir-1/a");
      yield* ctx.expectNear(
        "a child indents one step",
        child.x - dirOne.x,
        INDENT_STEP,
        1,
      );

      // 3. A between drop at depth 0: dir-2 before dir-1.
      const list = yield* box(ctx, "tree-list");
      const betweenY = dirOneRow.y + 4;
      ctx.host.press("tree-handle-dir-2");
      ctx.host.movePointer(list.x + 8, betweenY);
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the pointer names a before target",
        read(ctx, "tree-state"),
        "target=before:dir-1",
      );
      yield* ctx.expectContains(
        "a between target sits at the row's depth",
        read(ctx, "tree-state"),
        "boundary=1 depth=0",
      );
      const line = yield* box(ctx, "tree-indicator");
      yield* ctx.expectNear(
        "the indicator paints on the gap",
        line.y,
        dirOneRow.y,
        1,
      );
      ctx.host.releasePointer(list.x + 8, betweenY);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the between drop moves the row before its target",
        read(ctx, "tree-order"),
        "dir-0,dir-2,dir-1,dir-1/a,dir-1/b,dir-1/sub,dir-3",
      );
      yield* ctx.expectEqual(
        "the moved row reports its flattened index and parent",
        read(ctx, "tree-last"),
        "id=dir-2 at=1 depth=0 parent=root",
      );
      yield* ctx.expectEqual(
        "the gesture-ending click did not activate the row",
        stateField(ctx, "tree", "activations"),
        "0",
      );
      yield* ctx.expectContains(
        "the ending click was suppressed",
        read(ctx, "tree-log"),
        "suppress:dir-2",
      );
      const movedRoot = yield* box(ctx, "tree-node-dir-2");
      yield* ctx.expectNear(
        "the moved root paints one row below dir-0",
        movedRoot.y,
        (yield* box(ctx, "tree-node-dir-0")).y + ROW_HEIGHT,
        1,
      );

      // 4. An into drop: dir-3 becomes dir-0's first child and dir-0 opens.
      const targetRow = yield* box(ctx, "tree-node-dir-0");
      const intoY = targetRow.y + ROW_HEIGHT / 2;
      const intoX = targetRow.x + INDENT_STEP + 4;
      ctx.host.press("tree-handle-dir-3");
      ctx.host.movePointer(intoX, intoY);
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "an indented middle names an into target",
        read(ctx, "tree-state"),
        "target=into:dir-0",
      );
      yield* ctx.expectContains(
        "an into target paints one row down and one level in",
        read(ctx, "tree-state"),
        "boundary=1 depth=1",
      );
      ctx.host.releasePointer(intoX, intoY);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the into drop makes the source the first child",
        read(ctx, "tree-order"),
        "dir-0,dir-3,dir-0/a,dir-0/b,dir-2,dir-1,dir-1/a,dir-1/b,dir-1/sub",
      );
      yield* ctx.expectContains(
        "the target opens on drop",
        read(ctx, "tree-state"),
        "open=2 visible=9",
      );
      yield* ctx.expectEqual(
        "the child reports depth and parent",
        read(ctx, "tree-last"),
        "id=dir-3 at=1 depth=1 parent=dir-0",
      );
      const nested = yield* box(ctx, "tree-label-dir-3");
      const rootLabel = yield* box(ctx, "tree-label-dir-0");
      yield* ctx.expectNear(
        "the child paints at the parent's indentation plus one step",
        nested.x,
        rootLabel.x + INDENT_STEP,
        1,
      );

      // 5. Cycles are refused, not applied.
      const sub = yield* box(ctx, "tree-node-dir-1/sub");
      ctx.host.press("tree-handle-dir-1");
      ctx.host.movePointer(sub.x + INDENT_STEP * 2 + 4, sub.y + ROW_HEIGHT / 2);
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the descendant target is an into target",
        read(ctx, "tree-state"),
        "target=into:dir-1/sub",
      );
      ctx.host.releasePointer(
        sub.x + INDENT_STEP * 2 + 4,
        sub.y + ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "dropping a directory into its descendant is refused",
        read(ctx, "tree-state"),
        "refused=descendant",
      );
      yield* ctx.expectEqual(
        "the refused drop leaves the order alone",
        read(ctx, "tree-order"),
        "dir-0,dir-3,dir-0/a,dir-0/b,dir-2,dir-1,dir-1/a,dir-1/b,dir-1/sub",
      );
      yield* ctx.expectEqual(
        "the refused drop leaves no indicator",
        Option.isNone(Option.fromNullishOr(ctx.host.bounds("tree-indicator"))),
        true,
      );

      const self = yield* box(ctx, "tree-node-dir-1");
      ctx.host.press("tree-handle-dir-1");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the self press starts a drag",
        read(ctx, "tree-state"),
        "drag=dir-1",
      );
      ctx.host.movePointer(
        self.x + INDENT_STEP + 4,
        self.y + ROW_HEIGHT / 2 + 4,
      );
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the self target is the row itself",
        read(ctx, "tree-state"),
        "target=into:dir-1 ",
      );
      ctx.host.releasePointer(
        self.x + INDENT_STEP + 4,
        self.y + ROW_HEIGHT / 2 + 4,
      );
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "dropping a row on itself is refused",
        read(ctx, "tree-state"),
        "refused=self",
      );

      // 6. Hovering over a collapsed directory expands it after a dwell.
      const collapsed = yield* box(ctx, "tree-node-dir-1/sub");
      ctx.host.press("tree-handle-dir-2");
      ctx.host.movePointer(
        collapsed.x + INDENT_STEP * 2 + 4,
        collapsed.y + ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "hovering a collapsed directory names an into target",
        read(ctx, "tree-state"),
        "target=into:dir-1/sub",
      );
      yield* awaitReadout(ctx, "tree-state", "open=3");
      yield* ctx.expectContains(
        "the dwell opens the target",
        read(ctx, "tree-log"),
        "expand:dir-1/sub",
      );
      yield* ctx.expectEqual(
        "the hovered children paint",
        Option.isSome(
          Option.fromNullishOr(ctx.host.bounds("tree-node-dir-1/sub/a")),
        ),
        true,
      );
      ctx.host.key("escape");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "Escape cancels a hover without a move",
        stateField(ctx, "tree", "drag"),
        "none",
      );
      ctx.host.releasePointer(
        collapsed.x + INDENT_STEP * 2 + 4,
        collapsed.y + ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);

      // 7. A subtree keeps its shape when it is moved.
      ctx.host.click("tree-reset");
      ctx.host.advance(0);
      ctx.host.click("tree-toggle-dir-1");
      ctx.host.advance(0);
      const dirTwo = yield* box(ctx, "tree-node-dir-2");
      const dirTwoLabel = yield* box(ctx, "tree-label-dir-2");
      ctx.host.press("tree-handle-dir-1");
      ctx.host.movePointer(
        dirTwo.x + INDENT_STEP + 4,
        dirTwo.y + ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);
      ctx.host.releasePointer(
        dirTwo.x + INDENT_STEP + 4,
        dirTwo.y + ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the moved subtree keeps its children",
        read(ctx, "tree-last"),
        "id=dir-1 at=2 depth=1 parent=dir-2",
      );
      ctx.host.click("tree-toggle-dir-1/sub");
      ctx.host.advance(0);
      const subtreeRoot = yield* box(ctx, "tree-label-dir-1");
      const subtreeRow = yield* box(ctx, "tree-node-dir-1");
      const subtreeChild = yield* box(ctx, "tree-label-dir-1/sub");
      const leaf = yield* box(ctx, "tree-label-dir-1/sub/a");
      const movedParent = yield* box(ctx, "tree-node-dir-2");
      yield* ctx.expectNear(
        "the moved root is one level deep",
        subtreeRoot.x,
        dirTwoLabel.x + INDENT_STEP,
        1,
      );
      yield* ctx.expectNear(
        "the moved grandchild is two levels deep",
        subtreeChild.x,
        dirTwoLabel.x + INDENT_STEP * 2,
        1,
      );
      yield* ctx.expectNear(
        "the moved leaf is three levels deep",
        leaf.x,
        dirTwoLabel.x + INDENT_STEP * 3,
        1,
      );
      yield* ctx.expectNear(
        "the moved parent paints one row below its new parent",
        subtreeRow.y,
        movedParent.y + ROW_HEIGHT,
        1,
      );

      // 8. Keyboard: lift, choose the gap, indent, drop.
      ctx.host.click("tree-reset");
      ctx.host.advance(0);
      ctx.host.click("tree-toggle-dir-1");
      ctx.host.advance(0);
      ctx.host.click("tree-handle-dir-2");
      ctx.host.advance(0);
      ctx.host.keyDown("tree-handle-dir-2", "enter");
      ctx.host.advance(0);
      ctx.host.keyDown("tree-handle-dir-2", "up");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the keyboard target lands before the previous row",
        read(ctx, "tree-state"),
        "target=before:dir-1/sub",
      );
      ctx.host.keyDown("tree-handle-dir-2", "right");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "Right turns the gap into a child target",
        read(ctx, "tree-state"),
        "target=into:dir-1/sub",
      );
      ctx.host.keyDown("tree-handle-dir-2", "enter");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the keyboard drop nests the row",
        read(ctx, "tree-last"),
        "id=dir-2 at=5 depth=2 parent=dir-1/sub",
      );
      yield* ctx.expectEqual(
        "native focus follows the keyed move",
        focused(ctx),
        "tree-handle-dir-2",
      );

      // 9. The virtual tree: an into drop keeps the anchor.
      yield* ctx.expectContains(
        "the virtual tree paints its visible window",
        read(ctx, "tree-v-state"),
        "open=1 visible=38 size=38",
      );
      ctx.host.scrollToItem("tree-v-list", 20);
      ctx.host.advance(0);
      const anchor = yield* ctx.expectSome(
        "the virtual list reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("tree-v-list")),
      );
      yield* ctx.expectEqual(
        "the virtual list anchors at row 20",
        anchor[0],
        20,
      );
      const virtualTarget = yield* box(ctx, "tree-v-node-dir-17");
      const virtualTargetLabel = yield* box(ctx, "tree-v-label-dir-17");
      ctx.host.press("tree-v-handle-dir-19");
      ctx.host.movePointer(
        virtualTarget.x + INDENT_STEP + 4,
        virtualTarget.y + V_ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "the virtual target is the hovered directory",
        read(ctx, "tree-v-state"),
        "target=into:dir-17",
      );
      ctx.host.releasePointer(
        virtualTarget.x + INDENT_STEP + 4,
        virtualTarget.y + V_ROW_HEIGHT / 2,
      );
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the virtual drop reports its new flattened index",
        read(ctx, "tree-v-last"),
        "id=dir-19 at=26 depth=1 parent=dir-17",
      );
      const virtualMoved = yield* box(ctx, "tree-v-node-dir-19");
      yield* ctx.expectNear(
        "the virtual moved row paints right below its parent",
        virtualMoved.y,
        virtualTarget.y + V_ROW_HEIGHT,
        1,
      );
      const virtualMovedLabel = yield* box(ctx, "tree-v-label-dir-19");
      yield* ctx.expectNear(
        "the virtual moved row indents one step",
        virtualMovedLabel.x,
        virtualTargetLabel.x + INDENT_STEP,
        1,
      );
      const after = yield* ctx.expectSome(
        "the virtual list still reports its anchor",
        Option.fromNullishOr(ctx.host.listScrollTop("tree-v-list")),
      );
      yield* ctx.expectEqual(
        "the virtual anchor survives the reorder",
        `${after[0]},${after[1]},${after[2]}`,
        "20,0,240",
      );
      yield* ctx.expectEqual(
        "the virtual list keeps every row",
        stateField(ctx, "tree-v", "size"),
        "38",
      );

      ctx.host.screenshot(
        "apps/playground/.artifacts/screenshots/tree-reorder.png",
      );
    }),
};
