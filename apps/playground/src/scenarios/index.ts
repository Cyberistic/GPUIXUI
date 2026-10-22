/**
 * The scenario registry — the join of the pure metadata and the GPUix views.
 *
 * `registry.ts` owns `id`/`title`/`capability` and imports nothing native, so the
 * CLI can validate arguments and print ids before the preflight. This module
 * attaches the one implementation per id; `Record<ScenarioId, ScenarioBody>`
 * makes a missing or misspelt implementation a compile error, and an extra id
 * cannot be added without an entry in the registry.
 *
 * Import it only after the runtime preflight: the views import `@gpuix/react`,
 * which loads the native binding.
 */
import * as Arr from "effect/Array";
import type { PlaygroundScenario, ScenarioBody } from "../types.js";
import { registry, type ScenarioId } from "./registry.js";
import { layoutScenario } from "./layout.js";
import { textScenario } from "./text.js";
import { textSelectionScenario } from "./selection.js";
import { inputScenario } from "./input.js";
import { fileDropScenario } from "./file-drop.js";
import { focusScenario } from "./focus.js";
import { overlayScenario } from "./overlay.js";
import { scrollScenario } from "./scroll.js";
import { scrollHorizontalScenario } from "./scroll-horizontal.js";
import { tabOverflowScenario } from "./tab-overflow.js";
import { panelScenario } from "./panel.js";
import { virtualListScenario } from "./virtual-list.js";
import { virtualListWindowedScenario } from "./virtual-list-windowed.js";
import { virtualListRowsScenario } from "./virtual-list-rows.js";
import { virtualListExpandScenario } from "./virtual-list-expand.js";
import { tableColumnResizeScenario, tableSelectSortScenario } from "./table.js";
import { dataGridScenario } from "./data-grid.js";
import { dataGridFrozenColumnScenario } from "./data-grid-frozen-column.js";
import { workspaceScenario } from "./workspace.js";
import { dragAutoscrollScenario } from "./drag-autoscroll.js";
import { dockingScenario } from "./docking.js";
import { shortcutScenario } from "./shortcuts.js";
import { shellNavigationScenario } from "./shell.js";
import { virtualizedTableScenario } from "./virtual-table.js";
import { treeScenario } from "./tree.js";
import { logViewerScenario } from "./log-viewer.js";
import { editorScenario } from "./editor.js";
import { examplesMountScenario } from "./examples.js";
import { searchHighlightsScenario } from "./search-highlights.js";
import { modalScenario } from "./modal.js";
import { floatingScenario } from "./floating.js";
import {
  themeColorRolesScenario,
  themeLookScenario,
  themePlatformScenario,
  themeTypeAndShadowScenario,
} from "./theme.js";

/** One implementation per registered scenario id. */
export const implementations: Record<ScenarioId, ScenarioBody> = {
  "layout-flex": layoutScenario,
  "text-native": textScenario,
  "text-selection": textSelectionScenario,
  "input-edit": inputScenario,
  "file-drop": fileDropScenario,
  "focus-traversal": focusScenario,
  "overlay-dialog": overlayScenario,
  "modal-focus-trap": modalScenario,
  "floating-placement": floatingScenario,
  "scroll-container": scrollScenario,
  "scroll-horizontal": scrollHorizontalScenario,
  "tab-overflow": tabOverflowScenario,
  "panel-resize": panelScenario,
  "virtual-list-window": virtualListScenario,
  "virtual-list-windowed": virtualListWindowedScenario,
  "virtual-list-rows": virtualListRowsScenario,
  "virtual-list-expand": virtualListExpandScenario,
  "table-select-sort": tableSelectSortScenario,
  "table-column-resize": tableColumnResizeScenario,
  "data-grid-frozen-column": dataGridFrozenColumnScenario,
  "data-grid-fixed-header": dataGridScenario,
  "workspace-tab-drag": workspaceScenario,
  "drag-autoscroll": dragAutoscrollScenario,
  "docking-nested": dockingScenario,
  "window-key-shortcut": shortcutScenario,
  "theme-color-roles": themeColorRolesScenario,
  "theme-type-and-shadow": themeTypeAndShadowScenario,
  "theme-platform": themePlatformScenario,
  "theme-look": themeLookScenario,
  "shell-navigation": shellNavigationScenario,
  "virtualized-table": virtualizedTableScenario,
  "tree-view": treeScenario,
  "log-viewer": logViewerScenario,
  "search-highlights": searchHighlightsScenario,
  "editor-surface": editorScenario,
  "examples-mount": examplesMountScenario,
};

/** The full scenarios, in registry order. */
export const scenarios: ReadonlyArray<PlaygroundScenario> = Arr.map(
  registry,
  (meta) => ({ ...meta, ...implementations[meta.id] }),
);
