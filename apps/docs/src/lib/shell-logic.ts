/**
 * The shell package's pure reducers, read from the package that owns them.
 *
 * The shell drawings need the **rules** behind the chrome — the toolbar's
 * overflow split and roving tab stop, the menu bar's traversal and hover rule,
 * the status bar's tone roles. `@gpuixui/shell` publishes its components and
 * their types, and its root re-exports the components: GPUix JSX the docs app,
 * a DOM app, cannot compile. So this module reads the three logic modules the
 * package ships, which is where the rules live and what the package's own
 * tests read.
 *
 * The drawings import this module and nothing else, so the day the package
 * publishes a `./logic` subpath these three imports are the only lines that
 * change.
 */

export {
  initialRoving,
  moveRoving,
  splitOverflow,
  type ToolbarItemSpec,
} from "../../../../packages/shell/src/toolbar/logic.js";

export {
  dismiss,
  hoverOpen,
  initial,
  step,
  type AppMenuItemSpec,
  type AppMenuSpec,
  type MenuBarAction,
  type MenuBarState,
} from "../../../../packages/shell/src/app-menu/logic.js";

export {
  statusToneOf,
  toneForeground,
  type StatusBarTone,
} from "../../../../packages/shell/src/status-bar/logic.js";
