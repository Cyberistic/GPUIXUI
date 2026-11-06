import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const WORKSPACE_TABS = ["explorer", "output", "problems"] as const;

export const WorkspaceTab = Schema.Literals(WORKSPACE_TABS);

export type WorkspaceTab = typeof WorkspaceTab.Type;

export class WorkspaceLayout extends Schema.Class<WorkspaceLayout>(
  "WorkspaceLayout",
)({
  sidebar: Schema.Int,
  document: Schema.Int,
  tab: WorkspaceTab,
  scroll: Schema.Int,
}) {}

export const WORKSPACE_SIDEBAR = 160;

export const WORKSPACE_DOCUMENT = {
  initial: 240,
  min: 180,
  max: 360,
  step: 40,
} as const;

export const WORKSPACE_DIVIDER = 6;

export const WORKSPACE_ROW_HEIGHT = 28;
export const WORKSPACE_ROWS = 30;

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

export const WORKSPACE_PANE = {
  a: "ws-pane-a",
  b: "ws-pane-b",
  divider: "ws-divider",
} as const;

export const CORRUPT_WORKSPACE = "not a workspace";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value)));

export const clampDocument = (width: number): number =>
  clamp(width, WORKSPACE_DOCUMENT.min, WORKSPACE_DOCUMENT.max);

export const stepDocument = (width: number, delta: number): number =>
  clampDocument(width + delta);

export const toggleSidebar = (width: number): number =>
  width > 0 ? 0 : WORKSPACE_SIDEBAR;

export const defaultWorkspace = (): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: WORKSPACE_SIDEBAR,
    document: WORKSPACE_DOCUMENT.initial,
    tab: "explorer",
    scroll: 0,
  });

export interface WorkspacePatch {
  readonly sidebar?: number;
  readonly document?: number;
  readonly tab?: WorkspaceTab;
  readonly scroll?: number;
}

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

export const clampWorkspace = (layout: WorkspaceLayout): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: clamp(layout.sidebar, 0, WORKSPACE_SIDEBAR),
    document: clampDocument(layout.document),
    tab: layout.tab,
    scroll: Math.max(0, Math.round(layout.scroll)),
  });

const WorkspaceJson = Schema.fromJsonString(WorkspaceLayout);

export const encodeWorkspace = Schema.encodeSync(WorkspaceJson);

export const decodeWorkspace = Schema.decodeUnknownOption(WorkspaceJson);

export interface RestoredWorkspace {
  readonly layout: WorkspaceLayout;
  readonly source: "stored" | "default";
}

export const restoreWorkspace = (stored: string): RestoredWorkspace =>
  Option.match(decodeWorkspace(stored), {
    onNone: () => ({ layout: defaultWorkspace(), source: "default" }),
    onSome: (layout) => ({
      layout: clampWorkspace(layout),
      source: "stored",
    }),
  });

export const clampedSample = (): WorkspaceLayout =>
  new WorkspaceLayout({
    sidebar: -5,
    document: 9999,
    tab: "explorer",
    scroll: -30,
  });

export const decodeTab = Schema.decodeUnknownOption(WorkspaceTab);

export const workspaceEquals = Schema.toEquivalence(WorkspaceLayout);
