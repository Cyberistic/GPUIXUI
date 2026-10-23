/**
 * The `empty-error-states-lifecycle` probe's fixture: a panel that starts on a
 * failed load, recovers to an empty collection and then paints its first record.
 *
 * MISSION lists **empty and error states** among the interactions a real
 * runtime has to verify, and no probe had painted either one: `validation-lifecycle`
 * measures a *field's* schema message, while the panel a list or table shows
 * when it has nothing (or when the load failed) had only been mounted, never
 * driven. Three questions are the ones a consumer asks:
 *
 * 1. **Does an error state paint its own surface and recover?** The shipped
 *    `Alert` paints the destructive tone's soft role; a press on its retry
 *    action must replace it, not paint beside it.
 * 2. **Does an empty state paint no surface of its own?** `EmptyState` is a
 *    panel, not a surface — it relies on the list's own fill — so the probe
 *    samples the stage behind it, which must be the only paint there.
 * 3. **Is the way out a real control?** Both states offer an action built from
 *    the shipped `Button`; a press has to reach it through a window, or the
 *    "empty" screen is a dead end a reader can see but not leave.
 *
 * The arithmetic, the ids and the roles live here so the view, the probe's
 * checks, the README table and the unit test read one source. Native-free, as
 * every fixture is.
 */
import { statusTone, type Theme } from "@gpuixui/tokens";

/** The three states the panel moves through, in the order the probe drives them. */
export const EMPTY_ERROR_STAGES = ["error", "empty", "ready"] as const;

/** One state of the panel. */
export type EmptyErrorStage = (typeof EMPTY_ERROR_STAGES)[number];

/** The `testId`s the view and the steps share. */
export const EMPTY_ERROR_IDS = {
  probe: "empty-error-probe",
  stage: "empty-error-stage",
  readout: "empty-error-readout",
  alert: "empty-error-alert",
  retry: "empty-error-retry",
  empty: "empty-error-empty",
  newProject: "empty-error-new-project",
  content: "empty-error-content",
} as const;

/** The copy each state paints, so a check reads the words rather than an id. */
export const EMPTY_ERROR_COPY = {
  alertTitle: "Could not load projects",
  alertBody: "The server did not answer. The list is unchanged.",
  retry: "Retry",
  emptyTitle: "No projects yet",
  emptyBody: "A project holds your files, runs and settings.",
  newProject: "New project",
  content: "First project",
} as const;

/** The frames a reader can look at, one per painted state. */
export const EMPTY_ERROR_FRAMES = {
  error: "empty-error-error",
  empty: "empty-error-empty",
  ready: "empty-error-ready",
} as const;

/** The panel's own width; its height follows the state it paints. */
export const EMPTY_ERROR_WIDTH = 420;

/**
 * How far inside a painted box a solid role is sampled.
 *
 * Deep enough to clear a one-pixel border and the padding around a glyph, and
 * shallow enough that a control smaller than its own padding still holds it.
 */
export const PAINT_INSET = 6;

/**
 * How far inside the empty state's root its (absent) surface is sampled.
 *
 * The root's own padding is larger than this, so the point is inside the panel
 * and clear of its title, description and action.
 */
export const EMPTY_INSET = 8;

/**
 * The panel's fill: a floating surface a collection can sit on (a palette, a
 * popover's list, a dock pane). The empty state paints nothing behind itself,
 * so this role is what its own padding shows.
 */
export const stagePaint = (theme: Theme): string => theme.colors.popover;

/** The error state's own surface: the destructive tone's soft role. */
export const errorSurfacePaint = (theme: Theme): string =>
  statusTone(theme, "destructive").background;

/** The readable colour the error title paints. */
export const errorInkPaint = (theme: Theme): string =>
  statusTone(theme, "destructive").foreground;

/** A filled action's resting fill, for both ways out. */
export const actionPaint = (theme: Theme): string => theme.colors.primary;

/** The recovered record's fill. */
export const contentPaint = (theme: Theme): string => theme.colors.success;

/** A logical point inside a painted box, in the window's coordinates. */
export const inside = (
  box: { readonly x: number; readonly y: number },
  dx: number,
  dy: number,
): { readonly x: number; readonly y: number } => ({
  x: box.x + dx,
  y: box.y + dy,
});

/** What the probe's readout prints, so every step reads one line. */
export const emptyErrorReadout = (stage: EmptyErrorStage): string =>
  `state=${stage}`;

/** The state a press on the panel's action moves to. */
export const afterAction = (stage: EmptyErrorStage): EmptyErrorStage =>
  stage === "error" ? "empty" : "ready";

/**
 * How many checks the probe asserts: its five role checks, the three capture
 * scales, and the error, empty and recovered states one step at a time.
 */
export const EMPTY_ERROR_CHECKS = 33;
