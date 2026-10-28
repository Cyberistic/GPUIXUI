/**
 * The drawer preview's model: which edges a surface can take, and which layer an
 * Escape closes.
 *
 * The geometry a drawing cannot show is the surface's box: the requested size
 * **clamped to the window** (a `lg` drawer in a narrow window is the window).
 * That lives in `demos.css` now, where the frame is the window; the model keeps
 * the edges and the dismiss stack. A drawer that cannot be dismissed consumes
 * the gesture without closing anything, which is why an Escape aimed at it does
 * not also close the dialog underneath.
 */

/** The window edge a drawer opens from. */
export type DrawerSide = "left" | "right" | "bottom" | "top";

/** The surface sizes a drawer offers. */
export type DrawerSize = "sm" | "md" | "lg";

/**
 * Whether an edge lays the surface across the window's width rather than down
 * its height — the component's own `isVertical`, so a drawing cannot treat a
 * `top` sheet as a column.
 */
export const isVertical = (side: DrawerSide): boolean =>
  side === "bottom" || side === "top";

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
