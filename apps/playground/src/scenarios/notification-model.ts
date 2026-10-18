/**
 * The notification centre's pure rules: grouping, flattening, the derived
 * unread count and the re-anchor target after a prepend.
 *
 * The one rule worth stating: a prepend must be compensated **by row identity**,
 * never by a height constant. The reader is looking at a row, and a group
 * header has a different height from a notification, so only the row's key
 * survives the insertion intact.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

/** One notification. `id` is monotonic, so the newest is the highest. */
export interface Notification {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly age: string;
  readonly group: "today" | "earlier";
  readonly read: boolean;
}

/** A row in the flattened list: a group header or one notification. */
export type Row =
  | { readonly key: string; readonly kind: "header"; readonly label: string }
  | {
      readonly key: string;
      readonly kind: "notification";
      readonly item: Notification;
    };

const notification = (
  id: number,
  title: string,
  body: string,
  age: string,
  group: Notification["group"],
  read: boolean,
): Notification => ({ id, title, body, age, group, read });

/** Six notifications: three Today, three Earlier, and three unread. */
export const initialNotifications: ReadonlyArray<Notification> = [
  notification(6, "Build finished", "web-1042 passed in 42s", "2m", "today", false),
  notification(5, "New comment", "Ada replied to your review", "18m", "today", true),
  notification(4, "Deploy failed", "api-88 stopped at the migrate step", "1h", "today", false),
  notification(3, "Review requested", "Grace asked for a review", "3h", "earlier", true),
  notification(2, "Mention", "Linus mentioned you in #runtime", "3h", "earlier", false),
  notification(1, "System update", "Restart to install 0.10.1", "Yesterday", "earlier", true),
];

/** A fresh arrival: unread, Today, newest. */
export const newNotification = (id: number): Notification =>
  notification(
    id,
    `New notification ${id}`,
    "A new event arrived while you were reading",
    "now",
    "today",
    false,
  );

/** The unread count, derived — never stored. */
export const unreadCount = (items: ReadonlyArray<Notification>): number =>
  Arr.length(Arr.filter(items, (item) => !item.read));

const newestFirst = (items: ReadonlyArray<Notification>): ReadonlyArray<Notification> =>
  Arr.sort(
    items,
    Order.mapInput(Order.flip(Order.Number), (item: Notification) => item.id),
  );

const section = (
  key: string,
  label: string,
  group: Notification["group"],
  items: ReadonlyArray<Notification>,
): ReadonlyArray<Row> =>
  Arr.match(newestFirst(Arr.filter(items, (item) => item.group === group)), {
    onEmpty: () => [],
    onNonEmpty: (members) =>
      Arr.prepend(
        Arr.map(
          members,
          (item): Row => ({
            key: `n:${item.id}`,
            kind: "notification",
            item,
          }),
        ),
        { key: `h:${key}`, kind: "header", label },
      ),
  });

/** The flat list: Today (newest first), then Earlier, headers only when non-empty. */
export const rowsOf = (items: ReadonlyArray<Notification>): ReadonlyArray<Row> =>
  Arr.appendAll(
    section("today", "Today", "today", items),
    section("earlier", "Earlier", "earlier", items),
  );

/** The index of a row key, or `None` when the row is not in the list. */
export const rowIndex = (
  rows: ReadonlyArray<Row>,
  key: string,
): Option.Option<number> =>
  Arr.findFirstIndex(rows, (row) => row.key === key);

/**
 * Where the list must re-anchor after `rowsAfter` replaced `rowsBefore`.
 *
 * `anchorIndex` is the row the reader had at the top. The answer is that same
 * row's new index, so a prepended row above the reader does not move the text
 * under their eyes. At anchor `0` the answer is `None`: a reader at the top
 * wants to see the arrival. When the row is gone there is nothing to keep.
 */
export const reanchorTarget = (
  rowsBefore: ReadonlyArray<Row>,
  anchorIndex: number,
  rowsAfter: ReadonlyArray<Row>,
): Option.Option<number> => {
  if (anchorIndex <= 0) return Option.none();
  return Option.flatMap(
    Arr.get(rowsBefore, anchorIndex),
    (row) => rowIndex(rowsAfter, row.key),
  );
};
