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
import { chartScenario } from "./chart.js";
import { markdownScenario } from "./markdown.js";
import { toastScenario } from "./toast.js";
import { nativeSurfacesScenario } from "./surfaces.js";
import { dragTargetsScenario } from "./drag-targets.js";
import { dragAutoscrollScenario } from "./drag-autoscroll.js";
import { listReorderScenario } from "./reorder.js";
import { treeReorderScenario } from "./tree-reorder.js";
import { contextMenuScenario } from "./context-menu.js";
import { menuBarScenario } from "./menu-bar.js";
import { nestedLayerScenario } from "./layers.js";
import { virtualizedTreeScenario } from "./virtual-tree.js";
import { scrollIntoViewScenario } from "./scroll-into-view.js";
import { textSelectionScenario } from "./text-selection.js";
import { searchScenario } from "./search.js";
import { searchReplaceScenario } from "./search-replace.js";
import { replaceScenario } from "./replace.js";
import { layoutScenario } from "./layout.js";
import { layoutGridScenario } from "./layout-grid.js";
import { textScenario } from "./text.js";
import { typographyScenario } from "./typography.js";
import { inputScenario } from "./input.js";
import { textEntryScenario } from "./text-entry.js";
import { pointerEntryScenario } from "./pointer-entry.js";
import { focusScenario } from "./focus.js";
import { rovingFocusScenario } from "./roving-focus.js";
import { overlayScenario } from "./overlay.js";
import { comboboxScenario, selectScenario, tooltipScenario } from "./popups.js";
import { scrollScenario } from "./scroll.js";
import { tabOverflowScenario } from "./tab-overflow.js";
import { tabFocusScenario } from "./tab-focus.js";
import { panelScenario } from "./panel.js";
import { panelNestedScenario } from "./panel-nested.js";
import { motionScenario } from "./motion.js";
import { collapsibleHeightScenario } from "./collapsible.js";
import { virtualListScenario } from "./virtual-list.js";
import { variableRowsScenario } from "./variable-rows.js";
import { tableColumnResizeScenario, tableSelectSortScenario } from "./table.js";
import { workspaceScenario } from "./workspace.js";
import { workspaceRestoreScenario } from "./workspace-restore.js";
import { shortcutScenario } from "./shortcuts.js";
import { commandPaletteScenario } from "./command-palette.js";
import { workspacePanesScenario } from "./workspace-panes.js";
import { dockingScenario } from "./docking.js";
import { floatScenario } from "./float.js";
import { previewScenario } from "./preview.js";
import { gridScenario } from "./grid.js";
import { dataGridScenario } from "./data-grid.js";
import { dataGridColumnsScenario } from "./data-grid-columns.js";
import { columnConfigScenario } from "./column-config.js";
import { appChromeScenario } from "./app-chrome.js";
import { multiPaneEditorScenario } from "./multi-pane-editor.js";
import { dataToolbarScenario } from "./data-toolbar.js";
import { queryBuilderScenario } from "./query-builder.js";
import { notificationCentreScenario } from "./notification-centre.js";
import { cropScenario } from "./crop.js";
import { wizardScenario } from "./wizard.js";
import { gridCellEditingScenario } from "./grid-editor.js";
import { fileUploadScenario } from "./file-upload.js";
import { propertyPanelScenario } from "./property-panel.js";
import { shellNavigationScenario, shellSelectionScenario } from "./shell.js";
import { terminalScenario } from "./terminal.js";
import { virtualizedTableScenario } from "./virtual-table.js";
import { treeScenario } from "./tree.js";
import { logViewerScenario } from "./log-viewer.js";
import { modalScenario } from "./modal.js";
import { floatingScenario } from "./floating.js";
import {
  themeColorRolesScenario,
  themePlatformScenario,
  themeTypeAndShadowScenario,
} from "./theme.js";
import {
  primitivesActionsScenario,
  primitivesDisplayScenario,
  primitivesFieldsScenario,
} from "./primitives.js";
import {
  primitivesChoiceScenario,
  primitivesEntryScenario,
} from "./primitives-advanced.js";
import { messageScrollerScenario } from "./message-scroller.js";
import { qrScenario } from "./qr-code.js";
import { scaleCostScenario } from "./scale.js";
import { tier2DialogScenario } from "./tier2-dialog.js";
import { tier2FoundationScenario } from "./tier2-foundation.js";
import { tier2MenuScenario } from "./tier2-menu.js";
import { tier2NavigationScenario } from "./tier2-navigation.js";
import { tier2ToastScenario } from "./tier2-toast.js";
import { tier2ChoiceScenario } from "./tier2-choice.js";
import { tier2EditingScenario } from "./tier2-editing.js";
import { tier2FlowScenario } from "./tier2-flow.js";
import { tier2FormsScenario } from "./tier2-forms.js";
import { declaredStylesScenario, textTruncationScenario } from "./styles.js";

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
  "components",
  "tier2",
] as const;

