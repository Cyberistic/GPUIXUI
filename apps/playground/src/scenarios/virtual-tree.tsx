/**
 * `virtualized-tree` — a file tree: a flattened tree inside a `<virtual-list>`.
 *
 * Three pieces are proven separately: `tree-view` indents and toggles a short
 * flat list, `virtual-list-window` paints a window of rows, and `roving-focus`
 * moves focus between virtual rows. A file tree is all three at once, and two
 * facts are new: does `paddingLeft` still indent inside a virtual row, and does
 * a **changing row count** (expand 40 children, collapse them) leave the painted
 * window and the roving index consistent?
 *
 * The probe implements the tree contract itself — flatten, indent, toggle, move
 * native focus with `renderer.focusElement` — so it measures the component
 * mechanism, not a host helper.
 *
 * Honest limit, recorded by `a11y-tree`: the accessibility tree follows the
 * painted window, so an off-window row is invisible to assistive technology.
 *
 * Measured facts: plan `165` §8.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const DIRECTORIES = 8;
const FILES_PER_DIRECTORY = 40;
const ROW_HEIGHT = 32;

interface TreeNode {
  readonly id: string;
  readonly kind: "dir" | "file";
  readonly depth: number;
  readonly parent: Option.Option<string>;
}

/** `dir-0`, then its 40 files, then `dir-1`, … — the flattening input. */
const NODES: ReadonlyArray<TreeNode> = Arr.flatten(
  Arr.map(Arr.range(0, DIRECTORIES - 1), (directory) => {
    const id = `dir-${directory}`;
    return [
      {
        id,
        kind: "dir" as const,
        depth: 0,
        parent: Option.none<string>(),
      },
      ...Arr.map(Arr.range(0, FILES_PER_DIRECTORY - 1), (file) => ({
        id: `${id}/file-${file}`,
        kind: "file" as const,
        depth: 1,
        parent: Option.some(id),
      })),
    ];
  }),
);

/** The rows a tree paints: a file is visible only while its parent is open. */
export const visibleTreeNodes = (
  nodes: ReadonlyArray<TreeNode>,
  expanded: ReadonlyArray<string>,
): ReadonlyArray<TreeNode> =>
  Arr.filter(nodes, (node) =>
    Option.match(node.parent, {
      onNone: () => true,
      onSome: (parent) => Arr.contains(expanded, parent),
    }),
  );

const clamp = (index: number, last: number): number =>
  Math.min(Math.max(index, 0), last);

const TreeProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const nativeIds = useRef<HashMap.HashMap<string, number>>(HashMap.empty());
  const [expanded, setExpanded] = useState<ReadonlyArray<string>>([]);
  const [selected, setSelected] = useState("dir-0");

  const visible = visibleTreeNodes(NODES, expanded);
  const isOpen = (id: string): boolean => Arr.contains(expanded, id);

  const toggle = (node: TreeNode): void => {
    if (node.kind !== "dir") return;
    setExpanded((current) =>
      Arr.contains(current, node.id)
        ? Arr.filter(current, (id) => id !== node.id)
        : Arr.append(current, node.id),
    );
  };

  const focusNode = (id: string): void =>
    Option.match(HashMap.get(nativeIds.current, id), {
      onNone: () => undefined,
      onSome: (nativeId) => renderer?.focusElement?.(nativeId),
    });

  const select = (node: TreeNode): void => {
    setSelected(node.id);
    focusNode(node.id);
  };

  const move = (node: TreeNode, delta: number): void =>
    Option.match(
      Arr.findFirstIndex(visible, (candidate) => candidate.id === node.id),
      {
        onNone: () => undefined,
        onSome: (index) =>
          Option.match(
            Arr.get(visible, clamp(index + delta, visible.length - 1)),
            {
              onNone: () => undefined,
              onSome: select,
            },
          ),
      },
    );

  const firstChild = (node: TreeNode): Option.Option<TreeNode> =>
    Arr.findFirst(visible, (candidate) =>
      Option.contains(candidate.parent, node.id),
    );

  const onKeyDown = (node: TreeNode) => (event: EventPayload) => {
    if (event.key === "down") return move(node, 1);
    if (event.key === "up") return move(node, -1);
    if (event.key === "enter" || event.key === "space") return toggle(node);
    if (event.key === "right") {
      if (node.kind !== "dir") return;
      if (!isOpen(node.id)) return toggle(node);
      return Option.match(firstChild(node), {
        onNone: () => undefined,
        onSome: select,
      });
    }
    if (event.key !== "left") return;
    if (node.kind === "dir" && isOpen(node.id)) return toggle(node);
    Option.match(node.parent, {
      onNone: () => undefined,
      onSome: (parent) => {
        select(
          Option.getOrElse(
            Arr.findFirst(NODES, (candidate) => candidate.id === parent),
            () => node,
          ),
        );
      },
    });
  };

  const attach = (id: string) => (instance: PublicInstance | null) => {
    nativeIds.current = Option.match(Option.fromNullishOr(instance), {
      onNone: () => HashMap.remove(nativeIds.current, id),
      onSome: (element) => HashMap.set(nativeIds.current, id, element.id),
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        height: 340,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="vtree-readout">
        {`selected=${selected} visible=${visible.length} open=${expanded.length}`}
      </Readout>
      <div testId="vtree-viewport" style={{ display: "flex", height: 280 }}>
        <virtual-list testId="vtree-list" style={{ flexGrow: 1, minHeight: 0 }}>
          {Arr.map(visible, (node) => (
            <div
              key={node.id}
              testId={`vtree-node-${node.id}`}
              ref={attach(node.id)}
              tabIndex={selected === node.id ? 0 : -1}
              role="treeitem"
              aria-level={node.depth + 1}
              aria-expanded={node.kind === "dir" ? isOpen(node.id) : undefined}
              onClick={() => {
                setSelected(node.id);
                toggle(node);
              }}
              onKeyDown={onKeyDown(node)}
              style={{
                height: ROW_HEIGHT,
                display: "flex",
                alignItems: "center",
                paddingLeft: 4 + node.depth * 16,
                backgroundColor:
                  selected === node.id
                    ? theme.colors.muted
                    : theme.colors.background,
                hover: { backgroundColor: theme.colors.muted },
              }}
            >
              <text
                testId={`vtree-label-${node.id}`}
                style={{
                  fontFamily: theme.typography.mono,
                  color: theme.colors.foreground,
                }}
              >
                {`${node.kind === "dir" ? (isOpen(node.id) ? "− " : "+ ") : ""}${node.id}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
      <Readout testId="vtree-note">
        a roving index over the flattened tree; the window is virtual
      </Readout>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("vtree-readout")),
    () => "",
  );

const focused = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

const painted = (ctx: Smoke.SmokeContext, label: string): boolean =>
  Arr.some(ctx.host.paintedText(), (line) => Str.includes(label)(line));

const treeLabels = (ctx: Smoke.SmokeContext): ReadonlyArray<string> =>
  Arr.filter(ctx.host.paintedText(), Str.startsWith("dir-"));

export const virtualizedTreeScenario: PlaygroundScenario = {
  id: "virtualized-tree",
  title: "Virtualized tree: indentation, count changes and roving focus",
  capability: "tree",
  view: () => <TreeProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "the tree starts collapsed",
        readout(ctx),
        "selected=dir-0 visible=8 open=0",
      );

      ctx.host.click("vtree-node-dir-0");
      yield* ctx.expectContains(
        "expanding a directory adds its children",
        readout(ctx),
        "visible=48 open=1",
      );

      const directory = yield* ctx.expectSome(
        "the directory label has bounds",
        Option.fromNullishOr(ctx.host.bounds("vtree-label-dir-0")),
      );
      const file = yield* ctx.expectSome(
        "the child label has bounds",
        Option.fromNullishOr(ctx.host.bounds("vtree-label-dir-0/file-0")),
      );
      yield* ctx.expectNear(
        "a virtual row still indents its child by one step",
        file.x - directory.x,
        16,
        1,
      );

      const labels = treeLabels(ctx);
      yield* ctx.expectEqual(
        "the painted window is smaller than the flattened tree",
        labels.length < 48,
        true,
      );
      yield* ctx.expectEqual(
        "the last child is below the window",
        painted(ctx, "dir-0/file-39"),
        false,
      );

      ctx.host.click("vtree-node-dir-0");
      yield* ctx.expectContains(
        "collapsing removes the children from the count",
        readout(ctx),
        "visible=8 open=0",
      );
      yield* ctx.expectEqual(
        "the collapsed child is no longer painted",
        painted(ctx, "dir-0/file-0"),
        false,
      );

      ctx.host.click("vtree-node-dir-3");
      yield* ctx.expectContains(
        "a second directory expands",
        readout(ctx),
        "visible=48 open=1",
      );

      ctx.host.wheel("vtree-list", 0, -800);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "scrolling reaches the expanded directory's children",
        painted(ctx, "dir-3/file-24"),
        true,
      );
      yield* ctx.expectEqual(
        "the first directory scrolled out of the window",
        painted(ctx, "dir-0"),
        false,
      );

      ctx.host.click("vtree-node-dir-3/file-22");
      yield* ctx.expectEqual(
        "clicking a child selects and focuses it",
        focused(ctx),
        "vtree-node-dir-3/file-22",
      );
      yield* ctx.expectContains(
        "the child is the selection",
        readout(ctx),
        "selected=dir-3/file-22",
      );

      ctx.host.key("down");
      yield* ctx.expectEqual(
        "Down moves native focus to the next child",
        focused(ctx),
        "vtree-node-dir-3/file-23",
      );
      yield* ctx.expectContains(
        "Down moves the selection",
        readout(ctx),
        "selected=dir-3/file-23",
      );
      ctx.host.key("up");
      yield* ctx.expectEqual(
        "Up moves native focus back",
        focused(ctx),
        "vtree-node-dir-3/file-22",
      );

      ctx.host.wheel("vtree-list", 0, 320);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the painted window moved back up",
        painted(ctx, "dir-3/file-12"),
        true,
      );
      yield* ctx.expectEqual(
        "a row below the moved window is no longer painted",
        painted(ctx, "dir-3/file-24"),
        false,
      );
      yield* ctx.expectEqual(
        "the focused row stays painted outside the window",
        painted(ctx, "dir-3/file-22"),
        true,
      );
      ctx.host.key("down");
      yield* ctx.expectEqual(
        "the roving index moves an off-window row",
        focused(ctx),
        "vtree-node-dir-3/file-23",
      );
      yield* ctx.expectContains(
        "the selection follows the off-window move",
        readout(ctx),
        "selected=dir-3/file-23",
      );

      ctx.host.wheel("vtree-list", 0, 800);
      ctx.host.advance(50);
      ctx.host.click("vtree-node-dir-3");
      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left collapses the selected directory",
        readout(ctx),
        "visible=8 open=0",
      );
      yield* ctx.expectEqual(
        "the collapsed directory's children are not painted",
        painted(ctx, "dir-3/file-0"),
        false,
      );

      ctx.host.click("vtree-node-dir-3");
      ctx.host.key("right");
      yield* ctx.expectEqual(
        "Right moves from an open directory to its first child",
        focused(ctx),
        "vtree-node-dir-3/file-0",
      );
      yield* ctx.expectContains(
        "the first child is the selection",
        readout(ctx),
        "selected=dir-3/file-0",
      );
      ctx.host.key("left");
      yield* ctx.expectEqual(
        "Left on a file moves to its parent directory",
        focused(ctx),
        "vtree-node-dir-3",
      );
    }),
};
