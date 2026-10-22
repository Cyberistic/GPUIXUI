/**
 * The dock's pure geometry and its persisted shapes.
 *
 * Nothing here imports React: a `SplitPane`, a `PanelGroup` or a `DockLayout`
 * is a renderer over these reducers, and the sizes, the collapse flags and the
 * layout trees are data an Effect-driven or store-driven workspace reads
 * directly. The split arithmetic is the one the window probes measured
 * (`split-pane-lifecycle`, `dock-reflow`, `workspace-restore`): a divider clamps
 * to its caller's bounds, an arrow steps by a fixed pixel count, and a restored
 * size is clamped once at the boundary.
 */

import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Schema from "effect/Schema";

/** How far one arrow key moves a focused divider, in pixels. */
export const DIVIDER_STEP = 16;

/** The divider's thickness: the whole gap between two panes. */
export const DIVIDER_WIDTH = 6;

/** The bounds a pane size stays inside. */
export interface SizeBounds {
  readonly min: number;
  readonly max: number;
}

/** Bounds with the caller's defaults: non-negative, and `max` raised to `min`. */
export const sizeBounds = (min = 0, max = Infinity): SizeBounds => {
  const floor = Math.max(0, min);
  return { min: floor, max: Math.max(floor, max) };
};

/** `size` clamped to `bounds`, inclusively. */
export const clampSize = (size: number, bounds: SizeBounds): number =>
  Number.clamp({ minimum: bounds.min, maximum: bounds.max })(size);

/** A pointer drag that started at `start` and moved `delta` pixels. */
export const dragSize = (
  start: number,
  delta: number,
  bounds: SizeBounds,
): number => clampSize(start + delta, bounds);

/** The keys a focused divider answers, in the order a keyboard tries them. */
export const dividerKeys = [
  "left",
  "right",
  "up",
  "down",
  "home",
  "end",
] as const;

/** One key a focused divider answers. */
export const DividerKey = Schema.Literals(dividerKeys);

/** One key a focused divider answers. */
export type DividerKey = typeof DividerKey.Type;

/** Whether a key event belongs to a divider, so an unrelated key passes on. */
export const isDividerKey = Schema.is(DividerKey);

/** The two axes a split or a group lays its panes along. */
export const Orientation = Schema.Literals(["horizontal", "vertical"]);

/** The two axes a split or a group lays its panes along. */
export type Orientation = typeof Orientation.Type;

/**
 * The size a key produces: the arrows step by `step`, Home and End name the
 * bounds themselves, and every route clamps because a reader can hold an arrow
 * against a bound exactly as a pointer can drag past it.
 */
export const resizeByKey = (
  size: number,
  key: DividerKey,
  bounds: SizeBounds,
  step: number = DIVIDER_STEP,
): number =>
  pipe(
    Match.value(key),
    Match.when("left", () => clampSize(size - step, bounds)),
    Match.when("up", () => clampSize(size - step, bounds)),
    Match.when("right", () => clampSize(size + step, bounds)),
    Match.when("down", () => clampSize(size + step, bounds)),
    Match.when("home", () => bounds.min),
    Match.when("end", () => bounds.max),
    Match.exhaustive,
  );

/** A boolean the schema defaults to `false` at both the boundary and the ctor. */
const DEFAULT_FALSE = Schema.Boolean.pipe(
  Schema.withDecodingDefault(Effect.succeed(false)),
  Schema.withConstructorDefault(Effect.succeed(false)),
);

/** One panel of a group: a fraction of the row or column. */
export class Panel extends Schema.Class<Panel>("Panel")({
  id: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  size: Schema.Number,
  collapsible: DEFAULT_FALSE,
  collapsed: DEFAULT_FALSE,
}) {}

/** A panel group's persisted shape: an axis and an ordered list of panels. */
export class PanelLayout extends Schema.Class<PanelLayout>("PanelLayout")({
  orientation: Orientation,
  panels: Schema.Array(Panel),
}) {}

/** {@link PanelLayout} across a JSON string, for the app's persistence boundary. */
export const PanelLayoutJson = Schema.fromJsonString(PanelLayout);

/**
 * Rescale a group's fractions to sum to one.
 *
 * `flexGrow` distributes space proportionally, so the fractions need not sum to
 * one to paint correctly; normalising makes the persisted shape read as a
 * percentage and keeps a resize's arithmetic on the same scale a restore reads.
 */
export const normalizePanels = (
  panels: ReadonlyArray<Panel>,
): ReadonlyArray<Panel> => {
  const total = Arr.reduce(
    panels,
    0,
    (sum, panel) => sum + Math.max(0, panel.size),
  );
  return total <= 0
    ? panels
    : Arr.map(panels, (panel) => ({
        ...panel,
        size: Math.max(0, panel.size) / total,
      }));
};

/**
 * Flip a collapsible panel's `collapsed` flag.
 *
 * A non-collapsible panel and an unknown id return the layout unchanged, so a
 * caller holding a toggle never paints a control that claims a change it did
 * not make.
 */
export const togglePanelCollapsed = (
  layout: PanelLayout,
  id: string,
): PanelLayout => {
  const has = Arr.some(
    layout.panels,
    (panel) => panel.id === id && panel.collapsible,
  );
  if (!has) return layout;
  return new PanelLayout({
    ...layout,
    panels: Arr.map(layout.panels, (panel) =>
      panel.id === id
        ? new Panel({ ...panel, collapsed: !panel.collapsed })
        : panel,
    ),
  });
};

