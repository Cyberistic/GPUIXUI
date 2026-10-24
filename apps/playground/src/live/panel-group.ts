/**
 * The `panel-group-lifecycle` fixture: the shipped `PanelGroup` in a window.
 *
 * `panel-group-core` reads the package's arithmetic off the offscreen renderer,
 * and `dock-split-lifecycle` proves the shipped `SplitPane` in a window — but the
 * shipped **`PanelGroup`**, the Tier 4 surface a workspace composes, had never
 * painted in a real window. The questions a window answers are the ones a tree
 * read cannot: do the fractions land on the glass, does a collapsed pane really
 * paint its freed share blank, and does the native traversal reach the toggle
 * and the divider the way the offscreen keys do?
 *
 * The ids are derived from the component's own naming (`${testId}-pane-${id}`,
 * `${testId}-divider-${index}` in `panel-group.tsx`), so the probe cannot
 * address an element the package does not paint. The arithmetic is the headless
 * fixture's, so the two lanes cannot disagree about what a fraction means.
 *
 * Native-free, so the premises are testable on a host with no binding.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import {
  PANEL_GROUP_DIVIDER,
  PANEL_GROUP_PANELS,
  availableWidth,
} from "../scenarios/panel-group-fixture.js";

/** The ids the view and the steps share. */
export const PANEL_IDS = {
  before: "panel-group-before",
  group: "panel-group",
  readout: "panel-group-readout",
} as const;

/** One pane's `testId`, matching `panel-group.tsx`'s own suffix. */
export const paneId = (id: string): string => `${PANEL_IDS.group}-pane-${id}`;

/** One divider's `testId`, matching `panel-group.tsx`'s own suffix. */
export const dividerId = (index: number): string =>
  `${PANEL_IDS.group}-divider-${index}`;

/**
 * What each pane paints.
 *
 * Three literals rather than theme roles: the pane's body is the **caller's
 * content**, and a sample that matched a role could pass against the group's
 * own surface instead of the child that covers it.
 */
export const PANE_FILLS = {
  sidebar: "#FF3B30",
  editor: "#34C759",
  inspector: "#007AFF",
} as const;

/** The line each pane paints, so a collapsed body can be told from a covered one. */
export const PANE_BODIES = {
  sidebar: "Sidebar body copy.",
  editor: "Editor body copy.",
  inspector: "Inspector body copy.",
} as const;

/** The content a known pane paints; an unknown id gets the caller's fallback. */
export const paneContent = (
  id: string,
  fallback: { readonly fill: string; readonly body: string },
): { readonly fill: string; readonly body: string } =>
  Match.value(id).pipe(
    Match.when("sidebar", () => ({
      fill: PANE_FILLS.sidebar,
      body: PANE_BODIES.sidebar,
    })),
    Match.when("editor", () => ({
      fill: PANE_FILLS.editor,
      body: PANE_BODIES.editor,
    })),
    Match.when("inspector", () => ({
      fill: PANE_FILLS.inspector,
      body: PANE_BODIES.inspector,
    })),
    Match.orElse(() => fallback),
  );

/**
 * The shares once one pane is collapsed.
 *
 * Measured in a window, a collapsed pane keeps only its header and the expanded
 * panes take their **fractions of the freed space**, so the remainder paints
 * nothing. The probe derives the blank strip from the collapsed box it measured
 * rather than assuming the header's width.
 */
export const collapsedShares = (
  groupWidth: number,
  collapsedId: string,
  collapsedWidth: number,
): {
  readonly freed: number;
  readonly expanded: number;
  readonly gap: number;
} => {
  const freed =
    availableWidth(groupWidth, PANEL_GROUP_PANELS.length) - collapsedWidth;
  const expanding = Arr.reduce(PANEL_GROUP_PANELS, 0, (sum, panel) =>
    panel.id === collapsedId ? sum : sum + panel.size,
  );
  return { freed, expanded: freed * expanding, gap: freed * (1 - expanding) };
};

/** The panels' fractions sum to one, so a share is of the whole. */
const totalSize = (): number =>
  Arr.reduce(PANEL_GROUP_PANELS, 0, (sum, panel) => sum + panel.size);

/**
 * Where one divider starts, relative to the group's left edge: every pane
 * before it, and the dividers already between them.
 */
export const dividerStart = (groupWidth: number, index: number): number => {
  const available = availableWidth(groupWidth, PANEL_GROUP_PANELS.length);
  const total = totalSize();
  return Arr.reduce(PANEL_GROUP_PANELS, 0, (sum, panel, at) =>
    at <= index
      ? sum +
        (panel.size / total) * available +
        (at < index ? PANEL_GROUP_DIVIDER : 0)
      : sum,
  );
};
