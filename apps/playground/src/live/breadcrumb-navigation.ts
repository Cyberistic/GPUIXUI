/**
 * The `breadcrumb-navigation-lifecycle` probe's fixture: a five-level trail in a
 * pane that narrows, and the two answers a trail can give a budget.
 *
 * Tier 4's **Breadcrumb navigation** row was `?`: a trail is composition, but
 * nothing had measured what the composition has to decide in a real window. The
 * shipped `Breadcrumb` renders its list with `flex-wrap`, so a trail wider than
 * the pane it sits in **wraps** instead of clipping — a toolbar row grows a
 * second line, which is not what a desktop app wants. The component's remedy is
 * `maxItems`, which collapses the middle to an ellipsis that is deliberately
 * *not* a control (the shadcn parity), so the levels it hides are unreachable.
 * A navigable trail therefore composes the ellipsis itself: a menu trigger that
 * lists the hidden levels.
 *
 * Three questions the probe measures, in order:
 *
 * 1. **Does an unbudgeted trail wrap when the pane narrows?** The shipped trail
 *    at both widths, read from its own painted box.
 * 2. **Does a budget keep it to one row, and does the budget come from the
 *    pane's report rather than a constant?** The app derives it from `onLayout`.
 * 3. **Can a reader reach the levels a budget hides?** The app's own trigger
 *    takes the next Tab stop after the first crumb, opens the shipped menu on
 *    `Enter`, and a chosen level becomes the trail's page.
 *
 * The arithmetic, ids and roles live here so the view, the steps, the README and
 * the unit suite read one source. Native-free, as every fixture is.
 */
import * as Arr from "effect/Array";
import { targetSize, type Theme } from "@gpuixui/tokens";

/** The trail's levels, root first; the last one is the page it opens on. */
export const BREADCRUMB_LEVELS = [
  "Library",
  "Design system",
  "Components",
  "Overlays",
  "Dialog",
] as const;

/** One level of the trail. */
export type BreadcrumbLevel = (typeof BREADCRUMB_LEVELS)[number];

/** The page the trail opens on: the deepest level. */
export const BREADCRUMB_START = BREADCRUMB_LEVELS.length - 1;

/**
 * The level at `index`, clamped to the trail.
 *
 * A `readonly` tuple is index-checked, and every index this fixture hands over
 * comes from its own ranges; the clamp keeps that fact out of every call site.
 */
export const levelAt = (index: number): BreadcrumbLevel =>
  BREADCRUMB_LEVELS[index] ?? BREADCRUMB_LEVELS[0];

/** The pane's two widths: one that fits the whole trail, one that does not. */
export const BREADCRUMB_WIDTHS = { wide: 560, narrow: 280 } as const;

/** A pane width the probe can choose. */
export type BreadcrumbPane = keyof typeof BREADCRUMB_WIDTHS;

/**
 * The points one rendered entry is budgeted at.
 *
 * A budget is arithmetic over a measured width, which is why it goes through
 * {@link budgetFor} rather than a hand-picked count.
 */
export const BREADCRUMB_ENTRY_WIDTH = 112;

/**
 * How many entries a pane of `width` points can hold, ellipsis included.
 *
 * Never fewer than three — the trail's start, the gap and its current page — and
 * never more than the levels it has. A width that is not a finite number (a
 * measurement that never arrived) reads as the minimum, the rule the shipped
 * `collapse` applies to its own budget.
 */
export const budgetFor = (width: number): number => {
  // A width that never arrived (`NaN`) is the minimum; one that is infinite is
  // simply no limit, the rule the shipped `collapse` states for its own budget.
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

/** The entries a trail shows once its budget is applied. */
export interface TrailView {
  /** The levels painted as crumbs, root first, current page last. */
  readonly visible: ReadonlyArray<number>;
  /** The levels between the root and the first tail crumb, out of the trail. */
  readonly hidden: ReadonlyArray<number>;
}

/** `from..to` inclusive, or nothing when the range is empty. */
const indicesBetween = (from: number, to: number): ReadonlyArray<number> =>
  Arr.filter(Arr.range(0, to), (index) => index >= from);

/**
 * The crumbs a trail shows for `page` at `budget` entries.
 *
 * A trail that fits is painted whole. A longer one keeps the root, the ellipsis
 * and the last `budget - 2` levels, so the current page is always visible and
 * the hidden levels are the ones between the root and that tail — the same rule
 * as the shipped `collapse`, with the ellipsis the caller's.
 */
export const trailView = (page: number, budget: number): TrailView => {
  const fits = page + 1 <= budget;
  const visible = fits
    ? indicesBetween(0, page)
    : Arr.prepend(indicesBetween(page - budget + 3, page), 0);
  const afterRoot = visible[1] ?? page + 1;
  return { visible, hidden: indicesBetween(1, afterRoot - 1) };
};

/** The `testId`s the view and the steps share. */
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
  /** The app trail's own crumb at `index`. */
  appCrumb: (index: number): string => `breadcrumb-app-${index}`,
  /** The reference trail's crumb at `index`. */
  referenceCrumb: (index: number): string => `breadcrumb-reference-${index}`,
  /** The menu row for the hidden level at `index`. */
  hiddenRow: (index: number): string => `breadcrumb-hidden-${index}`,
} as const;

/** The frames a reader can look at: the two widths and the open menu. */
export const BREADCRUMB_FRAMES = {
  wide: "breadcrumb-wide",
  narrow: "breadcrumb-narrow",
  menu: "breadcrumb-narrow-menu",
} as const;

/** What the pane's readout prints; the budget is derived, never stored. */
export const breadcrumbReadout = (
  width: number,
  page: number,
  selected: string,
): string =>
  `w=${Math.round(width)} budget=${budgetFor(width)} page=${levelAt(page)} selected=${selected}`;

/** The glyph the collapsed middle paints, the role the shipped ellipsis uses. */
export const ellipsisPaint = (theme: Theme): string =>
  theme.colors.mutedForeground;

/** The pane's own fill, so a capture shows where the trail sits. */
export const panePaint = (theme: Theme): string => theme.colors.card;

/** The page behind the pane. */
export const pagePaint = (theme: Theme): string => theme.colors.background;

/** The press target floor a collapsed middle's trigger has to reach. */
export const BREADCRUMB_TARGET = targetSize.minimum;

/** How many checks the probe asserts. */
export const BREADCRUMB_CHECKS = 48;
