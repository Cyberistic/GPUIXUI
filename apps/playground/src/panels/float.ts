/**
 * In-window floating panels: what a torn-off docking tab becomes.
 *
 * GPUix 0.10.0 exposes one application window (`render` + `WindowOptions`, no
 * `openWindow`), so a detached tab cannot be an OS window. The honest
 * alternative is an absolutely positioned panel inside the app surface; plan
 * `194` measures that path in the runtime.
 *
 * The model is pure and **app-local**: a float's `x`/`y` are relative to the
 * app surface, never window coordinates, so rendering is `left`/`top` and the
 * clamp needs only the surface's size. The scenario converts pointer
 * coordinates at its own boundary.
 *
 * A window is a group that left the dock: it owns its tabs and its active tab,
 * exactly like `DockGroup`, so docking it back is the same `insertTab` rule.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  DockNodeSchema,
  DockTabSchema,
  findGroup,
  findTabGroup,
  insertTab,
  removeTab,
  type DockNode,
  type DockTab,
} from "./dock.js";

/** A floating panel's fixed size in this probe. */
export const FLOAT_WIDTH = 260;
export const FLOAT_HEIGHT = 160;

/** A floating window: a group of tabs outside the dock, with a position. */
export interface FloatWindow {
  readonly id: string;
  readonly title: string;
  readonly tabs: ReadonlyArray<DockTab>;
  readonly active: string;
  /** App-local top-left, not window coordinates. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const FloatSchema: Schema.Codec<FloatWindow> = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  tabs: Schema.Array(DockTabSchema),
  active: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});

/** The restore payload: the dock plus the one open float, if any. */
const WorkspaceSchema = Schema.Struct({
  dock: DockNodeSchema,
  float: Schema.NullOr(FloatSchema),
});

const WorkspaceJson = Schema.fromJsonString(WorkspaceSchema);

/** A surface's extent in app-local coordinates. */
export interface Extent {
  readonly width: number;
  readonly height: number;
}

/** An app-local point. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

const clampAxis = (value: number, extent: number, total: number): number =>
  Math.min(Math.max(value, 0), Math.max(total - extent, 0));

/** Keeps the whole window inside the app surface; never resizes. */
export const clampFloat = (app: Extent, float: FloatWindow): FloatWindow => ({
  ...float,
  x: clampAxis(float.x, float.width, app.width),
  y: clampAxis(float.y, float.height, app.height),
});

const newFloat = (tab: DockTab, point: Point, app: Extent): FloatWindow =>
  clampFloat(app, {
    id: "float-1",
    title: "Floating panel",
    tabs: [tab],
    active: tab.id,
    x: point.x,
    y: point.y,
    width: FLOAT_WIDTH,
    height: FLOAT_HEIGHT,
  });

/** The tab in the dock, if it is there at all. */
const findTab = (dock: DockNode, tabId: string): Option.Option<DockTab> =>
  Option.flatMap(findTabGroup(dock, tabId), (group) =>
    Arr.findFirst(group.tabs, (candidate) => candidate.id === tabId),
  );

/**
 * Removes a tab from the dock and puts it in a float at `point`.
 *
 * With a float already open the tab is appended to it and the window stays put;
 * a window that jumps to the pointer every time a second tab is torn off would
 * lose the one on screen. An unknown tab is `None` and changes nothing.
 */
export const tearOff = (
  dock: DockNode,
  float: Option.Option<FloatWindow>,
  tabId: string,
  point: Point,
  app: Extent,
): Option.Option<{ readonly dock: DockNode; readonly float: FloatWindow }> =>
  Option.map(findTab(dock, tabId), (tab) => ({
    dock: removeTab(dock, tabId),
    float: Option.match(float, {
      onNone: () => newFloat(tab, point, app),
      onSome: (current) => ({
        ...current,
        tabs: Arr.append(current.tabs, tab),
        active: tab.id,
      }),
    }),
  }));

/**
 * Docks a float's **active** tab into `target`, leaving the window open for the
 * tabs that remain and pruning it once it is empty.
 *
 * A missing target group changes nothing: `insertTab` ignores it, and the float
 * is returned untouched so the caller never loses a tab.
 */
export const dockFloat = (
  dock: DockNode,
  float: FloatWindow,
  target: string,
): { readonly dock: DockNode; readonly float: Option.Option<FloatWindow> } =>
  Option.match(findGroup(dock, target), {
    onNone: () => ({ dock, float: Option.some(float) }),
    onSome: () =>
      Option.match(
        Arr.findFirst(float.tabs, (candidate) => candidate.id === float.active),
        {
          onNone: () => ({ dock, float: Option.some(float) }),
          onSome: (tab) => {
            const remaining = Arr.filter(
              float.tabs,
              (candidate) => candidate.id !== tab.id,
            );
            return {
              dock: insertTab(dock, target, tab),
              float: Arr.match(remaining, {
                onEmpty: () => Option.none(),
                onNonEmpty: (tabs) =>
                  Option.some({
                    ...float,
                    tabs,
                    active: Option.getOrElse(
                      Option.map(Arr.head(tabs), (first) => first.id),
                      () => "",
                    ),
                  }),
              }),
            };
          },
        },
      ),
  });

/** The float and the dock as JSON, ready for an app-owned store. */
export const encodeWorkspace = (
  dock: DockNode,
  float: Option.Option<FloatWindow>,
): string =>
  Schema.encodeSync(WorkspaceJson)({
    dock,
    float: Option.getOrNull(float),
  });

/** Saved JSON back to a workspace, or `None` when it is not a valid snapshot. */
export const decodeWorkspace = (
  json: string,
): Option.Option<{
  readonly dock: DockNode;
  readonly float: Option.Option<FloatWindow>;
}> =>
  Option.map(Schema.decodeUnknownOption(WorkspaceJson)(json), (value) => ({
    dock: value.dock,
    float: Option.fromNullishOr(value.float),
  }));
