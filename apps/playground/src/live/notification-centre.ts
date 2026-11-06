import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const NOTIFICATION_MAX = 3;

export const NOTIFICATION_TITLES = [
  "Build finished",
  "Deploy blocked",
  "New comment",
  "Session expired",
] as const;

export const NOTIFICATION_TONES = [
  "success",
  "warning",
  "info",
  "danger",
] as const;

export const NOTIFICATION_ACTION = "Open";

export const NOTIFICATION_CHECKS = 30;

export const NOTIFICATION_TRANSIENT = "Auto clears";
export const NOTIFICATION_TRANSIENT_MS = 700;

export const NOTIFICATION_IDS = {
  probe: "notification-centre",
  panel: "notification-centre-panel",
  readout: "notification-readout",
  actions: "notification-actions",
  transient: "notification-push-transient",
  clear: "notification-clear",
  push: (index: number): string => `notification-push-${index + 1}`,
} as const;

export const NOTIFICATION_GAP = 12;

export interface NotificationBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const notificationCardId = (id: string): string => `toast-${id}`;

export const notificationReadout = (ids: ReadonlyArray<string>): string =>
  Arr.match(ids, {
    onEmpty: () => "queued=0 ids=none",
    onNonEmpty: (live) => `queued=${live.length} ids=${Arr.join(live, ",")}`,
  });

export const notificationActions = (actions: number): string =>
  `actions=${actions}`;

export const notificationIds = (pushed: number): ReadonlyArray<string> =>
  pushed <= 0
    ? []
    : Arr.reduce(Arr.range(1, pushed), Arr.empty<string>(), (ids, seq) =>
        Arr.fromIterable(keptByQueue(ids, String(seq))),
      );

const keptByQueue = (
  ids: ReadonlyArray<string>,
  next: string,
): ReadonlyArray<string> => {
  const appended = Arr.append(ids, next);
  return Arr.drop(appended, Math.max(0, appended.length - NOTIFICATION_MAX));
};

export const notificationNextId = (ids: ReadonlyArray<string>): string =>
  String(
    Option.match(Arr.last(ids), {
      onNone: () => 1,
      onSome: (id) => Number(id) + 1,
    }),
  );

export interface StackGeometry {
  readonly widths: ReadonlyArray<number>;
  readonly rights: ReadonlyArray<number>;
  readonly gaps: ReadonlyArray<number>;
}

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
