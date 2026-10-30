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

export { TitleBar } from "./platform/title-bar.js";
export type { TitleBarProps } from "./platform/title-bar.js";
export {
  TITLE_BAR_HEIGHT,
  TRAFFIC_LIGHT_INSET,
  pickedPaths,
  titleBarPadding,
  type PickedPaths,
  type TitleBarDensity,
} from "./platform/logic.js";
export {
  FilePanelError,
  useWindowActions,
  windowActions,
} from "./platform/window.js";
export type { WindowActions, WindowHost } from "./platform/window.js";
