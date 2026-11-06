import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const TAB_GROUP_IDS = ["left", "right"] as const;

export type TabGroupId = (typeof TAB_GROUP_IDS)[number];

export const TAB_GROUP_GAP = 24;

export interface TabGroup {
  readonly tabs: ReadonlyArray<string>;
  readonly selected: Option.Option<string>;
}

export type TabLayout = Readonly<Record<TabGroupId, TabGroup>>;

export const TAB_GROUP_INITIAL: TabLayout = {
  left: {
    tabs: ["alpha", "bravo", "charlie"],
    selected: Option.some("alpha"),
  },
  right: { tabs: ["delta", "echo"], selected: Option.some("delta") },
};

export interface GroupBox {
  readonly group: TabGroupId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TabBox {
  readonly tab: string;
  readonly x: number;
  readonly width: number;
}

export interface DropTarget {
  readonly group: TabGroupId;

  readonly index: number;
}

export const tabId = (tab: string): string => `movable-tab-${tab}`;

export const stripId = (group: TabGroupId): string => `movable-strip-${group}`;

export const groupBoxId = (group: TabGroupId): string =>
  `movable-group-${group}`;

export const panelId = (group: TabGroupId): string => `movable-panel-${group}`;

export const panelTitleId = (group: TabGroupId, tab: string): string =>
  `movable-title-${group}-${tab}`;

export const panelFieldId = (tab: string): string => `movable-field-${tab}`;

export const MOVABLE_READOUT = "movable-readout";

export const MOVABLE_DRAFT = "movable-draft";

export const panelTitle = (tab: string): string => `${tab} document`;

export const groupAt = (
  point: { readonly x: number; readonly y: number },
  boxes: ReadonlyArray<GroupBox>,
): Option.Option<TabGroupId> =>
  Option.map(
    Arr.findFirst(
      boxes,
      (box) =>
        point.x >= box.x &&
        point.x <= box.x + box.width &&
        point.y >= box.y &&
        point.y <= box.y + box.height,
    ),
    (box) => box.group,
  );

export const insertionIndex = (
  boxes: ReadonlyArray<TabBox>,
  x: number,
): number =>
  Option.getOrElse(
    Arr.findFirstIndex(boxes, (box) => x < box.x + box.width / 2),
    () => Arr.length(boxes),
  );

export const groupOf = (
  layout: TabLayout,
  tab: string,
): Option.Option<TabGroupId> =>
  Arr.findFirst(TAB_GROUP_IDS, (group) =>
    Arr.contains(layout[group].tabs, tab),
  );

const withoutTab = (group: TabGroup, tab: string): TabGroup => {
  const removedAt = Option.getOrElse(
    Arr.findFirstIndex(group.tabs, (candidate) => candidate === tab),
    () => 0,
  );
  const tabs = Arr.remove(group.tabs, removedAt);
  const selected = Option.exists(group.selected, (current) => current === tab)
    ? Arr.get(tabs, Math.min(removedAt, tabs.length - 1))
    : group.selected;
  return { tabs, selected };
};

export const moveTab = (
  layout: TabLayout,
  tab: string,
  target: DropTarget,
): TabLayout =>
  Option.match(groupOf(layout, tab), {
    onNone: () => layout,
    onSome: (source) => {
      const destination =
        source === target.group
          ? withoutTab(layout[source], tab).tabs
          : layout[target.group].tabs;
      const index = Math.max(0, Math.min(target.index, destination.length));
      const tabs = Option.getOrElse(
        Arr.insertAt(destination, index, tab),
        () => destination,
      );
      const placed: TabGroup = { tabs, selected: Option.some(tab) };
      return source === target.group
        ? { ...layout, [source]: placed }
        : {
            ...layout,
            [source]: withoutTab(layout[source], tab),
            [target.group]: placed,
          };
    },
  });

export const stepTab = (
  layout: TabLayout,
  tab: string,
  delta: -1 | 1,
): TabLayout =>
  Option.match(groupOf(layout, tab), {
    onNone: () => layout,
    onSome: (group) => {
      const current = layout[group];
      const from = Option.getOrElse(
        Arr.findFirstIndex(current.tabs, (candidate) => candidate === tab),
        () => 0,
      );
      const to = Math.max(
        0,
        Math.min(from + delta, Arr.length(current.tabs) - 1),
      );
      if (from === to) return layout;
      const without = Arr.remove(current.tabs, from);
      const tabs = Option.getOrElse(
        Arr.insertAt(without, to, tab),
        () => without,
      );
      return { ...layout, [group]: { tabs, selected: Option.some(tab) } };
    },
  });

export const groupOrder = (layout: TabLayout, group: TabGroupId): string =>
  Arr.join(layout[group].tabs, ",") || "none";

export const groupSelection = (layout: TabLayout, group: TabGroupId): string =>
  Option.getOrElse(layout[group].selected, () => "none");

export const tabReadout = (layout: TabLayout): string =>
  Arr.map(
    TAB_GROUP_IDS,
    (group) =>
      `${group}=${groupOrder(layout, group)} selected=${groupSelection(
        layout,
        group,
      )}`,
  ).join(" | ");
