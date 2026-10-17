/**
 * The docking layout: a recursive tree of panel groups and splits, with the
 * geometry a drop zone needs and the persistence boundary a workspace needs.
 *
 * Pure by design: GPUix is not involved, so every rule below is unit-testable
 * on a host with no binding. `docking-layout` (plan `184`) renders this model in
 * the real runtime; the measured facts live there.
 *
 * The node shapes are `Schema.Struct` interfaces rather than `Schema.Class`
 * because a class whose field is the union that contains it is a self
 * referential base type in TypeScript. Decoding still happens at the boundary
 * (`decodeDock`), and the tree is discriminated by `kind`.
 *
 * Two invariants the tree keeps:
 *
 * - a tab lives in exactly one group, and it is the group's `active` tab after a
 *   move;
 * - an empty group is pruned, so a split whose one side empties collapses to
 *   its survivor. Dropping the **last** tab out of the dock leaves a single
 *   empty `dock-empty` group rather than `None`, because a layout always needs a
 *   surface.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The divider a split reserves between its two panes, in pixels. */
export const DIVIDER = 6;

/** The dock surface the probe lays out; also the origin its boxes derive from. */
export const SURFACE_WIDTH = 900;
export const SURFACE_HEIGHT = 480;

/** A tab's stable identity and its visible title. */
export interface DockTab {
  readonly id: string;
  readonly title: string;
}

/** A leaf: a tab strip and the body of its active tab. */
export interface DockGroup {
  readonly kind: "group";
  readonly id: string;
  readonly title: string;
  readonly tabs: ReadonlyArray<DockTab>;
  /** The active tab's id, or `""` when the group is empty. */
  readonly active: string;
}

/** An internal node: a resizable pair of dock nodes. */
export interface DockSplit {
  readonly kind: "split";
  readonly id: string;
  readonly orientation: "horizontal" | "vertical";
  /** The primary pane's extent in pixels. */
  readonly size: number;
  readonly min: number;
  readonly max: number;
  readonly primary: DockNode;
  readonly secondary: DockNode;
}

/** A dock node: a group or a split. */
export type DockNode = DockGroup | DockSplit;

/** Which pane region a drop lands in. */
export type DockEdge = "center" | "left" | "right" | "top" | "bottom";

export const DockTabSchema: Schema.Codec<DockTab> = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
});

const DockGroupSchema: Schema.Codec<DockGroup> = Schema.Struct({
  kind: Schema.tag("group"),
  id: Schema.String,
  title: Schema.String,
  tabs: Schema.Array(DockTabSchema),
  active: Schema.String,
});

const DockSplitSchema: Schema.Codec<DockSplit> = Schema.Struct({
  kind: Schema.tag("split"),
  id: Schema.String,
  orientation: Schema.Literals(["horizontal", "vertical"]),
  size: Schema.Number,
  min: Schema.Number,
  max: Schema.Number,
  primary: Schema.suspend(() => DockNodeSchema),
  secondary: Schema.suspend(() => DockNodeSchema),
});

/** The tree codec, discriminated by `kind`. */
export const DockNodeSchema: Schema.Codec<DockNode> = Schema.Union([
  DockGroupSchema,
  DockSplitSchema,
]).pipe(Schema.toTaggedUnion("kind"));

/** The persistence boundary: a layout snapshot as a JSON string. */
const DockNodeJson = Schema.fromJsonString(DockNodeSchema);

/** A layout as JSON, ready to be written by the app boundary. */
export const encodeDock = Schema.encodeSync(DockNodeJson);

/** Saved JSON back to a layout, or `None` when it is not a valid snapshot. */
export const decodeDock = (json: string): Option.Option<DockNode> =>
  Schema.decodeUnknownOption(DockNodeJson)(json);

/** A rectangle in window coordinates. */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const isGroup = (node: DockNode): node is DockGroup => node.kind === "group";

const matchNode = <A>(
  node: DockNode,
  cases: {
    readonly group: (group: DockGroup) => A;
    readonly split: (split: DockSplit) => A;
  },
): A => (isGroup(node) ? cases.group(node) : cases.split(node));

const group = (
  id: string,
  title: string,
  tabs: ReadonlyArray<DockTab>,
  active: string,
): DockGroup => ({ kind: "group", id, title, tabs, active });

