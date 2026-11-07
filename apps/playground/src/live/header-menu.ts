import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const HEADER_TRIGGER_WIDTH = 100;

export const HEADER_FRAME_WIDTH = 420;

export interface HeaderColumn {
  readonly id: "name" | "size" | "status";
  readonly label: string;
  readonly width: number;
}

export const HEADER_COLUMNS: ReadonlyArray<HeaderColumn> = [
  { id: "name", label: "name", width: 200 },
  { id: "size", label: "size", width: 120 },
  { id: "status", label: "status", width: 120 },
];

export const HEADER_TRIGGER_AFTER: HeaderColumn["id"] = "name";

export const headerCellId = (id: HeaderColumn["id"]): string =>
  `header-cell-${id}`;

export const HEADER_TRIGGER = "header-menu-trigger";

export const HEADER_TRIGGER_CELL = "header-cell-trigger";

export const HEADER_FRAME = "header-frame";

export const HEADER_FIRST_ITEM = "header-menu-item-status";

const byHeader: (
  left: HeaderColumn["id"],
  right: HeaderColumn["id"],
) => -1 | 0 | 1 = (left, right) => {
  const indexOf = (id: HeaderColumn["id"]): number =>
    Option.getOrElse(
      Arr.findFirstIndex(HEADER_COLUMNS, (column) => column.id === id),
      () => 0,
    );
  const difference = indexOf(left) - indexOf(right);
  return difference === 0 ? 0 : difference < 0 ? -1 : 1;
};

const beforeTrigger = (): ReadonlyArray<HeaderColumn> => {
  const index = Option.getOrElse(
    Arr.findFirstIndex(
      HEADER_COLUMNS,
      (column) => column.id === HEADER_TRIGGER_AFTER,
    ),
    () => -1,
  );
  return Arr.take(HEADER_COLUMNS, index + 1);
};

export const headerContentWidth = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
): number =>
  HEADER_TRIGGER_WIDTH +
  Arr.reduce(
    Arr.filter(HEADER_COLUMNS, (column) => !Arr.contains(hidden, column.id)),
    0,
    (sum, column) => sum + column.width,
  );

export const headerTravel = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
): number => Math.max(0, headerContentWidth(hidden) - HEADER_FRAME_WIDTH);

export const headerTriggerCellX = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
  offset: number,
): number =>
  offset +
  Arr.reduce(
    Arr.filter(beforeTrigger(), (column) => !Arr.contains(hidden, column.id)),
    0,
    (sum, column) => sum + column.width,
  );

export const toggleHidden = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
  id: HeaderColumn["id"],
): ReadonlyArray<HeaderColumn["id"]> =>
  Arr.contains(hidden, id)
    ? Arr.filter(hidden, (value) => value !== id)
    : Arr.sort(Arr.append(hidden, id), byHeader);
