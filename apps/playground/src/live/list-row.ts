import * as Arr from "effect/Array";

export type TrailingShape = "badge" | "badge-eager" | "badge-inert" | "text";

export const LIST_ROW_ROWS: ReadonlyArray<TrailingShape> = [
  "badge",
  "badge-eager",
  "badge-inert",
  "text",
];

export const LIST_ROW_PRESS_IDS = [
  "badge",
  "badge-eager",
  "badge-inert",
  "text",
  "badge-body",
] as const;

export type ListRowPressId = (typeof LIST_ROW_PRESS_IDS)[number];

export interface ListRowPress {
  readonly id: ListRowPressId;

  readonly caption: string;

  readonly target: string;

  readonly selects: string;
}

export const LIST_ROW_LIST = "list-row-press";

export const LIST_ROW_READOUT = "list-row-readout";

export const LIST_ROW_CLEAR = "list-row-clear";

export const LIST_ROW_CAPTION = "list-row-caption";

export const listRowId = (row: TrailingShape): string => `list-row-${row}`;

export const listRowTrailingId = (row: TrailingShape): string =>
  `list-row-trailing-${row}`;

const byId: Record<ListRowPressId, ListRowPress> = {
  badge: {
    id: "badge",
    caption: "a press on the shipped badge in the trailing slot",
    target: listRowTrailingId("badge"),
    selects: "badge",
  },
  "badge-eager": {
    id: "badge-eager",
    caption: "a press on a badge whose caller hands the pointer back",
    target: listRowTrailingId("badge-eager"),
    selects: "",
  },
  "badge-inert": {
    id: "badge-inert",
    caption: "a press on the same badge declaring `pointerEvents: none`",
    target: listRowTrailingId("badge-inert"),
    selects: "badge-inert",
  },
  text: {
    id: "text",
    caption: "a press on a plain text slot",
    target: listRowTrailingId("text"),
    selects: "text",
  },
  "badge-body": {
    id: "badge-body",
    caption: "a press on the badge row's own body",
    target: listRowId("badge"),
    selects: "badge",
  },
};

export const LIST_ROW_PRESSES: ReadonlyArray<ListRowPress> = Arr.map(
  LIST_ROW_PRESS_IDS,
  (id) => byId[id],
);

export const listRowPress = (id: ListRowPressId): ListRowPress => byId[id];

export const formatSelection = (selected: string): string =>
  selected === "" ? "selected=none" : `selected=${selected}`;