const tab = (id: string, title: string): DockTab => ({ id, title });

/** The group a completely emptied dock falls back to. */
export const emptyGroup = (): DockGroup =>
  group("dock-empty", "Empty panel", [], "");

/**
 * The layout the probe starts from and a reset returns to.
 *
 * 900 px wide: a 240 px left group beside a vertical split whose editor is
 * 320 px tall over a terminal. Every expected box in the probe derives from
 * these numbers and `DIVIDER`.
 */
export const INITIAL_DOCK: DockNode = {
  kind: "split",
  id: "main",
  orientation: "horizontal",
  size: 240,
  min: 160,
  max: 360,
  primary: group(
    "left",
    "Left panel",
    [
      tab("explorer", "Explorer"),
      tab("search", "Search"),
      tab("notes", "Notes"),
    ],
    "explorer",
  ),
  secondary: {
    kind: "split",
    id: "centre",
    orientation: "vertical",
    size: 320,
    min: 200,
    max: 400,
    primary: group(
      "editor",
      "Editor panel",
      [tab("main.ts", "main.ts")],
      "main.ts",
    ),
    secondary: group(
      "terminal",
      "Terminal panel",
      [tab("shell", "Terminal")],
      "shell",
    ),
  },
};

/** Every group, in document order (pre-order). */
export const groups = (node: DockNode): ReadonlyArray<DockGroup> =>
  matchNode(node, {
    group: (self) => [self],
    split: (self) =>
      Arr.appendAll(groups(self.primary), groups(self.secondary)),
  });

/** The group with `id`, or `None`. */
export const findGroup = (
  node: DockNode,
  id: string,
): Option.Option<DockGroup> =>
  Arr.findFirst(groups(node), (candidate) => candidate.id === id);

/** The group holding `tabId`, or `None`. */
export const findTabGroup = (
  node: DockNode,
  tabId: string,
): Option.Option<DockGroup> =>
  Arr.findFirst(groups(node), (candidate) =>
    Arr.some(candidate.tabs, (candidateTab) => candidateTab.id === tabId),
  );

const tabIds = (tabs: ReadonlyArray<DockTab>): string =>
  Arr.match(tabs, {
    onEmpty: () => "",
    onNonEmpty: (values) =>
      Arr.join(
        Arr.map(values, (value) => value.id),
        ",",
      ),
  });

const splitTokens = (node: DockNode): ReadonlyArray<string> =>
  matchNode(node, {
    group: () => [],
    split: (self) => [
      `${self.id}=${self.orientation === "horizontal" ? "h" : "v"}${self.size}`,
      ...splitTokens(self.primary),
      ...splitTokens(self.secondary),
    ],
  });

/**
 * One deterministic line: groups in document order, then splits in pre-order.
 *
 * The probe prints exactly this and asserts on it, so a state change the tree
 * did not make cannot pass.
 */
export const describeDock = (node: DockNode): string =>
  Arr.join(
    [
      ...Arr.map(
        groups(node),
        (self) => `${self.id}=${tabIds(self.tabs)}@${self.active}`,
      ),
      ...splitTokens(node),
    ],
    " ",
  );

const mapGroups = (
  node: DockNode,
  transform: (group: DockGroup) => DockNode,
): DockNode =>
  matchNode<DockNode>(node, {
    group: (self): DockNode => transform(self),
    split: (self): DockNode => ({
      ...self,
      primary: mapGroups(self.primary, transform),
      secondary: mapGroups(self.secondary, transform),
    }),
  });

/** Makes `tabId` the active tab of `groupId`; a non-member is ignored. */
export const activate = (
  node: DockNode,
  groupId: string,
  tabId: string,
): DockNode =>
  mapGroups(node, (self) =>
    self.id === groupId && Arr.some(self.tabs, (tab) => tab.id === tabId)
      ? { ...self, active: tabId }
      : self,
  );

/** Appends `tab` to the group and activates it (replacing an earlier copy). */
export const insertTab = (
  node: DockNode,
  groupId: string,
  tab: DockTab,
): DockNode =>
  mapGroups(node, (self) =>
    self.id !== groupId
      ? self
      : {
          ...self,
          tabs: Arr.append(
            Arr.filter(self.tabs, (candidate) => candidate.id !== tab.id),
            tab,
          ),
          active: tab.id,
        },
  );