/**
 * Move `delta` from `panels[index]` to `panels[index + 1]`, neither below zero.
 *
 * The divider between two panes trades space between them and only them: every
 * other pane keeps its share, and the moved pane clamps so neither can push the
 * other past empty. `index` names the divider, not a pane — an out-of-range
 * index returns the list unchanged.
 */
export const resizePanels = (
  panels: ReadonlyArray<Panel>,
  index: number,
  delta: number,
): ReadonlyArray<Panel> => {
  const first = panels[index];
  const second = panels[index + 1];
  if (first === undefined || second === undefined) return panels;
  const moved = clampSize(first.size + delta, {
    min: 0,
    max: first.size + second.size,
  });
  if (moved === first.size) return panels;
  return Arr.map(panels, (panel, at) =>
    at === index
      ? new Panel({ ...first, size: moved })
      : at === index + 1
        ? new Panel({ ...second, size: first.size + second.size - moved })
        : panel,
  );
};

/**
 * The size a key produces between two panels: the arrows step by `step`
 * fractions, Home and End collapse the pane to empty or to the full pair.
 */
export const resizePanelsByKey = (
  panels: ReadonlyArray<Panel>,
  index: number,
  key: DividerKey,
  step: number,
): ReadonlyArray<Panel> =>
  pipe(
    Match.value(key),
    Match.when("left", () => resizePanels(panels, index, -step)),
    Match.when("up", () => resizePanels(panels, index, -step)),
    Match.when("right", () => resizePanels(panels, index, step)),
    Match.when("down", () => resizePanels(panels, index, step)),
    Match.when("home", () => resizePanels(panels, index, -Infinity)),
    Match.when("end", () => resizePanels(panels, index, Infinity)),
    Match.exhaustive,
  );

/** One tab of a docking group. */
export class DockTab extends Schema.Class<DockTab>("DockTab")({
  id: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
}) {}

/** A split: two dock nodes sharing an axis. `size` is the first child's share. */
export interface DockSplit {
  readonly kind: "split";
  readonly id: string;
  readonly orientation: Orientation;
  readonly size: number;
  readonly first: DockNode;
  readonly second: DockNode;
}

/** A tabbed group: one active tab and the tabs it switches between. */
export interface DockTabs {
  readonly kind: "tabs";
  readonly id: string;
  readonly activeTab: string;
  readonly tabs: ReadonlyArray<DockTab>;
}

/** A dock layout: a tree of splits and tabbed groups. */
export type DockNode = DockSplit | DockTabs;

const splitSize = Schema.Number.pipe(
  Schema.withConstructorDefault(Effect.succeed(0.5)),
);

/** The split node's schema, with a constructor-defaulted `kind` and `size`. */
export const DockSplit: Schema.Codec<DockSplit> = Schema.Struct({
  kind: Schema.tag("split"),
  id: Schema.NonEmptyString,
  orientation: Orientation,
  size: splitSize,
  first: Schema.suspend((): Schema.Codec<DockNode> => DockNode),
  second: Schema.suspend((): Schema.Codec<DockNode> => DockNode),
});

/** The tabbed node's schema, with a constructor-defaulted `kind`. */
export const DockTabs: Schema.Codec<DockTabs> = Schema.Struct({
  kind: Schema.tag("tabs"),
  id: Schema.NonEmptyString,
  activeTab: Schema.NonEmptyString,
  tabs: Schema.Array(DockTab),
});

/** The dock layout's schema, discriminated by `kind`. */
export const DockNode: Schema.Codec<DockNode> = Schema.Union([
  DockSplit,
  DockTabs,
]).pipe(Schema.toTaggedUnion("kind"));

/** {@link DockNode} across a JSON string, for the app's persistence boundary. */
export const DockNodeJson = Schema.fromJsonString(DockNode);

/** Move a split's first-child share by `delta`, clamped to `[0, 1]`. */
export const resizeSplit = (size: number, delta: number): number =>
  clampSize(size + delta, { min: 0, max: 1 });

/**
 * The size a key produces for a split: the arrows step by `step` fractions,
 * Home and End collapse the first child to empty or to the whole split.
 */
export const resizeSplitByKey = (
  size: number,
  key: DividerKey,
  step: number,
): number =>
  pipe(
    Match.value(key),
    Match.when("left", () => resizeSplit(size, -step)),
    Match.when("up", () => resizeSplit(size, -step)),
    Match.when("right", () => resizeSplit(size, step)),
    Match.when("down", () => resizeSplit(size, step)),
    Match.when("home", () => resizeSplit(size, -Infinity)),
    Match.when("end", () => resizeSplit(size, Infinity)),
    Match.exhaustive,
  );

/**
 * Replace one tab group's active tab, leaving the rest of the tree alone.
 *
 * A group whose id does not match, an id that names no tab, and a tab that is
 * already active return the node unchanged, so a caller holding a tab strip
 * cannot report a change it did not make.
 */
export const setActiveTab = (
  node: DockNode,
  groupId: string,
  tabId: string,
): DockNode => {
  if (node.kind === "tabs") {
    if (node.id !== groupId || node.activeTab === tabId) return node;
    if (!Arr.some(node.tabs, (tab) => tab.id === tabId)) return node;
    return { ...node, activeTab: tabId };
  }
  const first = setActiveTab(node.first, groupId, tabId);
  const second = setActiveTab(node.second, groupId, tabId);
  if (first === node.first && second === node.second) return node;
  return { ...node, first, second };
};
