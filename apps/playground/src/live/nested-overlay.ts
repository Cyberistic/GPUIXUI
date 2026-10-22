/**
 * The nested-overlay contract, as the probe drives it: a dialog holding a
 * popover holding a menu.
 *
 * The components' `dismiss-layer.ts` decides which surface an Escape closes by
 * containment depth, and guards one gesture to one consumer — a keystroke
 * bubbles through every enclosing surface, so a missing guard would close the
 * menu **and** the popover **and** the dialog on one press. That claim was
 * measured in an offscreen renderer (`dismiss-layer.test.ts`, and the
 * hand-composed `modal-focus-trap` scenario); the shipped three-level tree has
 * never been driven in a window, where the keystroke payloads are the runtime's
 * own.
 *
 * The probe therefore plays the caller: the three surfaces are controlled by
 * `nestedFlow`, which records each transition and appends the surface a close
 * landed on. The order that list prints is the measurement.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";

/** The three surfaces, outermost first. */
export const nestedSurfaces = ["dialog", "popover", "menu"] as const;

/** One surface of the stack. */
export type NestedSurface = (typeof nestedSurfaces)[number];

/** The app's own opener, which also holds the focus the dialog restores. */
export const NESTED_OPENER = "nested-open";

/** The dialog surface. */
export const NESTED_DIALOG = "nested-dialog";

/** The popover inside the dialog. */
export const NESTED_POPOVER_TRIGGER = "nested-popover-trigger";
export const NESTED_POPOVER_PANEL = "nested-popover-panel";

/** The menu inside the popover. */
export const NESTED_MENU_TRIGGER = "nested-menu-trigger";
export const NESTED_MENU_PANEL = "nested-menu-panel";
export const NESTED_MENU_ITEM = "nested-menu-item";

/** The readout the checks assert against. */
export const NESTED_READOUT = "nested-readout";

/** The app's record: each surface's state, its transitions and the close order. */
export interface NestedFlow {
  readonly open: Readonly<Record<NestedSurface, boolean>>;
  readonly opens: Readonly<Record<NestedSurface, number>>;
  readonly closes: Readonly<Record<NestedSurface, number>>;
  readonly dismissed: ReadonlyArray<NestedSurface>;
}

/** One transition a surface reported through `onOpenChange`. */
export interface NestedEvent {
  readonly surface: NestedSurface;
  readonly open: boolean;
}

const closed: Readonly<Record<NestedSurface, boolean>> = {
  dialog: false,
  popover: false,
  menu: false,
};

const noCounts: Readonly<Record<NestedSurface, number>> = {
  dialog: 0,
  popover: 0,
  menu: 0,
};

/** The flow before the reader has pressed anything. */
export const initialNestedFlow: NestedFlow = {
  open: closed,
  opens: noCounts,
  closes: noCounts,
  dismissed: [],
};

/**
 * Records a transition. A close appends its surface, so the list is the order
 * the dismissals happened in — the only evidence an outside-in stack leaves.
 */
export const nestedFlow = (flow: NestedFlow, event: NestedEvent): NestedFlow =>
  Match.value(event.open).pipe(
    Match.when(true, () => ({
      ...flow,
      open: { ...flow.open, [event.surface]: true },
      opens: {
        ...flow.opens,
        [event.surface]: flow.opens[event.surface] + 1,
      },
    })),
    Match.when(false, () => ({
      ...flow,
      open: { ...flow.open, [event.surface]: false },
      closes: {
        ...flow.closes,
        [event.surface]: flow.closes[event.surface] + 1,
      },
      dismissed: Arr.append(flow.dismissed, event.surface),
    })),
    Match.exhaustive,
  );

/** `dialog=open popover=closed …` in the declared order. */
const flags = (open: Readonly<Record<NestedSurface, boolean>>): string =>
  Arr.join(
    Arr.map(
      nestedSurfaces,
      (surface) => `${surface}=${open[surface] ? "open" : "closed"}`,
    ),
    " ",
  );

/** A comma-joined count per surface, in the declared order. */
const counts = (record: Readonly<Record<NestedSurface, number>>): string =>
  Arr.join(
    Arr.map(nestedSurfaces, (surface) => `${record[surface]}`),
    ",",
  );

/** The close order, or `none` before the first dismissal. */
const order = (dismissed: ReadonlyArray<NestedSurface>): string =>
  Arr.match(dismissed, {
    onEmpty: () => "none",
    onNonEmpty: (surfaces) => Arr.join(surfaces, ","),
  });

/** The `key=value` line the probe's assertions read. */
export const nestedReadout = (flow: NestedFlow): string =>
  `${flags(flow.open)} opens=${counts(flow.opens)} closes=${counts(flow.closes)} dismissed=${order(flow.dismissed)}`;
