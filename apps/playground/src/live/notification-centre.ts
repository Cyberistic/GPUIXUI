/**
 * The `notification-centre-lifecycle` fixture: the arithmetic and the readouts
 * the probe drives.
 *
 * Tier 5's **Notification centre** row was `?` with the note "composition over
 * toasts + panels". The shipped toast system is the transient half, and the
 * question a centre asks before it exists is whether that half can be its
 * storage: the store is **bounded** (the oldest toast is expired when a fourth
 * arrives), so the history has to be the app's own list and a panel reads
 * that, while the viewport paints what is still live.
 *
 * The probe measures the composition in a window: the cards stack in push
 * order and share a right edge, a fourth push expires the first card, the
 * centre panel keeps it, a card's action reports once and dismisses its card,
 * the rest reflow, and the auto-dismiss clock runs in the window. The
 * arithmetic here keeps the step expectations derived rather than retyped.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/**
 * The cards the store keeps. Held to `packages/components/src/toast/store.ts`'s
 * own `DEFAULT_MAX` by the suite, so a store default moving fails a case
 * instead of leaving the probe expecting the previous bound.
 */
export const NOTIFICATION_MAX = 3;

/** One draft per push button, so a press names its title and its tone. */
export const NOTIFICATION_TITLES = [
  "Build finished",
  "Deploy blocked",
  "New comment",
  "Session expired",
] as const;

/** The tone each push carries, one of the four the toast model offers. */
export const NOTIFICATION_TONES = [
  "success",
  "warning",
  "info",
  "danger",
] as const;

/** The action label every notification offers; the handler counts presses. */
export const NOTIFICATION_ACTION = "Open";

/** The checks the live run reported on 0.11.0, held to its assertion sites. */
export const NOTIFICATION_CHECKS = 30;

/** The title the transient push carries, and the duration it expires after. */
export const NOTIFICATION_TRANSIENT = "Auto clears";
export const NOTIFICATION_TRANSIENT_MS = 700;

/** Every locator the probe and its steps share. */
export const NOTIFICATION_IDS = {
  probe: "notification-centre",
  panel: "notification-centre-panel",
  readout: "notification-readout",
  actions: "notification-actions",
  transient: "notification-push-transient",
  clear: "notification-clear",
  push: (index: number): string => `notification-push-${index + 1}`,
} as const;

/** The stack's gap in the viewport's recipe (`gap-3`). */
export const NOTIFICATION_GAP = 12;

/** One painted card's box, structurally, so the fixture needs no runtime type. */
export interface NotificationBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A card's locator: the viewport names each card after its toast id. */
export const notificationCardId = (id: string): string => `toast-${id}`;

/** The queue line: `queued=3 ids=2,3,4`, or `queued=0 ids=none`. */
export const notificationReadout = (ids: ReadonlyArray<string>): string =>
  Arr.match(ids, {
    onEmpty: () => "queued=0 ids=none",
    onNonEmpty: (live) => `queued=${live.length} ids=${Arr.join(live, ",")}`,
  });

/** The action count a reader checks after a card's control runs once. */
export const notificationActions = (actions: number): string =>
  `actions=${actions}`;

/**
 * The ids the queue holds after `pushed` sequential pushes, through the store's
 * own rule: append, then drop the overflow from the front.
 */
export const notificationIds = (pushed: number): ReadonlyArray<string> =>
  pushed <= 0
    ? []
    : Arr.reduce(Arr.range(1, pushed), Arr.empty<string>(), (ids, seq) =>
        Arr.fromIterable(keptByQueue(ids, String(seq))),
      );

/** The queue after one more arrival: the oldest leaves once it is over bound. */
const keptByQueue = (
  ids: ReadonlyArray<string>,
  next: string,
): ReadonlyArray<string> => {
  const appended = Arr.append(ids, next);
  return Arr.drop(appended, Math.max(0, appended.length - NOTIFICATION_MAX));
};

/** The id the store will give the next push, given the ids now live. */
export const notificationNextId = (ids: ReadonlyArray<string>): string =>
  String(
    Option.match(Arr.last(ids), {
      onNone: () => 1,
      onSome: (id) => Number(id) + 1,
    }),
  );

/** The widths, right edges and vertical gaps of an oldest-first stack. */
export interface StackGeometry {
  readonly widths: ReadonlyArray<number>;
  readonly rights: ReadonlyArray<number>;
  readonly gaps: ReadonlyArray<number>;
}

/** Reads a stack's geometry; boxes are oldest first. */
export const stackGeometry = (
  boxes: ReadonlyArray<NotificationBox>,
): StackGeometry => ({
  widths: Arr.map(boxes, (box) => box.width),
  rights: Arr.map(boxes, (box) => box.x + box.width),
  gaps: Arr.map(
    Arr.drop(boxes, 1),
    (box, index) =>
      box.y - ((boxes[index]?.y ?? 0) + (boxes[index]?.height ?? 0)),
  ),
});

/** Whether every value is within `tolerance` of the first. */
export const sameWithin = (
  values: ReadonlyArray<number>,
  tolerance: number,
): boolean =>
  Arr.match(values, {
    onEmpty: () => true,
    onNonEmpty: (list) => {
      const first = list[0] ?? 0;
      return Arr.every(list, (value) => Math.abs(value - first) <= tolerance);
    },
  });

/**
 * Whether an oldest-first stack paints as one viewport column: equal widths and
 * right edges, a strictly descending origin, and a positive gap between cards.
 */
export const stackedInOrder = (
  boxes: ReadonlyArray<NotificationBox>,
): boolean => {
  const geometry = stackGeometry(boxes);
  return (
    boxes.length > 1 &&
    sameWithin(geometry.widths, 1) &&
    sameWithin(geometry.rights, 1) &&
    Arr.every(geometry.gaps, (gap) => gap > 0) &&
    Arr.every(
      Arr.drop(boxes, 1),
      (box, index) => box.y > (boxes[index]?.y ?? 0),
    )
  );
};
