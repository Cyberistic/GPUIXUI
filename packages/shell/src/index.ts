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
  statusToneOf,
  toneForeground,
  type StatusBarTone,
} from "./status-bar/logic.js";

export { Toolbar } from "./toolbar/toolbar.js";
export type { ToolbarAction, ToolbarProps } from "./toolbar/toolbar.js";
export {
  initialRoving,
  moveRoving,
  splitOverflow,
  type OverflowSplit,
  type ToolbarItemSpec,
} from "./toolbar/logic.js";
