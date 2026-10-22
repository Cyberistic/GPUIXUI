/**
 * The drawer preview's model: where a surface sits, and which layer an Escape
 * closes.
 *
 * A drawer is the modal panel that owns the window's edge, so two decisions a
 * drawing cannot show are worth a test: the surface's box is the requested
 * size **clamped to the window** (a `lg` drawer in a narrow window is the
 * window), and dismissal is offered to the topmost layer only. A drawer that
 * cannot be dismissed consumes the gesture without closing anything, which is
 * why an Escape aimed at it does not also close the dialog underneath.
 *
 * The size tables mirror `packages/components/src/drawer.tsx`'s `WIDTH` and
 * `HEIGHT`; `drawer-preview.test.ts` reads the component and fails when the two
 * drift, so this file cannot become a second source of truth.
 */

/** The window edge a drawer opens from. */
export type DrawerSide = "left" | "right" | "bottom";

/** The surface sizes a drawer offers. */
export type DrawerSize = "sm" | "md" | "lg";

/** A window, in the pixels the runtime's `useWindowSize` reports. */
export interface WindowBox {
  readonly width: number;
  readonly height: number;
}

/** The surface's measured box, before it is anchored to an edge. */
export interface SurfaceBox {
  readonly width: number;
  readonly height: number;
}

/** The column widths a left or right drawer asks for. */
export const DRAWER_WIDTH: Readonly<Record<DrawerSize, number>> = {
  sm: 320,
  md: 400,
  lg: 560,
};

/** The sheet heights a bottom drawer asks for. */
export const DRAWER_HEIGHT: Readonly<Record<DrawerSize, number>> = {
  sm: 240,
  md: 320,
  lg: 420,
};

/**
 * The surface's box in a window.
 *
 * A column is the requested width and the window's whole height; a bottom
 * sheet is the window's whole width and the requested height. Either one is
 * capped by the window, so a `lg` drawer never paints past the edge a reader
 * would have to scroll to reach.
 */
export const drawerBox = (
  side: DrawerSide,
  size: DrawerSize,
  window: WindowBox,
): SurfaceBox =>
  side === "bottom"
    ? {
        width: window.width,
        height: Math.min(DRAWER_HEIGHT[size], window.height),
      }
    : {
        width: Math.min(DRAWER_WIDTH[size], window.width),
        height: window.height,
      };

/** One open overlay on the dismiss stack, deepest last. */
export interface DismissLayer {
  readonly name: string;
  /** Whether this layer's own Escape/outside press closes it. */
  readonly dismissible: boolean;
}

/** What one gesture did to the stack. */
export interface DismissResult {
  readonly layers: ReadonlyArray<DismissLayer>;
  /** The layer the gesture was offered to. `undefined` when the stack is empty. */
  readonly consumedBy?: string;
  /** The layer that actually closed. `undefined` when none did. */
  readonly closed?: string;
}

/**
 * Offer a dismiss gesture to the topmost layer.
 *
 * The topmost layer consumes the gesture whether or not it closes: a
 * non-dismissible drawer is exactly the "you cannot leave yet" state, so its
 * Escape must not travel on to the dialog beneath it. One gesture therefore
 * closes at most one surface.
 */
export const dismissTop = (
  layers: ReadonlyArray<DismissLayer>,
): DismissResult => {
  const top = layers[layers.length - 1];
  if (top === undefined) return { layers };
  return top.dismissible
    ? {
        layers: layers.slice(0, -1),
        consumedBy: top.name,
        closed: top.name,
      }
    : { layers, consumedBy: top.name };
};

/** An issue row in the filter workflow. */
export interface Issue {
  readonly id: string;
  readonly title: string;
  readonly status: "open" | "closed";
  readonly assigned: boolean;
  readonly attachment: boolean;
}

/** What the filter drawer is narrowed to. */
export interface IssueFilter {
  /** `open` keeps open issues; `all` keeps every issue. */
  readonly status: "open" | "all";
  readonly assignedOnly: boolean;
  readonly attachmentsOnly: boolean;
}

/** The filter a freshly opened drawer starts from: everything. */
export const initialFilter: IssueFilter = {
  status: "all",
  assignedOnly: false,
  attachmentsOnly: false,
};

/** Whether one issue survives the filter. The three rules compose. */
export const matchesFilter = (issue: Issue, filter: IssueFilter): boolean =>
  (filter.status === "all" || issue.status === "open") &&
  (!filter.assignedOnly || issue.assigned) &&
  (!filter.attachmentsOnly || issue.attachment);

/** The rows the filter keeps, in their original order. */
export const filterIssues = (
  issues: ReadonlyArray<Issue>,
  filter: IssueFilter,
): ReadonlyArray<Issue> =>
  issues.filter((issue) => matchesFilter(issue, filter));

/** How many rules the reader has switched on. */
export const activeFilterCount = (filter: IssueFilter): number =>
  (filter.status === "open" ? 1 : 0) +
  (filter.assignedOnly ? 1 : 0) +
  (filter.attachmentsOnly ? 1 : 0);

/** The line under the toolbar, in the component's own words. */
export const describeIssues = (shown: number, total: number): string =>
  `Showing ${shown} of ${total} issues`;
