/**
 * The `app-chrome-lifecycle` fixture: the application chrome a window mounts —
 * a menu bar, a toolbar and a status bar — and the readout the probe prints.
 *
 * The three parts shipped in `@gpuixui/shell` with pure navigation suites only:
 * no renderer has ever mounted them, so a menubar that opens nothing, a toolbar
 * whose roving stop does not move the native focus, or a status tone that paints
 * the wrong role would have passed every test. The window facts are the ones a
 * pure rule cannot state: a dropdown child below its trigger, native focus on
 * the element a roving move names, and a tone's ink inside the trailing group's
 * own pixels.
 *
 * The menu and toolbar action lists are the example's, narrowed to what the
 * probe drives: a disabled row and a disabled menu on the bar, and a toolbar
 * whose `max` overflows its tail.
 */
import type {
  AppMenuEntry,
  StatusBarItem,
  ToolbarAction,
} from "@gpuixui/shell";
import * as Option from "effect/Option";

/** The `testId`s the probe owns; the parts derive their own from the ids below. */
export const APP_CHROME_IDS = {
  probe: "app-chrome-probe",
  readout: "app-chrome-readout",
  menuBar: "app-chrome-menu-bar",
  toolbar: "app-chrome-toolbar",
  status: "app-chrome-status",
} as const;

/** The menu bar's accessible name. */
export const APP_CHROME_MENU_LABEL = "Workspace";

/** The toolbar's accessible name. */
export const APP_CHROME_TOOLBAR_LABEL = "Document";

/** The status bar's accessible name. */
export const APP_CHROME_STATUS_LABEL = "Editor status";

/** The platform the accelerators are painted for, so the keycaps are ASCII. */
export const APP_CHROME_PLATFORM = "linux" as const;

/**
 * The three menus.
 *
 * `open` is disabled inside File so a Down skips it, and the whole Help menu is
 * disabled so a Right wraps past it — the two skips a pure suite can state but
 * only a key delivered in a window can prove.
 */
export const APP_CHROME_MENUS: ReadonlyArray<AppMenuEntry> = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "new", label: "New", accelerator: "mod+n" },
      { id: "open", label: "Open", accelerator: "mod+o", disabled: true },
      { id: "save", label: "Save", accelerator: "mod+s" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      { id: "undo", label: "Undo", accelerator: "mod+z" },
      { id: "redo", label: "Redo", accelerator: "mod+shift+z" },
    ],
  },
  {
    id: "help",
    label: "Help",
    disabled: true,
    items: [{ id: "about", label: "About" }],
  },
];

/** The visible tail the toolbar's `max` leaves in the strip. */
export const APP_CHROME_TOOLBAR_MAX = 4;

/**
 * Six actions, one disabled and three groups: `max: 4` keeps `open`, the
 * disabled `save` and `copy`, then overflows `link`, `image` and `code`.
 */
export const APP_CHROME_ACTIONS: ReadonlyArray<ToolbarAction> = [
  { id: "open", label: "Open", icon: "file", group: "file" },
  {
    id: "save",
    label: "Save",
    icon: "download",
    group: "file",
    disabled: true,
  },
  { id: "copy", label: "Copy", icon: "copy", group: "edit" },
  { id: "link", label: "Link", icon: "link", group: "edit" },
  { id: "image", label: "Image", icon: "image", group: "insert" },
  { id: "code", label: "Code", icon: "code", group: "insert" },
];

/** The checks a green run asserts, measured on 0.11.0. */
export const APP_CHROME_CHECKS = 47;

/** The actions the overflow menu holds, in menu order. */
export const APP_CHROME_OVERFLOW: ReadonlyArray<string> = [
  "link",
  "image",
  "code",
];

/** The status bar's two groups; the trailing one carries both tone roles. */
export const APP_CHROME_STATUS_LEFT: ReadonlyArray<StatusBarItem> = [
  { id: "branch", label: "main" },
  { id: "position", label: "Ln 12, Col 4" },
];

/** The trailing group: a plain item, a destructive count and a success note. */
export const APP_CHROME_STATUS_RIGHT: ReadonlyArray<StatusBarItem> = [
  { id: "encoding", label: "UTF-8" },
  { id: "errors", label: "3 errors", tone: "destructive" },
  { id: "lint", label: "Lint passed", tone: "success" },
];

/** The `testId` the shipped `AppMenu` gives one of its triggers. */
export const triggerId = (menu: string): string => `app-menu-trigger-${menu}`;

/** The `testId` the shipped `AppMenu` gives one dropdown row. */
export const itemId = (item: string): string => `app-menu-item-${item}`;

/** The `testId` the shipped `Toolbar` gives one action. */
export const actionId = (action: string): string => `toolbar-action-${action}`;

/** The `testId` of the shipped `Toolbar`'s overflow trigger. */
export const OVERFLOW_ID = "toolbar-overflow";

/** The `testId` the shipped `Toolbar` gives one overflow row. */
export const overflowItemId = (action: string): string =>
  `toolbar-overflow-item-${action}`;

/** What the probe's readout prints: the two selections and their counts. */
export interface AppChromeState {
  /** The last menu item the caller's `onSelect` heard, `menu/item`. */
  readonly menu: string;
  /** The last toolbar action the caller's `onAction` heard. */
  readonly action: string;
  /** How many times `onSelect` ran. */
  readonly menuReports: number;
  /** How many times `onAction` ran. */
  readonly actionReports: number;
}

/** The readout: both selections, then the two counters. */
export const appChromeReadout = (state: AppChromeState): string =>
  `menu=${state.menu} action=${state.action} menuReports=${state.menuReports} actionReports=${state.actionReports}`;

/** The value of `field` in a readout, or `None` when the field is absent. */
export const fieldOf = (
  readout: string,
  field: "menu" | "action",
): Option.Option<string> =>
  Option.fromNullishOr(
    new RegExp(`(?:^|\\s)${field}=(\\S+)`).exec(readout)?.[1],
  );

/** The counter `field` names in a readout, or `None` when it is absent. */
export const counterOf = (
  readout: string,
  field: "menuReports" | "actionReports",
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(new RegExp(`\\b${field}=(\\d+)`).exec(readout)?.[1]),
    Number,
  );

/** The pixels a frame's point is read at, from a logical box and the scale. */
export interface Point {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * How far a pixel may be from a role's own colour and still count as its ink.
 *
 * Small on purpose: the dark palette's label ink (`#EEF1F5`), its success role
 * (`#D3F9E2`) and its destructive role (`#FFE0E0`) are all pale, and the nearest
 * pair is 32 apart in RGB — so a tolerance of 8 reads the role's own antialiased
 * stem and none of the label beside it. The unit suite holds that separation.
 */
export const TONE_TOLERANCE = 8;

/** The RGB distance between a pixel and an ink. */
export const inkDistance = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): number => Math.hypot(r - ink.r, g - ink.g, b - ink.b);
