export const deploymentStatuses = [
  "passed",
  "failed",
  "running",
  "queued",
  "stale",
] as const;

export type DeploymentStatus = (typeof deploymentStatuses)[number];

export const badgeVariants = [
  "neutral",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "outline",
] as const;

export type BadgeVariant = (typeof badgeVariants)[number];

export const badgeSizes = ["sm", "md"] as const;

export type BadgeSize = (typeof badgeSizes)[number];

const variantFor: Readonly<Record<DeploymentStatus, BadgeVariant>> = {
  passed: "success",
  failed: "danger",
  running: "info",
  queued: "neutral",
  stale: "warning",
};

export const badgeVariantFor = (status: DeploymentStatus): BadgeVariant =>
  variantFor[status];

const wordFor: Readonly<Record<DeploymentStatus, string>> = {
  passed: "Passed",
  failed: "Failed",
  running: "Running",
  queued: "Queued",
  stale: "Stale",
};

export const statusText = (status: DeploymentStatus): string => wordFor[status];

export interface Deployment {
  readonly id: string;
  readonly name: string;
  readonly branch: string;
  readonly status: DeploymentStatus;
  readonly when: string;
}

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

export type DeploymentFilter = "all" | DeploymentStatus;

export const visibleDeployments = (
  deployments: ReadonlyArray<Deployment>,
  filter: DeploymentFilter,
): ReadonlyArray<Deployment> =>
  filter === "all"
    ? deployments
    : deployments.filter((deployment) => deployment.status === filter);

export const statusCounts = (
  deployments: ReadonlyArray<Deployment>,
): Record<DeploymentStatus, number> => ({
  passed: deployments.filter((row) => row.status === "passed").length,
  failed: deployments.filter((row) => row.status === "failed").length,
  running: deployments.filter((row) => row.status === "running").length,
  queued: deployments.filter((row) => row.status === "queued").length,
  stale: deployments.filter((row) => row.status === "stale").length,
});

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

export const deploymentFilters: ReadonlyArray<DeploymentFilter> = [
  "all",
  "failed",
  "running",
];

export type PressTarget = "row" | "none";

export type PressSurface = "status-pill" | "row" | "eager-pill";

export const pressTarget = (landedOn: PressSurface): PressTarget =>
  landedOn === "eager-pill" ? "none" : "row";
