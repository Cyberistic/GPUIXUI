import { Match } from "effect";
import * as Arr from "effect/Array";
import {
  PANEL_GROUP_DIVIDER,
  PANEL_GROUP_PANELS,
  availableWidth,
} from "../scenarios/panel-group-fixture.js";

export const PANEL_IDS = {
  before: "panel-group-before",
  group: "panel-group",
  readout: "panel-group-readout",
} as const;

export const paneId = (id: string): string => `${PANEL_IDS.group}-pane-${id}`;

export const dividerId = (index: number): string =>
  `${PANEL_IDS.group}-divider-${index}`;

export const PANE_FILLS = {
  sidebar: "#FF3B30",
  editor: "#34C759",
  inspector: "#007AFF",
} as const;

export const PANE_BODIES = {
  sidebar: "Sidebar body copy.",
  editor: "Editor body copy.",
  inspector: "Inspector body copy.",
} as const;

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

const totalSize = (): number =>
  Arr.reduce(PANEL_GROUP_PANELS, 0, (sum, panel) => sum + panel.size);

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
