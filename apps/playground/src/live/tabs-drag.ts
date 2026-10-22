/**
 * The two-group tab strip `movable-tabs-lifecycle` drives, and the rules a
 * movable tab owes.
 *
 * Tier 4's **detachable / movable tabs** row is `partial` for one reason — the
 * binding opens one window per process — and the half a window *can* prove is
 * the move inside it: a tab dragged out of one strip and dropped into another,
 * and the same tab stepped by a keyboard. Both gestures are the caller's, so
 * the rules are pure and this module holds them: where a drop lands, which tab
 * each group selects afterwards, and how far a step may travel.
 *
 * A move **remounts** the tab's panel, because the tab changes parent. That is
 * why the draft lives in the app (the probe reads it back after the move) and
 * why the app re-focuses the moved tab: React cannot carry either across a
 * different parent.
 *
 * Kept native-free, as `dock-focus.ts` is, so the rules are testable on a host
 * with no binding.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The two strips a dock's tab drag needs: the source and the target. */
export const TAB_GROUP_IDS = ["left", "right"] as const;
/** One of the strips. */
export type TabGroupId = (typeof TAB_GROUP_IDS)[number];

/** The gap between the two groups; the divider a dock would put there. */
export const TAB_GROUP_GAP = 24;

/** One strip: its tabs in paint order and the one whose panel is mounted. */
export interface TabGroup {
  readonly tabs: ReadonlyArray<string>;
  readonly selected: Option.Option<string>;
}

/** Both strips, keyed by the side of the dock they occupy. */
export type TabLayout = Readonly<Record<TabGroupId, TabGroup>>;

/** The tabs each group opens with. Three on the left, so a move has a neighbour. */
export const TAB_GROUP_INITIAL: TabLayout = {
  left: {
    tabs: ["alpha", "bravo", "charlie"],
    selected: Option.some("alpha"),
  },
  right: { tabs: ["delta", "echo"], selected: Option.some("delta") },
};

/** A group's painted box, in window coordinates. */
export interface GroupBox {
  readonly group: TabGroupId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A tab's painted box, in window coordinates. */
export interface TabBox {
  readonly tab: string;
  readonly x: number;
  readonly width: number;
}

/** Where a released pointer puts the tab it was carrying. */
export interface DropTarget {
  readonly group: TabGroupId;
  /** The slot the drop tab held, in the destination's current order. */
  readonly index: number;
}

/** A tab's trigger. */
export const tabId = (tab: string): string => `movable-tab-${tab}`;
/** A strip's own box. */
export const stripId = (group: TabGroupId): string => `movable-strip-${group}`;
/** A group's panel host. */
export const groupBoxId = (group: TabGroupId): string =>
  `movable-group-${group}`;
/** The panel one group mounts. */
export const panelId = (group: TabGroupId): string => `movable-panel-${group}`;
/** The title inside a group's panel, naming the tab it is showing. */
export const panelTitleId = (group: TabGroupId, tab: string): string =>
  `movable-title-${group}-${tab}`;
/** The editing field inside a tab's panel. */
export const panelFieldId = (tab: string): string => `movable-field-${tab}`;

/** The readout that prints both orders and both selections. */
export const MOVABLE_READOUT = "movable-readout";
/** The readout that prints the draft the app kept across a move. */
export const MOVABLE_DRAFT = "movable-draft";

/** The title every probe uses for the panel a tab mounts. */
export const panelTitle = (tab: string): string => `${tab} document`;

/**
 * The group a window point falls in, or `None` for a point between or outside
 * the groups.
 *
 * A drop between two strips is a **miss**, not a drop on the nearer one: the
 * pointer must be inside the box a reader sees, the same rule the drag-reorder
 * probe applies to rows.
 */
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

/**
 * The slot a pointer at `x` names inside one strip.
 *
 * A tab's **centre** is its midpoint, so the left half of a tab invites the
 * moved tab before it and the right half after it; past the last centre is the
 * end of the strip. This is the rule a drop indicator draws, and it makes the
 * drop independent of how wide a label happens to be.
 */
export const insertionIndex = (
  boxes: ReadonlyArray<TabBox>,
  x: number,
): number =>
  Option.getOrElse(
    Arr.findFirstIndex(boxes, (box) => x < box.x + box.width / 2),
    () => Arr.length(boxes),
  );

/** The group a tab is in, or `None` for a tab no group holds. */
export const groupOf = (
  layout: TabLayout,
  tab: string,
): Option.Option<TabGroupId> =>
  Arr.findFirst(TAB_GROUP_IDS, (group) =>
    Arr.contains(layout[group].tabs, tab),
  );

/**
 * `group` with `tab` taken out, selecting the tab that takes its slot when it
 * was the selected one.
 *
 * A closed or emptied strip keeps `selected: None`, so a caller never mounts a
 * panel for a tab that is gone.
 */
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

/**
 * `layout` with `tab` moved to `target`, in either the same strip or the other
 * one.
 *
 * The moved tab becomes the destination's selection — that is the tab a reader
 * is now looking at — and the source selects its neighbour when the moved tab
 * was the one on screen. An unknown tab leaves the layout whole.
 */
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

/**
 * `layout` with `tab` stepped one slot, clamped at both ends.
 *
 * A dock tab does not wrap: the end of the strip is the end of the travel, so
 * a held key cannot move a tab back to the opposite side. The step selects the
 * tab it moved, matching the pointer gesture.
 */
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

/** The tabs a group paints, in order. */
export const groupOrder = (layout: TabLayout, group: TabGroupId): string =>
  Arr.join(layout[group].tabs, ",") || "none";

/** The tab a group mounts, or `none` for an empty strip. */
export const groupSelection = (layout: TabLayout, group: TabGroupId): string =>
  Option.getOrElse(layout[group].selected, () => "none");

/**
 * The readout the probe asserts against: both orders and both selections.
 *
 * One string, because the frame is the only witness: reading the layout back as
 * a document would let the readout and the state disagree.
 */
export const tabReadout = (layout: TabLayout): string =>
  Arr.map(
    TAB_GROUP_IDS,
    (group) =>
      `${group}=${groupOrder(layout, group)} selected=${groupSelection(
        layout,
        group,
      )}`,
  ).join(" | ");
