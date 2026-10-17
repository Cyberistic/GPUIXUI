/**
 * The scenario registry — the single source of truth for the sidebar and the
 * smoke runner.
 *
 * `scenarioProblems` is pure so the integrity check runs on any host: unique,
 * non-empty ids, every declared capability in the union, and every core and
 * Tier 3/4 capability represented.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";
import { a11yScenario } from "./a11y.js";
import { nativeSurfacesScenario } from "./surfaces.js";
import { dragTargetsScenario } from "./drag-targets.js";
import { contextMenuScenario } from "./context-menu.js";
import { textSelectionScenario } from "./text-selection.js";
import { layoutScenario } from "./layout.js";
import { textScenario } from "./text.js";
import { inputScenario } from "./input.js";
import { focusScenario } from "./focus.js";
import { rovingFocusScenario } from "./roving-focus.js";
import { overlayScenario } from "./overlay.js";
import { comboboxScenario, selectScenario, tooltipScenario } from "./popups.js";
import { scrollScenario } from "./scroll.js";
import { panelScenario } from "./panel.js";
import { motionScenario } from "./motion.js";
import { virtualListScenario } from "./virtual-list.js";
import { tableColumnResizeScenario, tableSelectSortScenario } from "./table.js";
import { workspaceScenario } from "./workspace.js";
import { shortcutScenario } from "./shortcuts.js";
import { shellNavigationScenario } from "./shell.js";
import { virtualizedTableScenario } from "./virtual-table.js";
import { treeScenario } from "./tree.js";
import { logViewerScenario } from "./log-viewer.js";
import { modalScenario } from "./modal.js";
import { floatingScenario } from "./floating.js";
import {
  themeColorRolesScenario,
  themeTypeAndShadowScenario,
} from "./theme.js";

/** The capabilities Phase B must prove in the real runtime. */
export const CORE_CAPABILITIES = [
  "layout",
  "text",
  "input",
  "focus",
  "overlay",
  "modal",
  "floating",
  "select",
  "combobox",
  "tooltip",
  "scroll",
  "panel",
  "virtual-list",
  "theme",
  "a11y",
  "content",
  "selection",
] as const;

/** The Tier 3/4 and desktop-input capabilities the feasibility probes cover (plans `130`, `152`–`154`, `157`, `162`, `164`). */
export const PROBE_CAPABILITIES = [
  "table",
  "tree",
  "log",
  "workspace",
  "motion",
  "drag",
  "menu",
] as const;

/** One view per capability, in the order the suite runs them. */
export const scenarios: ReadonlyArray<PlaygroundScenario> = [
  layoutScenario,
  textScenario,
  inputScenario,
  focusScenario,
  rovingFocusScenario,
  overlayScenario,
  modalScenario,
  floatingScenario,
  selectScenario,
  comboboxScenario,
  tooltipScenario,
  scrollScenario,
  panelScenario,
  motionScenario,
  virtualListScenario,
  tableSelectSortScenario,
  tableColumnResizeScenario,
  workspaceScenario,
  shortcutScenario,
  themeColorRolesScenario,
  themeTypeAndShadowScenario,
  a11yScenario,
  nativeSurfacesScenario,
  dragTargetsScenario,
  contextMenuScenario,
  textSelectionScenario,
  shellNavigationScenario,
  virtualizedTableScenario,
  treeScenario,
  logViewerScenario,
];

const isCapability = Schema.is(Smoke.Capability);

/**
 * Every integrity problem in `list`. An empty array means valid.
 *
 * The bug it guards: a scenario added with a duplicate or empty id, an unknown
 * capability, or a required capability left uncovered would make the smoke
 * report claim coverage it does not have.
 */
export const scenarioProblems = (
  list: ReadonlyArray<PlaygroundScenario>,
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

/** The scenarios a `--only <id>` run selected, or all of them when none. */
export const selectScenarios = (
  list: ReadonlyArray<PlaygroundScenario>,
  only: Option.Option<string>,
): ReadonlyArray<PlaygroundScenario> =>
  Option.match(only, {
    onNone: () => list,
    onSome: (id) => Arr.filter(list, (scenario) => scenario.id === id),
  });
