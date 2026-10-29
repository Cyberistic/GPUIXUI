/**
 * Turn a `mermaid` code fence into a `<MermaidDiagram>` element.
 *
 * The rewrite happens at compile time, so the diagram is part of the page the
 * prerenderer writes: a reader gets the picture before any script runs, and a
 * plain fence still renders as the source.
 *
 * Fumadocs paints every fence through its own `CodeBlock`, which is why this is
 * a remark plugin rather than an override of the MDX `pre` component — the
 * `pre` map never sees a fence.
 */

/** The node shapes this plugin reads and writes: the MDX tree's own subset. */
interface Fence {
  readonly type: "code";
  readonly lang?: string | null;
  readonly value: string;
}

/** A parent that holds block children this plugin may replace. */
interface BlockParent {
  readonly type: string;
  children: ReadonlyArray<unknown>;
}

const isFence = (node: unknown): node is Fence => {
  if (typeof node !== "object" || node === null) return false;
  const candidate = node as { type?: unknown; value?: unknown };
  return candidate.type === "code" && typeof candidate.value === "string";
};

/** The element a fence becomes. */
const diagramOf = (fence: Fence) => ({
  type: "mdxJsxFlowElement",
  name: "MermaidDiagram",
  attributes: [
    { type: "mdxJsxAttribute", name: "source", value: fence.value.trimEnd() },
  ],
  children: [],
});

/** Walk a tree, replacing every `mermaid` fence it holds. */
const rewrite = (node: unknown): void => {
  if (typeof node !== "object" || node === null) return;
  const children = (node as { children?: ReadonlyArray<unknown> }).children;
  if (children === undefined) return;

  const next = children.map((child) =>
    isFence(child) && child.lang === "mermaid" ? diagramOf(child) : child,
  );
  (node as BlockParent).children = next;
  next.forEach(rewrite);
};

/** The plugin, and the name fumadocs prints while it compiles a page. */
export const mermaidFence =
  () =>
  (tree: unknown): void =>
    rewrite(tree);
