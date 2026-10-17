/**
 * `tree-view` — indentation, expand/collapse and keyboard delivery.
 *
 * A tree is pure React state over flat rows, so the runtime questions are the
 * ones a file-tree/inspector component depends on: does `paddingLeft` shift a
 * label by depth, does toggling a directory paint and unpaint its subtree, and
 * do arrow keys reach a clicked row's `onKeyDown`?
 *
 * Honest limit: this probe proves key delivery and state. It does not move
 * focus itself; `modal-focus-trap` measures the renderer's `focusElement` /
 * `focusNextWithin` from component code, which is what a roving-tabindex
 * file tree would build on.
 *
 * Measured facts: plan `140` §4, plan `153` §8 and plan `155` §8.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly kind: "dir" | "file";
  readonly depth: number;
  /** The directory ids above this node; a node is visible when all are open. */
  readonly ancestors: ReadonlyArray<string>;
}

const NODES: ReadonlyArray<TreeNode> = [
  { id: "src", label: "src", kind: "dir", depth: 0, ancestors: [] },
  {
    id: "src/app.tsx",
    label: "app.tsx",
    kind: "file",
    depth: 1,
    ancestors: ["src"],
  },
  {
    id: "src/components",
    label: "components",
    kind: "dir",
    depth: 1,
    ancestors: ["src"],
  },
  {
    id: "src/components/button.tsx",
    label: "button.tsx",
    kind: "file",
    depth: 2,
    ancestors: ["src", "src/components"],
  },
  {
    id: "src/components/card.tsx",
    label: "card.tsx",
    kind: "file",
    depth: 2,
    ancestors: ["src", "src/components"],
  },
  {
    id: "README.md",
    label: "README.md",
    kind: "file",
    depth: 0,
    ancestors: [],
  },
];

/** The rows a tree paints: every ancestor of a node must be expanded. */
export const visibleNodes = (
  nodes: ReadonlyArray<TreeNode>,
  expanded: ReadonlyArray<string>,
): ReadonlyArray<TreeNode> =>
  Arr.filter(nodes, (node) =>
    Arr.every(node.ancestors, (ancestor) => Arr.contains(expanded, ancestor)),
  );

const next = (
  nodes: ReadonlyArray<TreeNode>,
  selected: Option.Option<string>,
  delta: number,
): Option.Option<string> =>
  pipe(
    selected,
    Option.match({
      onNone: () => Option.map(Arr.head(nodes), (node) => node.id),
      onSome: (id) =>
        pipe(
          Arr.findFirstIndex(nodes, (node) => node.id === id),
          Option.map((index) =>
            Math.min(Math.max(index + delta, 0), nodes.length - 1),
          ),
          Option.flatMap((index) => Arr.get(nodes, index)),
          Option.map((node) => node.id),
        ),
    }),
  );

