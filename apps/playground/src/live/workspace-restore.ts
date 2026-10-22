/**
 * The workspace `workspace-restore` drives, and the persisted-layout rule a dock
 * owes.
 *
 * Tier 4's **persistent panel state** row is app-owned by definition — the
 * runtime publishes no storage — so what a window can prove is the other half:
 * a layout the app serialises, decodes and hands back paints the arrangement it
 * saved. The fixture keeps the boundary honest in one place: a stored string is
 * decoded with a schema, a layout is clamped to the pane bounds, and a string
 * that is not the layout falls back to the default.
 *
 * Kept native-free so the arithmetic is testable on a host with no binding, as
 * `table.ts` and `dock-focus.ts` are.
 */
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** The documents the workspace can show, in rail order. */
export const WORKSPACE_TABS = ["explorer", "output", "problems"] as const;
/** A workspace document. */
export const WorkspaceTab = Schema.Literals(WORKSPACE_TABS);
/** A workspace document. */
export type WorkspaceTab = typeof WorkspaceTab.Type;

/**
 * The arrangement an app persists.
 *
 * Every field is a number the app owns or a document it can name: the runtime
 * has no panel state of its own, so this is the whole of what a relaunch can be
 * given back.
 */
export class WorkspaceLayout extends Schema.Class<WorkspaceLayout>(
  "WorkspaceLayout",
)({
  sidebar: Schema.Int,
  document: Schema.Int,
  tab: WorkspaceTab,
  scroll: Schema.Int,
}) {}

/** The sidebar's open width; a collapsed one paints zero. */
export const WORKSPACE_SIDEBAR = 160;

/** The document pane's caller-owned width: its starting point and its bounds. */
export const WORKSPACE_DOCUMENT = {
  initial: 240,
  min: 180,
  max: 360,
  step: 40,
} as const;

/** The split divider's width, so the row arithmetic names it once. */
export const WORKSPACE_DIVIDER = 6;

/** The inspector's row height and count; enough content to scroll. */
export const WORKSPACE_ROW_HEIGHT = 28;
export const WORKSPACE_ROWS = 30;

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
export const WORKSPACE_IDS = {
  probe: "ws-probe",
  readout: "ws-readout",
  saved: "ws-saved",
  layout: "ws-layout",
  document: "ws-document",
  row: "ws-row",
  sidebar: "ws-sidebar",
  centre: "ws-centre",
  inspector: "ws-inspector",
  toggle: "ws-toggle-sidebar",
  wider: "ws-split-wider",
  narrower: "ws-split-narrower",
  save: "ws-save",
  restore: "ws-restore",
  corrupt: "ws-corrupt",
  clamp: "ws-clamp",
  tab: (tab: WorkspaceTab): string => `ws-tab-${tab}`,
} as const;

/** The split pane's painted boxes, named by the `SplitPane`'s id. */
export const WORKSPACE_PANE = {
  a: "ws-pane-a",
  b: "ws-pane-b",
  divider: "ws-divider",
} as const;

/** A string that is not a stored layout at all. */
export const CORRUPT_WORKSPACE = "not a workspace";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value)));

/** A document width inside the pane's bounds. */
export const clampDocument = (width: number): number =>
  clamp(width, WORKSPACE_DOCUMENT.min, WORKSPACE_DOCUMENT.max);

/** One control step of the document width, stopping at both bounds. */
export const stepDocument = (width: number, delta: number): number =>
  clampDocument(width + delta);

/** The sidebar width a toggle press asks for. */
export const toggleSidebar = (width: number): number =>
  width > 0 ? 0 : WORKSPACE_SIDEBAR;

/** The layout a workspace opens with. */
export const defaultWorkspace = (): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: WORKSPACE_SIDEBAR,
    document: WORKSPACE_DOCUMENT.initial,
    tab: "explorer",
    scroll: 0,
  });

/** The fields a control may change. */
export interface WorkspacePatch {
  readonly sidebar?: number;
  readonly document?: number;
  readonly tab?: WorkspaceTab;
  readonly scroll?: number;
}

/** One patch over a layout, so a control cannot build a half-written state. */
export const updateWorkspace = (
  layout: WorkspaceLayout,
  patch: WorkspacePatch,
): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: patch.sidebar ?? layout.sidebar,
    document: patch.document ?? layout.document,
    tab: patch.tab ?? layout.tab,
    scroll: patch.scroll ?? layout.scroll,
  });

/**
 * The layout a stored string is allowed to become.
 *
 * A stored width is a number some earlier session wrote, so it is clamped to
 * the bounds this window paints rather than trusted: a 9999px document would
 * otherwise leave the inspector off the frame. The scroll is a distance from the
 * top, never negative.
 */
export const clampWorkspace = (layout: WorkspaceLayout): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: clamp(layout.sidebar, 0, WORKSPACE_SIDEBAR),
    document: clampDocument(layout.document),
    tab: layout.tab,
    scroll: Math.max(0, Math.round(layout.scroll)),
  });

const WorkspaceJson = Schema.fromJsonString(WorkspaceLayout);

/** A layout as the string an app persists. */
export const encodeWorkspace = Schema.encodeSync(WorkspaceJson);

/** A stored string as a layout, or `None` when it is not one. */
export const decodeWorkspace = Schema.decodeUnknownOption(WorkspaceJson);

/** A stored workspace and where it came from. */
export interface RestoredWorkspace {
  readonly layout: WorkspaceLayout;
  readonly source: "stored" | "default";
}

/**
 * What a restore paints.
 *
 * A string that does not decode is not a crash and not a partial layout: the
 * window opens the default arrangement, and the source says so.
 */
export const restoreWorkspace = (stored: string): RestoredWorkspace =>
  Option.match(decodeWorkspace(stored), {
    onNone: () => ({ layout: defaultWorkspace(), source: "default" }),
    onSome: (layout) => ({
      layout: clampWorkspace(layout),
      source: "stored",
    }),
  });

/** A stored layout outside every bound, to measure the clamp on the way back. */
export const clampedSample = (): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: -5,
    document: 9999,
    tab: "explorer",
    scroll: -30,
  });

/** A tab `value` as a document, or `None` when a caller names another. */
export const decodeTab = Schema.decodeUnknownOption(WorkspaceTab);

/** The equality two layouts are compared with. */
export const workspaceEquals = Schema.toEquivalence(WorkspaceLayout);
