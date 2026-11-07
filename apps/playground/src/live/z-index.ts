import { pipe } from "effect";
import * as Arr from "effect/Array";

export const Z_INDEX_IDS = {
  probe: "z-index-probe",
  measure: "z-index-measure",
  stack: "z-index-stack",
  high: "z-index-high",
  low: "z-index-low",
  mid: "z-index-mid",
  plain: "z-index-plain",
  flow: "z-index-flow",
  flowBase: "z-index-flow-base",
  flowCover: "z-index-flow-cover",
  readout: "z-index-readout",
} as const;

export const Z_INDEX_FILLS = {
  high: "#FF3B30",
  low: "#34C759",
  mid: "#0A84FF",
  flowBase: "#FFCC00",
  flowCover: "#AF52DE",
} as const;

export const Z_INDEX_STACK = { width: 200, height: 120 } as const;

export const Z_INDEX_BOX = {
  top: 15,
  left: 20,
  width: 160,
  height: 90,
} as const;

export const Z_INDEX_LEVELS = { high: 3, low: 1, mid: 2 } as const;

export const Z_INDEX_FLOW = { width: 200, height: 48 } as const;
export const Z_INDEX_FLOW_LEVEL = 9;

export interface IndexedHandle {
  readonly id: number;
  readonly name: string;
}

export const namesIn = (
  hits: ReadonlyArray<number>,
  handles: ReadonlyArray<IndexedHandle>,
): ReadonlyArray<string> =>
  pipe(
    hits,
    Arr.map((hit) => Arr.findFirst(handles, (handle) => handle.id === hit)),
    Arr.getSomes,
    Arr.map((handle) => handle.name),
  );

export const namesOf = (names: ReadonlyArray<string>): string =>
  Arr.match(names, {
    onEmpty: () => "none",
    onNonEmpty: (present) => Arr.join(present, ","),
  });

export interface ZIndexReadout {
  readonly stack: ReadonlyArray<string>;
  readonly plain: ReadonlyArray<string>;
  readonly flow: ReadonlyArray<string>;
  readonly presses: ReadonlyArray<string>;
}

export const zIndexReadout = (state: ZIndexReadout): string =>
  `stack=${namesOf(state.stack)} plain=${namesOf(state.plain)} flow=${namesOf(
    state.flow,
  )} presses=${namesOf(state.presses)}`;

export const Z_INDEX_CHECKS = 16;