const TreeProbe = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<ReadonlyArray<string>>(["src"]);
  const [selected, setSelected] = useState<Option.Option<string>>(
    Option.some("src"),
  );

  const nodes = visibleNodes(NODES, expanded);
  const isOpen = (id: string): boolean => Arr.contains(expanded, id);

  const toggle = (node: TreeNode) => {
    if (node.kind !== "dir") return;
    setExpanded((current) =>
      Arr.contains(current, node.id)
        ? Arr.filter(current, (id) => id !== node.id)
        : Arr.append(current, node.id),
    );
  };

  const onKeyDown = (node: TreeNode) => (event: { key?: string }) => {
    const target = Option.getOrElse(selected, () => node.id);
    if (event.key === "down" || event.key === "up") {
      setSelected(
        next(nodes, Option.some(target), event.key === "down" ? 1 : -1),
      );
      return;
    }
    const current = Arr.findFirst(
      nodes,
      (candidate) => candidate.id === target,
    );
    Option.match(current, {
      onNone: () => {},
      onSome: (found) => {
        if (event.key === "right" && !isOpen(found.id)) toggle(found);
        if (event.key === "left" && isOpen(found.id)) toggle(found);
        if (event.key === "enter" || event.key === "space") toggle(found);
      },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: 360,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <Readout testId="tree-readout">
        {`selected=${Option.getOrElse(selected, () => "none")} visible=${nodes.length}`}
      </Readout>
      {nodes.map((node) => (
        <div
          key={node.id}
          testId={`tree-node-${node.id}`}
          tabIndex={0}
          role="treeitem"
          aria-expanded={node.kind === "dir" ? isOpen(node.id) : undefined}
          autoFocus={node.id === "src"}
          onClick={() => {
            setSelected(Option.some(node.id));
            toggle(node);
          }}
          onKeyDown={onKeyDown(node)}
          style={{
            display: "flex",
            alignItems: "center",
            paddingLeft: 4 + node.depth * 16,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: theme.radius.sm,
            backgroundColor: Option.contains(selected, node.id)
              ? theme.colors.muted
              : theme.colors.background,
            hover: { backgroundColor: theme.colors.muted },
          }}
        >
          <text
            testId={`tree-label-${node.id}`}
            style={{ color: theme.colors.foreground }}
          >
            {`${node.kind === "dir" ? (isOpen(node.id) ? "- " : "+ ") : ""}${node.label}`}
          </text>
        </div>
      ))}
      <Readout testId="tree-note">
        selection is React state; arrow keys reach the clicked row
      </Readout>
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

const paintedExactly = (ctx: Smoke.SmokeContext, label: string): boolean =>
  Arr.some(ctx.host.paintedText(), (line) => line === label);

export const treeScenario: PlaygroundScenario = {
  id: "tree-view",
  title: "Tree: indentation, expand/collapse and arrow keys",
  capability: "tree",
  view: () => <TreeProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectContains(
        "initial tree state",
        readout(ctx, "tree-readout"),
        "selected=src visible=4",
      );
      yield* ctx.expectEqual(
        "a collapsed directory hides its children",
        paintedExactly(ctx, "button.tsx"),
        false,
      );

      const root = yield* ctx.expectSome(
        "root label painted",
        Option.fromNullishOr(ctx.host.bounds("tree-label-src")),
      );
      const child = yield* ctx.expectSome(
        "first-level label painted",
        Option.fromNullishOr(ctx.host.bounds("tree-label-src/app.tsx")),
      );
      yield* ctx.expectNear(
        "depth 1 is indented by one step",
        child.x - root.x,
        16,
        1,
      );

      ctx.host.click("tree-node-src/components");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "expanding a directory shows its children",
        readout(ctx, "tree-readout"),
        "visible=6",
      );
      yield* ctx.expectEqual(
        "the expanded child is painted",
        paintedExactly(ctx, "button.tsx"),
        true,
      );

      const grandchild = yield* ctx.expectSome(
        "second-level label painted",
        Option.fromNullishOr(
          ctx.host.bounds("tree-label-src/components/button.tsx"),
        ),
      );
      yield* ctx.expectNear(
        "depth 2 is indented by two steps",
        grandchild.x - root.x,
        32,
        1,
      );

      ctx.host.click("tree-node-src/components");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "collapsing a directory hides its children",
        readout(ctx, "tree-readout"),
        "visible=4",
      );
      yield* ctx.expectEqual(
        "the collapsed child is not painted",
        paintedExactly(ctx, "button.tsx"),
        false,
      );

      ctx.host.click("tree-node-src/app.tsx");
      yield* ctx.expectContains(
        "clicking a row selects it",
        readout(ctx, "tree-readout"),
        "selected=src/app.tsx",
      );
      yield* ctx.expectEqual(
        "the clicked row takes native focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "tree-node-src/app.tsx",
      );

      ctx.host.key("down");
      yield* ctx.expectContains(
        "down moves the selection through visible rows",
        readout(ctx, "tree-readout"),
        "selected=src/components",
      );
      ctx.host.key("up");
      yield* ctx.expectContains(
        "up moves the selection back",
        readout(ctx, "tree-readout"),
        "selected=src/app.tsx",
      );

      ctx.host.click("tree-node-src/components");
      yield* ctx.expectContains(
        "the directory is open before the key",
        readout(ctx, "tree-readout"),
        "visible=6",
      );
      ctx.host.key("left");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "left collapses the selected directory",
        readout(ctx, "tree-readout"),
        "visible=4",
      );
      ctx.host.key("right");
      ctx.host.advance(50);
      yield* ctx.expectContains(
        "right expands the selected directory",
        readout(ctx, "tree-readout"),
        "visible=6",
      );
    }),
};