/** The Tier 3/4 and desktop-input capabilities the feasibility probes cover (plans `130`, `152`–`154`, `157`, `162`, `164`, `335`). */
export const PROBE_CAPABILITIES = [
  "table",
  "tree",
  "log",
  "workspace",
  "command",
  "motion",
  "drag",
  "reorder",
  "tree-reorder",
  "menu",
  "menubar",
  "search",
  "terminal",
  "chart",
  "toast",
  "docking",
  "float",
  "preview",
  "grid",
  "data-grid",
  "columns",
  "column-config",
  "chrome",
  "scroller",
  "scale",
  "replace",
  "states",
  "truncation",
  "grid-layout",
  "typography",
  "inspector",
  "editor",
  "data-toolbar",
  "query",
  "notification",
  "crop",
  "wizard",
  "cell-editing",
  "upload",
  "qr",
] as const;

/** One view per capability, in the order the suite runs them. */
export const scenarios: ReadonlyArray<PlaygroundScenario> = [
  layoutScenario,
  layoutGridScenario,
  textScenario,
  typographyScenario,
  inputScenario,
  textEntryScenario,
  pointerEntryScenario,
  focusScenario,
  rovingFocusScenario,
  overlayScenario,
  modalScenario,
  floatingScenario,
  selectScenario,
  comboboxScenario,
  tooltipScenario,
  scrollScenario,
  tabOverflowScenario,
  tabFocusScenario,
  panelScenario,
  panelNestedScenario,
  motionScenario,
  collapsibleHeightScenario,
  virtualListScenario,
  variableRowsScenario,
  tableSelectSortScenario,
  tableColumnResizeScenario,
  workspaceScenario,
  workspaceRestoreScenario,
  commandPaletteScenario,
  workspacePanesScenario,
  dockingScenario,
  floatScenario,
  previewScenario,
  gridScenario,
  dataGridScenario,
  dataGridColumnsScenario,
  columnConfigScenario,
  appChromeScenario,
  multiPaneEditorScenario,
  dataToolbarScenario,
  queryBuilderScenario,
  notificationCentreScenario,
  cropScenario,
  wizardScenario,
  gridCellEditingScenario,
  fileUploadScenario,
  propertyPanelScenario,
  shortcutScenario,
  themeColorRolesScenario,
  themeTypeAndShadowScenario,
  themePlatformScenario,
  a11yScenario,
  nativeSurfacesScenario,
  dragTargetsScenario,
  dragAutoscrollScenario,
  listReorderScenario,
  treeReorderScenario,
  contextMenuScenario,
  menuBarScenario,
  nestedLayerScenario,
  virtualizedTreeScenario,
  scrollIntoViewScenario,
  textSelectionScenario,
  shellNavigationScenario,
  shellSelectionScenario,
  virtualizedTableScenario,
  treeScenario,
  logViewerScenario,
  primitivesActionsScenario,
  primitivesFieldsScenario,
  primitivesDisplayScenario,
  primitivesChoiceScenario,
  primitivesEntryScenario,
  searchScenario,
  searchReplaceScenario,
  replaceScenario,
  terminalScenario,
  chartScenario,
  markdownScenario,
  toastScenario,
  messageScrollerScenario,
  scaleCostScenario,
  qrScenario,
  tier2DialogScenario,
  tier2FoundationScenario,
  tier2MenuScenario,
  tier2NavigationScenario,
  tier2ToastScenario,
  tier2ChoiceScenario,
  tier2FormsScenario,
  tier2EditingScenario,
  tier2FlowScenario,
  declaredStylesScenario,
  textTruncationScenario,
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
