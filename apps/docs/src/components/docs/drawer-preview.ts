export type DrawerSide = "left" | "right" | "bottom" | "top";

export type DrawerSize = "sm" | "md" | "lg";

export const isVertical = (side: DrawerSide): boolean =>
  side === "bottom" || side === "top";

export interface DismissLayer {
  readonly name: string;

  readonly dismissible: boolean;
}

export interface DismissResult {
  readonly layers: ReadonlyArray<DismissLayer>;

  readonly consumedBy?: string;

  readonly closed?: string;
}

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

export interface Issue {
  readonly id: string;
  readonly title: string;
  readonly status: "open" | "closed";
  readonly assigned: boolean;
  readonly attachment: boolean;
}

export interface IssueFilter {
  readonly status: "open" | "all";
  readonly assignedOnly: boolean;
  readonly attachmentsOnly: boolean;
}

export const initialFilter: IssueFilter = {
  status: "all",
  assignedOnly: false,
  attachmentsOnly: false,
};

export const matchesFilter = (issue: Issue, filter: IssueFilter): boolean =>
  (filter.status === "all" || issue.status === "open") &&
  (!filter.assignedOnly || issue.assigned) &&
  (!filter.attachmentsOnly || issue.attachment);

export const filterIssues = (
  issues: ReadonlyArray<Issue>,
  filter: IssueFilter,
): ReadonlyArray<Issue> =>
  issues.filter((issue) => matchesFilter(issue, filter));

export const activeFilterCount = (filter: IssueFilter): number =>
  (filter.status === "open" ? 1 : 0) +
  (filter.assignedOnly ? 1 : 0) +
  (filter.attachmentsOnly ? 1 : 0);

export const describeIssues = (shown: number, total: number): string =>
  `Showing ${shown} of ${total} issues`;
