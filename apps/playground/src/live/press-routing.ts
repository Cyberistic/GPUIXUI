import * as Arr from "effect/Array";

export const PRESS_HANDLERS = [
  "row-click",
  "cell-click",
  "row-down",
  "row-key",
  "row-aux",
] as const;

export type PressHandler = (typeof PRESS_HANDLERS)[number];

export const NESTINGS = [
  "text-unfilled",
  "text-filled",
  "div-filled",
  "control-filled",
  "control-unfilled",
  "inert-control",
  "drag-row",
  "aux-row",
  "field-cell",
  "field-in-row",
] as const;

export type Nesting = (typeof NESTINGS)[number];

export interface PressCase {
  readonly id: Nesting;

  readonly caption: string;

  readonly hits: ReadonlyArray<PressHandler>;
}

const byNesting: Record<Nesting, PressCase> = {
  "text-unfilled": {
    id: "text-unfilled",
    caption: "a press on an unfilled `<text>` label",
    hits: ["row-click"],
  },
  "text-filled": {
    id: "text-filled",
    caption: "a press on a `<text>` label that paints a fill",
    hits: [],
  },
  "div-filled": {
    id: "div-filled",
    caption: "a press on a `<div>` child that paints a fill",
    hits: [],
  },
  "control-filled": {
    id: "control-filled",
    caption: "a press on a control child that paints a fill",
    hits: ["cell-click"],
  },
  "control-unfilled": {
    id: "control-unfilled",
    caption: "a press on a control child that paints no fill",
    hits: ["cell-click", "row-click"],
  },
  "inert-control": {
    id: "inert-control",
    caption: "a press on a filled control that declares pointerEvents none",
    hits: ["cell-click", "row-click"],
  },
  "drag-row": {
    id: "drag-row",
    caption: "a press on a filled control inside a row that owns mouseDown",
    hits: ["cell-click"],
  },
  "aux-row": {
    id: "aux-row",
    caption: "a right press on a filled child of a row with onAuxClick",
    hits: [],
  },
  "field-cell": {
    id: "field-cell",
    caption: "a key typed in a field inside a row with onKeyDown",
    hits: ["row-key"],
  },
  "field-in-row": {
    id: "field-in-row",
    caption: "a press on a field inside a row that also selects",
    hits: ["row-click"],
  },
};

export const PRESS_CASES: ReadonlyArray<PressCase> = Arr.map(
  NESTINGS,
  (id) => byNesting[id],
);

export const pressCase = (id: Nesting): PressCase => byNesting[id];

export const PRESS_DRAFT = "press-routing-draft";

export const PRESS_READOUT = "press-routing-readout";

export const PRESS_CLEAR = "press-routing-clear";

export const PRESS_CAPTION = "press-routing-caption";

export const pressRowId = (id: Nesting): string => `press-row-${id}`;

export const pressCellId = (id: Nesting): string => `press-cell-${id}`;

export const formatHits = (hits: ReadonlyArray<string>): string =>
  Arr.match(hits, {
    onEmpty: () => "hits=none",
    onNonEmpty: (ran) => `hits=${Arr.join(ran, ",")}`,
  });
