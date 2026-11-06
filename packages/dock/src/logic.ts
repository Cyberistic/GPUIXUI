import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Schema from "effect/Schema";

export const DIVIDER_STEP = 16;

export const DIVIDER_WIDTH = 6;

export interface SizeBounds {
  readonly min: number;
  readonly max: number;
}

export const sizeBounds = (min = 0, max = Infinity): SizeBounds => {
  const floor = Math.max(0, min);
  return { min: floor, max: Math.max(floor, max) };
};

export const clampSize = (size: number, bounds: SizeBounds): number =>
  Number.clamp({ minimum: bounds.min, maximum: bounds.max })(size);

export const dragSize = (
  start: number,
  delta: number,
  bounds: SizeBounds,
): number => clampSize(start + delta, bounds);

export const dividerKeys = [
  "left",
  "right",
  "up",
  "down",
  "home",
  "end",
] as const;

export const DividerKey = Schema.Literals(dividerKeys);

export type DividerKey = typeof DividerKey.Type;

export const isDividerKey = Schema.is(DividerKey);

export const Orientation = Schema.Literals(["horizontal", "vertical"]);

export type Orientation = typeof Orientation.Type;

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

const DEFAULT_FALSE = Schema.Boolean.pipe(
  Schema.withDecodingDefault(Effect.succeed(false)),
  Schema.withConstructorDefault(Effect.succeed(false)),
);

export class Panel extends Schema.Class<Panel>("Panel")({
  id: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  size: Schema.Number,
  collapsible: DEFAULT_FALSE,
  collapsed: DEFAULT_FALSE,
}) {}

export class PanelLayout extends Schema.Class<PanelLayout>("PanelLayout")({
  orientation: Orientation,
  panels: Schema.Array(Panel),
}) {}

export const PanelLayoutJson = Schema.fromJsonString(PanelLayout);

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

export class DockTab extends Schema.Class<DockTab>("DockTab")({
  id: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
}) {}

export interface DockSplit {
  readonly kind: "split";
  readonly id: string;
  readonly orientation: Orientation;
  readonly size: number;
  readonly first: DockNode;
  readonly second: DockNode;
}

export interface DockTabs {
  readonly kind: "tabs";
  readonly id: string;
  readonly activeTab: string;
  readonly tabs: ReadonlyArray<DockTab>;
}

export type DockNode = DockSplit | DockTabs;

const splitSize = Schema.Number.pipe(
  Schema.withConstructorDefault(Effect.succeed(0.5)),
);

export const DockSplit: Schema.Codec<DockSplit> = Schema.Struct({
  kind: Schema.tag("split"),
  id: Schema.NonEmptyString,
  orientation: Orientation,
  size: splitSize,
  first: Schema.suspend((): Schema.Codec<DockNode> => DockNode),
  second: Schema.suspend((): Schema.Codec<DockNode> => DockNode),
});

export const DockTabs: Schema.Codec<DockTabs> = Schema.Struct({
  kind: Schema.tag("tabs"),
  id: Schema.NonEmptyString,
  activeTab: Schema.NonEmptyString,
  tabs: Schema.Array(DockTab),
});

export const DockNode: Schema.Codec<DockNode> = Schema.Union([
  DockSplit,
  DockTabs,
]).pipe(Schema.toTaggedUnion("kind"));

export const DockNodeJson = Schema.fromJsonString(DockNode);

export const resizeSplit = (size: number, delta: number): number =>
  clampSize(size + delta, { min: 0, max: 1 });

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
