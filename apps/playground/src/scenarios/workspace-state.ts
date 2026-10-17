/**
 * The persisted half of the `workspace-restore` probe.
 *
 * GPUix has no storage primitive, so a workspace is serialised by the **app**
 * (`Effect` `FileSystem`/`Config` in a real app) and decoded at the boundary.
 * Keeping the shape here, away from the view, makes the round trip testable on
 * any host and gives `@gpuixui/docking` a contract to copy.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/**
 * Everything a two-pane workspace needs to come back after a restart: the
 * split width, the two tab lists, the active tab and where the virtual list was
 * scrolled to. `anchorOffset` is the in-row pixel offset GPUix reports as the
 * second element of `getListScrollTop`'s anchor.
 */
export class WorkspaceState extends Schema.Class<WorkspaceState>(
  "WorkspaceState",
)({
  split: Schema.Number,
  tabsA: Schema.Array(Schema.String),
  tabsB: Schema.Array(Schema.String),
  active: Schema.String,
  anchorIndex: Schema.Number,
  anchorOffset: Schema.Number,
}) {}

/** The persistence boundary: a workspace snapshot as a JSON string. */
export const WorkspaceStateJson = Schema.fromJsonString(WorkspaceState);

/** The workspace a reset returns to. */
export const DEFAULT_WORKSPACE: WorkspaceState = new WorkspaceState({
  split: 320,
  tabsA: ["one", "two"],
  tabsB: [],
  active: "one",
  anchorIndex: 0,
  anchorOffset: 0,
});

/** A virtual list's `[itemIndex, offsetInItemPx, viewportHeightPx]` anchor. */
export type RuntimeAnchor = readonly [number, number, number];

/** `state` plus the anchor the runtime reported for its list. */
export const snapshotWorkspace = (
  state: WorkspaceState,
  anchor: RuntimeAnchor,
): WorkspaceState =>
  new WorkspaceState({
    split: state.split,
    tabsA: state.tabsA,
    tabsB: state.tabsB,
    active: state.active,
    anchorIndex: anchor[0],
    anchorOffset: anchor[1],
  });

/** A pane's tabs as one token: `one,two`, or `none` when empty. */
const pane = (tabs: ReadonlyArray<string>): string =>
  Arr.match(tabs, {
    onEmpty: () => "none",
    onNonEmpty: (values) => Arr.join(values, ","),
  });

/** The human-readable summary both workspace probes print. */
export const describeWorkspace = (state: WorkspaceState): string =>
  `split=${state.split} tabsA=${pane(state.tabsA)} tabsB=${pane(
    state.tabsB,
  )} active=${state.active}`;

/** A snapshot as JSON, ready to be written by the app boundary. */
export const encodeWorkspace = Schema.encodeSync(WorkspaceStateJson);

/** Saved JSON back to a workspace, or `None` when it is not a valid snapshot. */
export const decodeWorkspace = (json: string): Option.Option<WorkspaceState> =>
  Schema.decodeUnknownOption(WorkspaceStateJson)(json);