const withoutTab = (node: DockNode, tabId: string): DockNode =>
  mapGroups(node, (self) => {
    const tabs = Arr.filter(self.tabs, (candidate) => candidate.id !== tabId);
    if (Arr.length(tabs) === Arr.length(self.tabs)) return self;
    const sameActive = Arr.some(
      tabs,
      (candidate) => candidate.id === self.active,
    );
    const active = sameActive
      ? self.active
      : Option.getOrElse(
          Option.map(Arr.head(tabs), (first) => first.id),
          () => "",
        );
    return { ...self, tabs, active };
  });

const prune = (node: DockNode, keep: string): Option.Option<DockNode> =>
  matchNode(node, {
    group: (self) =>
      self.id === keep || Arr.length(self.tabs) > 0
        ? Option.some(self)
        : Option.none(),
    split: (self) => {
      const primary = prune(self.primary, keep);
      const secondary = prune(self.secondary, keep);
      if (Option.isSome(primary) && Option.isSome(secondary)) {
        return Option.some({
          ...self,
          primary: primary.value,
          secondary: secondary.value,
        });
      }
      if (Option.isSome(primary)) return primary;
      if (Option.isSome(secondary)) return secondary;
      return Option.none();
    },
  });

/**
 * Removes `tabId` and prunes the groups it emptied.
 *
 * A completely emptied dock falls back to one empty group, so a layout always
 * has a surface to drop into.
 */
export const removeTab = (node: DockNode, tabId: string): DockNode =>
  Option.getOrElse(prune(withoutTab(node, tabId), ""), emptyGroup);

const removeTabKeeping = (
  node: DockNode,
  tabId: string,
  keep: string,
): DockNode =>
  Option.getOrElse(prune(withoutTab(node, tabId), keep), () => node);

/** Clamps a split's primary extent to `[min, max]`. */
export const resize = (
  node: DockNode,
  splitId: string,
  size: number,
): DockNode =>
  matchNode<DockNode>(node, {
    group: (self): DockNode => self,
    split: (self): DockNode => ({
      ...self,
      size:
        self.id === splitId
          ? Math.min(Math.max(size, self.min), self.max)
          : self.size,
      primary: resize(self.primary, splitId, size),
      secondary: resize(self.secondary, splitId, size),
    }),
  });

/** A drop request: the tab, where it goes and the ids a new split needs. */
export interface DropRequest {
  readonly tabId: string;
  readonly target: string;
  readonly edge: DockEdge;
  readonly newGroup: string;
  readonly newSplit: string;
  readonly title: string;
  readonly size: number;
  readonly min: number;
  readonly max: number;
}

const replaceGroup = (
  node: DockNode,
  groupId: string,
  replacement: DockNode,
): DockNode =>
  matchNode<DockNode>(node, {
    group: (self): DockNode => (self.id === groupId ? replacement : self),
    split: (self): DockNode => ({
      ...self,
      primary: replaceGroup(self.primary, groupId, replacement),
      secondary: replaceGroup(self.secondary, groupId, replacement),
    }),
  });

const splitTarget = (
  node: DockNode,
  request: DropRequest,
  moved: DockTab,
): DockNode =>
  Option.match(findGroup(node, request.target), {
    onNone: () => node,
    onSome: (target) => {
      const horizontal = request.edge === "left" || request.edge === "right";
      const first = request.edge === "left" || request.edge === "top";
      const size = Math.min(Math.max(request.size, request.min), request.max);
      const detached = group(
        request.newGroup,
        request.title,
        [moved],
        moved.id,
      );
      return replaceGroup(node, target.id, {
        kind: "split",
        id: request.newSplit,
        orientation: horizontal ? "horizontal" : "vertical",
        size,
        min: request.min,
        max: request.max,
        primary: first ? detached : target,
        secondary: first ? target : detached,
      });
    },
  });

/**
 * Moves a tab into `request.target`.
 *
 * A centre drop merges it into the target's strip. An edge drop wraps the
 * target in a new split, with the dragged tab's group on the edge's side. A
 * drop of a group's own tab onto its own edge is a no-op: one pane cannot be
 * split against itself.
 */
