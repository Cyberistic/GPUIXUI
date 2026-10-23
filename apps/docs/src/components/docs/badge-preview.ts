/**
 * The badge preview's model: the status vocabulary, the panel's filter and the
 * press route the pill leaves to its row.
 *
 * The shipped badge is a GPUix host tree and the preview cannot mount it, so
 * the rules that can be wrong live here and `badge-preview.test.ts` holds them
 * to the component's own source and recipe. A badge paints one fill and takes
 * no pointer of its own: a press that lands on a status pill belongs to the row
 * it sits in, which is the route the live `list-row-press` probe measured.
 */

/** The deployment states the panel draws, in the order it reads them. */
export const deploymentStatuses = [
  "passed",
  "failed",
  "running",
  "queued",
  "stale",
] as const;

/** A deployment's state. */
export type DeploymentStatus = (typeof deploymentStatuses)[number];

/** The badge's colour families, in the component's own order. */
export const badgeVariants = [
  "neutral",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "outline",
] as const;

/** A badge's colour family. */
export type BadgeVariant = (typeof badgeVariants)[number];

/** The two pill sizes. */
export const badgeSizes = ["sm", "md"] as const;

/** A pill size. */
export type BadgeSize = (typeof badgeSizes)[number];

/**
 * The variant a state wears.
 *
 * `outline` is deliberately absent: it is the variant for a label that names
 * something (a branch, a version), not a state, so a status can never be drawn
 * with the one variant that has no fill to carry it.
 */
const variantFor: Readonly<Record<DeploymentStatus, BadgeVariant>> = {
  passed: "success",
  failed: "danger",
  running: "info",
  queued: "neutral",
  stale: "warning",
};

/** The variant a deployment state paints. */
export const badgeVariantFor = (status: DeploymentStatus): BadgeVariant =>
  variantFor[status];

/** The word a state is announced as, because the tint is never the only signal. */
const wordFor: Readonly<Record<DeploymentStatus, string>> = {
  passed: "Passed",
  failed: "Failed",
  running: "Running",
  queued: "Queued",
  stale: "Stale",
};

/** The word a state is printed and announced as. */
export const statusText = (status: DeploymentStatus): string => wordFor[status];

/** One deployment on the panel. */
export interface Deployment {
  readonly id: string;
  readonly name: string;
  readonly branch: string;
  readonly status: DeploymentStatus;
  readonly when: string;
}

/** What the panel opens with: every state, and a second failure to filter on. */
export const initialDeployments: ReadonlyArray<Deployment> = [
  {
    id: "api",
    name: "api-1.4.2",
    branch: "release/1.4",
    status: "passed",
    when: "4 min ago",
  },
  {
    id: "web",
    name: "web-2.0.0",
    branch: "main",
    status: "failed",
    when: "18 min ago",
  },
  {
    id: "search",
    name: "search-index",
    branch: "main",
    status: "running",
    when: "in progress",
  },
  {
    id: "docs",
    name: "docs",
    branch: "main",
    status: "queued",
    when: "waiting for a runner",
  },
  {
    id: "mobile",
    name: "mobile-0.9.3",
    branch: "release/0.9",
    status: "stale",
    when: "2 days ago",
  },
  {
    id: "billing",
    name: "billing-1.1.0",
    branch: "main",
    status: "failed",
    when: "1 hour ago",
  },
];

/** What the panel filters by: every row, or one state. */
export type DeploymentFilter = "all" | DeploymentStatus;

/**
 * The rows a filter shows.
 *
 * A filter is a view over the same list: it never copies a deployment, and
 * `all` returns the list it was handed.
 */
export const visibleDeployments = (
  deployments: ReadonlyArray<Deployment>,
  filter: DeploymentFilter,
): ReadonlyArray<Deployment> =>
  filter === "all"
    ? deployments
    : deployments.filter((deployment) => deployment.status === filter);

/** How many deployments are in each state. */
export const statusCounts = (
  deployments: ReadonlyArray<Deployment>,
): Record<DeploymentStatus, number> => ({
  passed: deployments.filter((row) => row.status === "passed").length,
  failed: deployments.filter((row) => row.status === "failed").length,
  running: deployments.filter((row) => row.status === "running").length,
  queued: deployments.filter((row) => row.status === "queued").length,
  stale: deployments.filter((row) => row.status === "stale").length,
});

/** A sentence for the panel: the size, then the states somebody is in. */
export const describeDeployments = (
  deployments: ReadonlyArray<Deployment>,
): string => {
  const counts = statusCounts(deployments);
  const shown = deploymentStatuses
    .filter((status) => counts[status] > 0)
    .map((status) => `${counts[status]} ${status}`);
  return `${deployments.length} deployments · ${
    shown.length === 0 ? "nothing deployed" : shown.join(", ")
  }`;
};

/** The two filters the panel offers, in the order it prints them. */
export const deploymentFilters: ReadonlyArray<DeploymentFilter> = [
  "all",
  "failed",
  "running",
];

/** What a press on a pill, a row or an eager pill reaches. */
export type PressTarget = "row" | "none";

/** Where the pointer landed. */
export type PressSurface = "status-pill" | "row" | "eager-pill";

/**
 * The handler a press runs.
 *
 * A status pill is out of the pointer (`pointerEvents: "none"`), because a
 * filled child is the boundary the runtime's hit test stops counting at: the
 * press reaches the row instead, which is `selected=badge` in the live probe.
 * The same pill with a caller's `style` handing the pointer back is a hit
 * target of its own and the row hears nothing (`selected=none`).
 */
export const pressTarget = (landedOn: PressSurface): PressTarget =>
  landedOn === "eager-pill" ? "none" : "row";
