import * as Arr from "effect/Array";

export const HIERARCHY_SEPARATOR = "/";

export interface HierarchyNode {
  readonly path: string;

  readonly value?: number;
}

export interface HierarchyRow {
  readonly path: string;

  readonly name: string;

  readonly value: number;

  readonly key: string;
}

const ROOT_PATH = "\u0000root";

export const hierarchyRows = (
  nodes: ReadonlyArray<HierarchyNode>,
): ReadonlyArray<HierarchyRow> => {
  if (nodes.length === 0) return [];

  const paths = nodes.map((node) => node.path);
  const present = new Set(paths);

  const parentOf = (path: string): string | undefined => {
    const at = path.lastIndexOf(HIERARCHY_SEPARATOR);
    if (at <= 0) return undefined;
    const parent = path.slice(0, at);
    return present.has(parent) ? parent : undefined;
  };

  const rootPaths = paths.filter((path) => parentOf(path) === undefined);
  const roots =
    rootPaths.length > 1 && shareAParent(rootPaths)
      ? [rootPaths[0] ?? ""]
      : rootPaths;

  const sums = new Map<string, number>();
  for (const node of nodes) {
    const parent = parentOf(node.path);
    if (parent === undefined) continue;
    const value =
      node.value === undefined || !Number.isFinite(node.value) ? 0 : node.value;
    sums.set(parent, (sums.get(parent) ?? 0) + value);
  }

  const rows: HierarchyRow[] = nodes.map((node) => ({
    path: node.path,
    name: nameOf(node.path),

    value: finiteOr(node.value, sums.get(node.path) ?? 0),
    key: node.path,
  }));

  if (roots.length === 1) return rows;

  const rootValue = rows.reduce((total, row) => total + row.value, 0);
  return [
    { path: ROOT_PATH, name: ROOT_PATH, value: rootValue, key: ROOT_PATH },
    ...rows.map((row) => ({
      ...row,
      path: `${ROOT_PATH}/${row.path}`,
    })),
  ];
};

const finiteOr = (value: number | undefined, fallback: number): number =>
  value === undefined || !Number.isFinite(value) ? fallback : value;

const shareAParent = (paths: ReadonlyArray<string>): boolean => {
  const first = paths[0];
  if (first === undefined) return false;
  const at = first.lastIndexOf(HIERARCHY_SEPARATOR);
  if (at <= 0) return false;
  const parent = first.slice(0, at);
  return Arr.every(paths, (path) => {
    const cut = path.lastIndexOf(HIERARCHY_SEPARATOR);
    return cut > 0 && path.slice(0, cut) === parent;
  });
};

export const hierarchyRoots = (
  rows: ReadonlyArray<HierarchyRow>,
): ReadonlyArray<HierarchyRow> => {
  const paths = rows.map((row) => row.path);
  return rows.filter(
    (row) =>
      !paths.some(
        (path) => path !== row.path && row.path.startsWith(`${path}/`),
      ),
  );
};

export const nameOf = (path: string): string => {
  const at = path.lastIndexOf(HIERARCHY_SEPARATOR);
  return at === -1 ? path : path.slice(at + 1);
};

export const hierarchyLeaves = (
  rows: ReadonlyArray<HierarchyRow>,
): ReadonlyArray<HierarchyRow> => {
  const parents = new Set(
    rows
      .map((row) => parentPath(row.path))
      .filter((path) => path !== undefined),
  );
  return rows.filter((row) => !parents.has(row.path));
};

const parentPath = (path: string): string | undefined => {
  const at = path.lastIndexOf(HIERARCHY_SEPARATOR);
  return at <= 0 ? undefined : path.slice(0, at);
};

export interface FlowNode {
  readonly id: string;

  readonly name?: string;
}

export interface FlowLink {
  readonly source: string;

  readonly target: string;

  readonly value: number;
}

export const flowGraph = (
  nodes: ReadonlyArray<FlowNode>,
  links: ReadonlyArray<FlowLink>,
): {
  readonly nodes: ReadonlyArray<FlowNode>;
  readonly links: ReadonlyArray<FlowLink>;
} => {
  const present = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    links: links.filter(
      (link) =>
        present.has(link.source) &&
        present.has(link.target) &&
        Number.isFinite(link.value) &&
        link.value > 0,
    ),
  };
};