export const dropTab = (node: DockNode, request: DropRequest): DockNode =>
  Option.match(findTabGroup(node, request.tabId), {
    onNone: () => node,
    onSome: (source) => {
      if (source.id === request.target) {
        return request.edge === "center"
          ? activate(node, request.target, request.tabId)
          : node;
      }
      return Option.match(
        Arr.findFirst(
          source.tabs,
          (candidate) => candidate.id === request.tabId,
        ),
        {
          onNone: () => node,
          onSome: (moved) => {
            const kept = removeTabKeeping(node, request.tabId, request.target);
            return request.edge === "center"
              ? insertTab(kept, request.target, moved)
              : splitTarget(kept, request, moved);
          },
        },
      );
    },
  });

/** Every group's box, derived from the tree and the surface's own box. */
export const rects = (
  node: DockNode,
  box: Rectangle,
): Readonly<Record<string, Rectangle>> =>
  matchNode(node, {
    group: (self) => ({ [self.id]: box }),
    split: (self) => {
      const horizontal = self.orientation === "horizontal";
      const primary = horizontal
        ? { ...box, width: self.size }
        : { ...box, height: self.size };
      const secondary = horizontal
        ? {
            ...box,
            x: box.x + self.size + DIVIDER,
            width: box.width - self.size - DIVIDER,
          }
        : {
            ...box,
            y: box.y + self.size + DIVIDER,
            height: box.height - self.size - DIVIDER,
          };
      return {
        ...rects(self.primary, primary),
        ...rects(self.secondary, secondary),
      };
    },
  });

const inside = (
  pointer: { readonly x: number; readonly y: number },
  box: Rectangle,
): boolean =>
  pointer.x >= box.x &&
  pointer.x <= box.x + box.width &&
  pointer.y >= box.y &&
  pointer.y <= box.y + box.height;

/**
 * The zone a pointer is in.
 *
 * Within `edge` pixels of a side, the nearest side wins (so a corner is not
 * ambiguous); otherwise the centre. `None` outside the box.
 */
export const zoneAt = (
  pointer: { readonly x: number; readonly y: number },
  box: Rectangle,
  edge = 48,
): Option.Option<DockEdge> => {
  if (!inside(pointer, box)) return Option.none();
  const distances: ReadonlyArray<readonly [DockEdge, number]> = [
    ["left", pointer.x - box.x],
    ["right", box.x + box.width - pointer.x],
    ["top", pointer.y - box.y],
    ["bottom", box.y + box.height - pointer.y],
  ];
  const nearest = Arr.reduce(
    distances,
    Option.none<readonly [DockEdge, number]>(),
    (best, candidate) =>
      Option.match(best, {
        onNone: () => Option.some(candidate),
        onSome: (current) =>
          candidate[1] < current[1] ? Option.some(candidate) : best,
      }),
  );
  return Option.map(nearest, ([zone, distance]) =>
    distance < edge ? zone : "center",
  );
};

/** A drop indicator's box, relative to the group it is drawn in. */
export const indicatorRect = (edge: DockEdge, box: Rectangle): Rectangle =>
  Match.value(edge).pipe(
    Match.when("left", () => ({ x: 0, y: 0, width: 4, height: box.height })),
    Match.when("right", () => ({
      x: box.width - 4,
      y: 0,
      width: 4,
      height: box.height,
    })),
    Match.when("top", () => ({ x: 0, y: 0, width: box.width, height: 4 })),
    Match.when("bottom", () => ({
      x: 0,
      y: box.height - 4,
      width: box.width,
      height: 4,
    })),
    Match.when("center", () => ({
      x: 0,
      y: 0,
      width: box.width,
      height: box.height,
    })),
    Match.exhaustive,
  );

/** The split sizes an edge drop gives a pane `extent` pixels across. */
export const dropSize = (
  extent: number,
  min = 96,
): { readonly size: number; readonly min: number; readonly max: number } => ({
  size: Math.floor((extent - DIVIDER) / 2),
  min,
  max: Math.max(min, extent - DIVIDER - min),
});

/** A box's right and bottom edges, for readable assertions. */
export const right = (box: Rectangle): number => box.x + box.width;
export const bottom = (box: Rectangle): number => box.y + box.height;
