/**
 * The notification centre's pure rules: grouping, flattening and the derived
 * unread count.
 *
 * Prepending needs no rule here: the probe measured that the `<virtual-list>`
 * keeps the reader's row across an insertion by itself (`plan 381` §9), so an
 * app-owned compensation would be a second, wrong source of truth.
 */
import * as Arr from "effect/Array";
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
