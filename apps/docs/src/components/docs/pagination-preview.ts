export type PageItem =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "ellipsis" };

export interface WindowInput {
  readonly page: number;
  readonly pageCount: number;
  readonly siblingCount?: number;
  readonly showEdges?: boolean;
}

const pageItem = (page: number): PageItem => ({ kind: "page", page });

const ellipsis = (): PageItem => ({ kind: "ellipsis" });

const pages = (from: number, to: number): ReadonlyArray<PageItem> =>
  Array.from({ length: Math.max(0, Math.max(from, to) - from + 1) }, (_, i) =>
    pageItem(from + i),
  );

const between = (low: number, high: number): ReadonlyArray<PageItem> => {
  const hidden = high - low - 1;
  if (hidden <= 0) return [];
  if (hidden === 1) return [pageItem(low + 1)];
  return [ellipsis()];
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

export const pageWindow = ({
  page: rawPage,
  pageCount: rawPageCount,
  siblingCount = 1,
  showEdges = true,
}: WindowInput): ReadonlyArray<PageItem> => {
  const pageCount = Math.max(0, Math.trunc(rawPageCount));
  if (pageCount === 0) return [];

  const current = clamp(Math.trunc(rawPage), 1, pageCount);
  const siblings = Math.max(0, Math.trunc(siblingCount));
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, pageCount);

  if (!showEdges) return pages(left, right);
  if (siblings + 5 >= pageCount) return pages(1, pageCount);

  const showStart = left > 2;
  const showEnd = right < pageCount - 2;

  if (showStart && showEnd) {
    return [
      pageItem(1),
      ...between(1, left),
      ...pages(left, right),
      ...between(right, pageCount),
      pageItem(pageCount),
    ];
  }
  if (showStart) {
    const from = Math.max(pageCount - (2 + 2 * siblings), 2);
    return [pageItem(1), ...between(1, from), ...pages(from, pageCount)];
  }
  const to = Math.min(3 + 2 * siblings, pageCount - 2);
  return [...pages(1, to), ...between(to, pageCount), pageItem(pageCount)];
};

export const clampPage = (page: number, pageCount: number): number =>
  pageCount <= 0 ? 1 : clamp(Math.trunc(page), 1, pageCount);

export const stepPage = (
  page: number,
  pageCount: number,
  delta: 1 | -1,
): number => clampPage(clampPage(page, pageCount) + delta, pageCount);

export interface Deployment {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly age: string;
  readonly status: "passed" | "failed" | "running";
}

const SERVICES = [
  "web-api",
  "billing",
  "search-index",
  "auth",
  "media",
  "notifications",
  "exports",
] as const;

const ENVIRONMENTS = ["production", "staging"] as const;

const AGES = ["2 min", "18 min", "1 hr", "3 hr", "yesterday"] as const;

const STATUSES: ReadonlyArray<Deployment["status"]> = [
  "passed",
  "passed",
  "running",
  "passed",
  "failed",
] as const;

export const DEPLOYMENTS: ReadonlyArray<Deployment> = Array.from(
  { length: 23 },
  (_, index) => ({
    id: `deploy-${index + 1}`,
    service: SERVICES[index % SERVICES.length] ?? "web-api",
    environment:
      ENVIRONMENTS[Math.floor(index / SERVICES.length) % ENVIRONMENTS.length] ??
      "production",
    age: AGES[index % AGES.length] ?? "2 min",
    status: STATUSES[index % STATUSES.length] ?? "passed",
  }),
);

export const PAGE_SIZE = 5;

export const pageCountFor = (rows: ReadonlyArray<unknown>): number =>
  Math.ceil(rows.length / PAGE_SIZE);

export const rowsOn = (
  rows: ReadonlyArray<Deployment>,
  page: number,
  pageSize = PAGE_SIZE,
): ReadonlyArray<Deployment> => {
  const current = clampPage(page, pageCountFor(rows));
  const from = (current - 1) * pageSize;
  return rows.slice(from, from + pageSize);
};

export const rangeLabel = (
  rows: ReadonlyArray<unknown>,
  page: number,
  pageSize = PAGE_SIZE,
): string => {
  const total = rows.length;
  if (total === 0) return "No rows";
  const current = clampPage(page, pageCountFor(rows));
  const first = (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, total);
  return `Rows ${first}–${last} of ${total}`;
};
