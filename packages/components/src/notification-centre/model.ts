/**
 * The pure rules behind the notification centre: grouping, flattening and the
 * derived unread count. No React and no timers, so the read contract is testable
 * without the runtime.
 *
 * The caller owns the data and its order (newest first). A group is a
 * **contiguous** run of items carrying the same `group` label — the same rule
 * Combobox uses for its option groups — so a caller can interleave sections
 * without the component inventing a second sort.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** One notification row's data. */
export interface NotificationItem {
  /** Stable id, unique within the list; a row reports it on read. */
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** When it happened, already formatted by the caller ("2m", "Yesterday"). */
  readonly timestamp?: string;
  /** A contiguous run of the same label is one group; absent means ungrouped. */
  readonly group?: string;
  /** Absent means unread, so a new notification needs no extra flag. */
  readonly read?: boolean;
}

/** A group heading in the flattened list. */
export interface NotificationHeaderRow {
  readonly kind: "header";
  /** Stable within one flatten pass, even when a label repeats. */
  readonly key: string;
  readonly label: string;
}

/** One notification in the flattened list. */
export interface NotificationItemRow {
  readonly kind: "item";
  readonly key: string;
  readonly item: NotificationItem;
}

/** A heading or a notification, in paint order. */
export type NotificationRow = NotificationHeaderRow | NotificationItemRow;

/** Whether an item still needs the reader's attention. */
export const isUnread = (item: NotificationItem): boolean => item.read !== true;

/** How many notifications are unread. Derived on every read, never stored. */
export const unreadCount = (items: ReadonlyArray<NotificationItem>): number =>
  Arr.length(Arr.filter(items, isUnread));

/** Whether `index` starts a new group; the first row always does. */
const startsGroup = (
  items: ReadonlyArray<NotificationItem>,
  index: number,
  group: string,
): boolean =>
  index === 0 ||
  !Option.exists(
    Arr.get(items, index - 1),
    (previous) => previous.group === group,
  );

/** Flatten items into a heading per contiguous group plus the item rows. */
export const flattenRows = (
  items: ReadonlyArray<NotificationItem>,
): ReadonlyArray<NotificationRow> =>
  Arr.flatten(
    Arr.map(items, (item, index) => {
      const header =
        item.group !== undefined && startsGroup(items, index, item.group)
          ? Arr.of<NotificationRow>({
              kind: "header",
              key: `header:${index}:${item.group}`,
              label: item.group,
            })
          : Arr.empty<NotificationRow>();
      const itemRow: NotificationRow = {
        kind: "item",
        key: `item:${item.id}`,
        item,
      };
      return Arr.append(header, itemRow);
    }),
  );

/** Mark one notification read; already-read items are returned unchanged. */
export const readItem = (
  items: ReadonlyArray<NotificationItem>,
  id: string,
): ReadonlyArray<NotificationItem> =>
  Arr.map(items, (item) =>
    item.id === id && isUnread(item) ? { ...item, read: true } : item,
  );

/** Mark every notification read. */
export const readAll = (
  items: ReadonlyArray<NotificationItem>,
): ReadonlyArray<NotificationItem> =>
  Arr.map(items, (item) => (isUnread(item) ? { ...item, read: true } : item));
