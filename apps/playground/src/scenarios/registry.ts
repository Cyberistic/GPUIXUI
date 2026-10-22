/**
 * The scenario metadata — the single source of truth for the sidebar, the smoke
 * runner and `--list`.
 *
 * This module imports nothing from GPUix or React, so the CLI can validate its
 * arguments and print the ids on a host with no binding; the views and steps are
 * attached in `index.ts`, after the preflight.
 *
 * `scenarioProblems` is pure for the same reason: the integrity check must run
 * on any host.
 */
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import { Smoke } from "@gpuixui/testing";

/** The capabilities Phase B must prove in the real runtime. */
export const CORE_CAPABILITIES = [
  "layout",
  "text",
  "input",
  "focus",
  "overlay",
  "modal",
  "floating",
  "scroll",
  "panel",
  "virtual-list",
  "theme",
] as const;

/** The Tier 3/4 capabilities the feasibility probes cover (plans `130`, `152`–`154`). */
export const PROBE_CAPABILITIES = [
  "table",
  "tree",
  "log",
  "workspace",
  "editor",
] as const;

/** One scenario's identity: what it is called and which capability it proves. */
export interface ScenarioMeta {
  readonly id: string;
  readonly title: string;
  readonly capability: Smoke.Capability;
}

/** One view per capability, in the order the suite runs them. */
export const registry = [
  {
    id: "layout-flex",
    title: "Flex layout, gaps and absolute positioning",
    capability: "layout",
  },
  {
    id: "text-native",
    title: "Native text: <text>, <code> and <markdown>",
    capability: "text",
  },
  {
    id: "text-selection",
    title: "Text selection: selectable content copies, chrome opts out",
    capability: "text",
  },
  {
    id: "input-edit",
    title: "Input editing, onChange and onSubmit",
    capability: "input",
  },
  {
    id: "file-drop",
    title: "File drop: onFileDrop receives absolute paths, only over the zone",
    capability: "input",
  },
  {
    id: "focus-traversal",
    title: "Focus: autoFocus, click-to-focus and native traversal",
    capability: "focus",
  },
  {
    id: "overlay-dialog",
    title: "Anchored overlay: open, Escape and outside click",
    capability: "overlay",
  },
  {
    id: "modal-focus-trap",
    title: "Modal: focus entry, Tab trap, focus return, nested Escape",
    capability: "modal",
  },
  {
    id: "floating-placement",
    title: "Floating layer: side, align, offset and the window-edge snap",
    capability: "floating",
  },
  {
    id: "scroll-container",
    title: "Scroll: wheel offset, onScroll and scrollIntoView",
    capability: "scroll",
  },
  {
    id: "scroll-horizontal",
    title: "Scroll: an overflowX strip moves on the X axis and clamps",
    capability: "scroll",
  },
  {
    id: "tab-overflow",
    title:
      "Tabs: a clipped selection stays put until the strip reveals it with scrollIntoView",
    capability: "scroll",
  },
  {
    id: "drag-autoscroll",
    title:
      "Drag: a rail does not scroll at its edge by itself; the caller's scrollTo does",
    capability: "workspace",
  },
  {
    id: "panel-resize",
    title: "Panel resize: pointer capture and clamping",
    capability: "panel",
  },
  {
    id: "virtual-list-window",
    title: "Virtual list builds only a window of rows",
    capability: "virtual-list",
  },
  {
    id: "table-select-sort",
    title: "Table: sort, row selection and scroll",
    capability: "table",
  },
  {
    id: "table-column-resize",
    title: "Table: column resize by drag",
    capability: "table",
  },
  {
    id: "data-grid-frozen-column",
    title: "Data grid: a frozen column stays aligned with the scrolling rows",
    capability: "table",
  },
  {
    id: "data-grid-fixed-header",
    title:
      "Table: a fixed header with one shared horizontal scroll (no sticky in the runtime)",
    capability: "table",
  },
  {
    id: "workspace-tab-drag",
    title: "Workspace: tabs, drag between panes and split resize",
    capability: "workspace",
  },
  {
    id: "docking-nested",
    title:
      "Workspace: nested splits, a collapsible caller-owned sidebar and a tabbed pane",
    capability: "workspace",
  },
  {
    id: "dock-reflow",
    title: "Dock reflow: a pane's onLayout reports the width a sibling takes",
    capability: "workspace",
  },
  {
    id: "window-key-shortcut",
    title: "App-level window shortcut: cmd-k palette and Escape",
    capability: "workspace",
  },
  {
    id: "theme-color-roles",
    title: "Theme: every colour role paints and the switch re-paints",
    capability: "theme",
  },
  {
    id: "theme-type-and-shadow",
    title: "Theme: type roles, focus ring and elevation reach the runtime",
    capability: "theme",
  },
  {
    id: "theme-platform",
    title:
      "Theme: each platform's palette, radius, density and mono family reach the runtime",
    capability: "theme",
  },
  {
    id: "theme-look",
    title:
      "Theme: each authored look's palette, radius, density and mono family reach the runtime",
    capability: "theme",
  },
  {
    id: "shell-navigation",
    title: "Playground shell: the scenario list scrolls",
    capability: "layout",
  },
  {
    id: "virtual-list-windowed",
    title: "Windowed virtual list: itemCount mounts only the slice it paints",
    capability: "virtual-list",
  },
  {
    id: "virtual-list-rows",
    title: "Virtual list measures each row's own height",
    capability: "virtual-list",
  },
  {
    id: "virtual-list-expand",
    title:
      "Virtual list re-measures a painted row that expands, and keeps it open",
    capability: "virtual-list",
  },
  {
    id: "virtualized-table",
    title: "Table inside <virtual-list>: window, click, selection",
    capability: "table",
  },
  {
    id: "tree-view",
    title: "Tree: indentation, expand/collapse and arrow keys",
    capability: "tree",
  },
  {
    id: "log-viewer",
    title: "Log viewer: starts at the tail and follows appends",
    capability: "log",
  },
  {
    id: "search-highlights",
    title:
      "Search: the runtime counts matches by query, case and whole word, and by explicit ranges",
    capability: "table",
  },
  {
    id: "editor-surface",
    title:
      "Editor: a textarea edits lines and caret, <code> and <diff> paint a read-only view",
    capability: "editor",
  },
  {
    id: "examples-mount",
    title: "Every shipped example mounts, lays out and paints its own content",
    capability: "layout",
  },
] as const satisfies ReadonlyArray<ScenarioMeta>;

