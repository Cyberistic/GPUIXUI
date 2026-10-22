/**
 * `@gpuixui/files` — file and inspector surfaces rendered by GPUix through React.
 *
 * Three compositions over the generic primitives, each with a pure half that a
 * store or an Effect can drive without the component:
 *
 * - `tree/` — `FileTree`, a file tree with a glyph per kind and single/multi
 *   selection, over `@gpuixui/data`'s tree; `buildFileTree` nests a flat path
 *   list.
 * - `log/` — `LogViewer`, a virtualized, tail-anchored log with a level filter
 *   and per-level tints; `parseLogLine` and `filterByLevel` are pure.
 * - `property/` — `PropertyPanel`, a labelled key/value editor over
 *   `@gpuixui/primitives` fields; `propertyRecord` and `setProperty` are pure.
 */

export { buildFileTree, fileIcon, fileKindOf } from "./tree/logic.js";
export type { FileKind, FileNode } from "./tree/logic.js";

export { FileTree } from "./tree/file-tree.js";
export type { FileTreeProps } from "./tree/file-tree.js";

export {
  DEFAULT_LEVEL,
  filterByLevel,
  isLogLevel,
  levelTone,
  LOG_LEVELS,
  parseLogLine,
} from "./log/logic.js";
export type { LogEntry, LogLevel } from "./log/logic.js";

export { LEVEL_COLUMN_WIDTH, LogViewer } from "./log/log-viewer.js";
export type { LogViewerProps } from "./log/log-viewer.js";

export {
  isBooleanRow,
  isNumberRow,
  isSelectRow,
  isTextRow,
  propertyRecord,
  setProperty,
} from "./property/logic.js";
export type {
  BooleanPropertyRow,
  NumberPropertyRow,
  PropertyRecord,
  PropertyRow,
  PropertyRowBase,
  PropertyValue,
  SelectPropertyRow,
  TextPropertyRow,
} from "./property/logic.js";

export {
  DEFAULT_LABEL_WIDTH,
  PropertyPanel,
} from "./property/property-panel.js";
export type { PropertyPanelProps } from "./property/property-panel.js";
