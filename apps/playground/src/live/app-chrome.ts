import type {
  AppMenuEntry,
  StatusBarItem,
  ToolbarAction,
} from "@gpuixui/shell";
import * as Option from "effect/Option";

export const APP_CHROME_IDS = {
  probe: "app-chrome-probe",
  readout: "app-chrome-readout",
  menuBar: "app-chrome-menu-bar",
  toolbar: "app-chrome-toolbar",
  status: "app-chrome-status",
} as const;

export const APP_CHROME_MENU_LABEL = "Workspace";

export const APP_CHROME_TOOLBAR_LABEL = "Document";

export const APP_CHROME_STATUS_LABEL = "Editor status";

export const APP_CHROME_PLATFORM = "linux" as const;

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

export const APP_CHROME_TOOLBAR_MAX = 4;

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

export const APP_CHROME_CHECKS = 47;

export const APP_CHROME_OVERFLOW: ReadonlyArray<string> = [
  "link",
  "image",
  "code",
];

export const APP_CHROME_STATUS_LEFT: ReadonlyArray<StatusBarItem> = [
  { id: "branch", label: "main" },
  { id: "position", label: "Ln 12, Col 4" },
];

export const APP_CHROME_STATUS_RIGHT: ReadonlyArray<StatusBarItem> = [
  { id: "encoding", label: "UTF-8" },
  { id: "errors", label: "3 errors", tone: "destructive" },
  { id: "lint", label: "Lint passed", tone: "success" },
];

export const triggerId = (menu: string): string => `app-menu-trigger-${menu}`;

export const itemId = (item: string): string => `app-menu-item-${item}`;

export const actionId = (action: string): string => `toolbar-action-${action}`;

export const OVERFLOW_ID = "toolbar-overflow";

export const overflowItemId = (action: string): string =>
  `toolbar-overflow-item-${action}`;

export interface AppChromeState {
  readonly menu: string;

  readonly action: string;

  readonly menuReports: number;

  readonly actionReports: number;
}

export const appChromeReadout = (state: AppChromeState): string =>
  `menu=${state.menu} action=${state.action} menuReports=${state.menuReports} actionReports=${state.actionReports}`;

export const fieldOf = (
  readout: string,
  field: "menu" | "action",
): Option.Option<string> =>
  Option.fromNullishOr(
    new RegExp(`(?:^|\\s)${field}=(\\S+)`).exec(readout)?.[1],
  );

export const counterOf = (
  readout: string,
  field: "menuReports" | "actionReports",
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(new RegExp(`\\b${field}=(\\d+)`).exec(readout)?.[1]),
    Number,
  );

export interface Point {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const TONE_TOLERANCE = 8;

export const inkDistance = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): number => Math.hypot(r - ink.r, g - ink.g, b - ink.b);