/** The id of a registered scenario. */
export type ScenarioId = (typeof registry)[number]["id"];

const isCapability = Schema.is(Smoke.Capability);

/**
 * Every integrity problem in `list`. An empty array means valid.
 *
 * The bug it guards: a scenario added with a duplicate or empty id, an unknown
 * capability, or a required capability left uncovered would make the smoke
 * report claim coverage it does not have.
 */
export const scenarioProblems = (
  list: ReadonlyArray<ScenarioMeta>,
): ReadonlyArray<string> => {
  const ids = Arr.map(list, (scenario) => scenario.id);
  const capabilities = Arr.map(list, (scenario) => scenario.capability);
  const required = Arr.appendAll(
    [...CORE_CAPABILITIES],
    [...PROBE_CAPABILITIES],
  );

  return Arr.flatten([
    Arr.filter(ids, Str.isEmpty).map(() => "a scenario has an empty id"),
    Arr.length(ids) === Arr.length(Arr.dedupe(ids))
      ? []
      : ["scenario ids are not unique"],
    Arr.filter(list, (scenario) => !isCapability(scenario.capability)).map(
      (scenario) => `unknown capability "${scenario.capability}"`,
    ),
    Arr.filter(
      required,
      (capability) => !Arr.contains(capabilities, capability),
    ).map((capability) => `no scenario covers "${capability}"`),
  ]);
};

/** The scenarios a `--only` run selected, or all of them when none. */
export const selectScenarios = <A extends ScenarioMeta>(
  list: ReadonlyArray<A>,
  only: ReadonlyArray<string>,
): ReadonlyArray<A> =>
  Arr.match(only, {
    onEmpty: () => list,
    onNonEmpty: (ids) =>
      Arr.filter(list, (scenario) => Arr.contains(ids, scenario.id)),
  });
