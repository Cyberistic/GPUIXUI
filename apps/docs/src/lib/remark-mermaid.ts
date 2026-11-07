interface Fence {
  readonly type: "code";
  readonly lang?: string | null;
  readonly value: string;
}

interface BlockParent {
  readonly type: string;
  children: ReadonlyArray<unknown>;
}

const isFence = (node: unknown): node is Fence => {
  if (typeof node !== "object" || node === null) return false;
  const candidate = node as { type?: unknown; value?: unknown };
  return candidate.type === "code" && typeof candidate.value === "string";
};

const diagramOf = (fence: Fence) => ({
  type: "mdxJsxFlowElement",
  name: "MermaidDiagram",
  attributes: [
    { type: "mdxJsxAttribute", name: "source", value: fence.value.trimEnd() },
  ],
  children: [],
});

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

export const mermaidFence =
  () =>
  (tree: unknown): void =>
    rewrite(tree);
