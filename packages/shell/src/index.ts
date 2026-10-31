/**
 * `@gpuixui/shell` — the application chrome: menu bars, status bars and toolbars.
 *
 * Each part renders through GPUix and is a thin composition of `@gpuixui/tw`
 * recipes, `@gpuixui/tokens` roles, `@gpuixui/keyboard` accelerators and the
 * `@gpuixui/primitives` keyboard arithmetic. The navigation rules are pure and
 * exported, so the chrome can be driven or tested without a renderer.
 */

export { AppMenu } from "./app-menu/app-menu.js";
export type {
  AppMenuEntry,
  AppMenuItem,
  AppMenuProps,
} from "./app-menu/app-menu.js";
export {
  dismiss,
  initial,
  step,
  type AppMenuItemSpec,
  type AppMenuSpec,
  type MenuBarAction,
  type MenuBarDismiss,
  type MenuBarState,
} from "./app-menu/logic.js";

export { StatusBar } from "./status-bar/status-bar.js";
export type { StatusBarItem, StatusBarProps } from "./status-bar/status-bar.js";
export {
  centerAlignment,
  statusToneOf,
  toneForeground,
  type StatusBarTone,
  type StatusCenterAlignment,
} from "./status-bar/logic.js";

export { Toolbar } from "./toolbar/toolbar.js";
export type {
  ToolbarAction,
  ToolbarMode,
  ToolbarProps,
} from "./toolbar/toolbar.js";
export {
  initialRoving,
  moveRoving,
  splitOverflow,
  type OverflowSplit,
  type ToolbarItemSpec,
} from "./toolbar/logic.js";

export { pickedPaths, type PickedPaths } from "./platform/logic.js";

export { Window, WindowToolbar } from "./window/window.js";
export type { WindowProps, WindowToolbarProps } from "./window/window.js";
export { SourceList, SOURCE_ROW_HEIGHT } from "./window/source-list.js";
export type {
  SourceListItem,
  SourceListProps,
  SourceListSection,
} from "./window/source-list.js";
export {
  hasTrafficLights,
  moveSelection,
  nativeWindowOptions,
  toolbarInset,
  TOOLBAR_HEIGHT,
  TRAFFIC_LIGHT_INSET,
  TRAFFIC_LIGHT_X,
  type NativeWindowOptions,
  type SourceListKey,
  type ToolbarStyle,
} from "./window/logic.js";
export {
  FilePanelError,
  useWindowActions,
  windowActions,
} from "./platform/window.js";
export type { WindowActions, WindowHost } from "./platform/window.js";

export {
  AppearanceReadError,
  appearancePoll,
  readAppearance,
  watchAppearance,
} from "./appearance/appearance.js";
export {
  accentColor,
  appearanceOverrides,
  decodeAppearance,
  type SystemAppearance,
} from "./appearance/logic.js";
