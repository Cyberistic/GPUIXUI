import * as Arr from "effect/Array";
import { targetSize, type Theme } from "@gpuixui/tokens";

export const BREADCRUMB_LEVELS = [
  "Library",
  "Design system",
  "Components",
  "Overlays",
  "Dialog",
] as const;

export type BreadcrumbLevel = (typeof BREADCRUMB_LEVELS)[number];

export const BREADCRUMB_START = BREADCRUMB_LEVELS.length - 1;

export const levelAt = (index: number): BreadcrumbLevel =>
  BREADCRUMB_LEVELS[index] ?? BREADCRUMB_LEVELS[0];

export const BREADCRUMB_WIDTHS = { wide: 560, narrow: 280 } as const;

export type BreadcrumbPane = keyof typeof BREADCRUMB_WIDTHS;

export const BREADCRUMB_ENTRY_WIDTH = 112;

export const budgetFor = (width: number): number => {
  if (Number.isNaN(width)) return 3;
  if (!Number.isFinite(width)) return BREADCRUMB_LEVELS.length;
  return Math.max(
    3,
    Math.min(
      BREADCRUMB_LEVELS.length,
      Math.floor(width / BREADCRUMB_ENTRY_WIDTH),
    ),
  );
};

export interface TrailView {
  readonly visible: ReadonlyArray<number>;

  readonly hidden: ReadonlyArray<number>;
}

const indicesBetween = (from: number, to: number): ReadonlyArray<number> =>
  Arr.filter(Arr.range(0, to), (index) => index >= from);

export const trailView = (page: number, budget: number): TrailView => {
  const fits = page + 1 <= budget;
  const visible = fits
    ? indicesBetween(0, page)
    : Arr.prepend(indicesBetween(page - budget + 3, page), 0);
  const afterRoot = visible[1] ?? page + 1;
  return { visible, hidden: indicesBetween(1, afterRoot - 1) };
};

export const BREADCRUMB_IDS = {
  probe: "breadcrumb-probe",
  pane: "breadcrumb-pane",
  readout: "breadcrumb-readout",
  wide: "breadcrumb-pane-wide",
  narrow: "breadcrumb-pane-narrow",
  after: "breadcrumb-after",
  referenceList: "breadcrumb-reference-list",
  appList: "breadcrumb-app-list",
  more: "breadcrumb-more",
  menu: "breadcrumb-hidden-menu",

  appCrumb: (index: number): string => `breadcrumb-app-${index}`,

  referenceCrumb: (index: number): string => `breadcrumb-reference-${index}`,

  hiddenRow: (index: number): string => `breadcrumb-hidden-${index}`,
} as const;

export const BREADCRUMB_FRAMES = {
  wide: "breadcrumb-wide",
  narrow: "breadcrumb-narrow",
  menu: "breadcrumb-narrow-menu",
} as const;

export const breadcrumbReadout = (
  width: number,
  page: number,
  selected: string,
): string =>
  `w=${Math.round(width)} budget=${budgetFor(width)} page=${levelAt(page)} selected=${selected}`;

export const ellipsisPaint = (theme: Theme): string =>
  theme.colors.mutedForeground;

export const panePaint = (theme: Theme): string => theme.colors.card;

export const pagePaint = (theme: Theme): string => theme.colors.background;

export const BREADCRUMB_TARGET = targetSize.minimum;

export const BREADCRUMB_CHECKS = 48;
