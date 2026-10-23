/**
 * The `z-index-lifecycle` fixture: does a stacking level order positioned
 * siblings, for paint and for the hit test, in the binding this repo builds?
 *
 * The published `@gpuix/native@0.11.0` has no `zIndex`: siblings paint in tree
 * order and a surface has to be the last child of the root. The repository's
 * source-built darwin-x64 binding carries a local patch
 * (`apps/playground/patches/gpuix-zindex.patch`) that adds the field, and until
 * now nothing in this app had painted one — a rebuild that silently dropped the
 * patch would leave every overlay working exactly as it does today and no test
 * would say so.
 *
 * The probe measures three arrangements of one geometry:
 *
 * 1. **positioned, levelled** — three absolute boxes mounted red, green, blue
 *    with levels 3, 1, 2. Tree order would make blue the top box; the level
 *    makes it red, and the hit test must agree with the paint.
 * 2. **positioned, no level** — the same three boxes, mounted the same way, with
 *    no `zIndex`: the gate in `paint_order` must leave tree order untouched, so
 *    blue stays on top.
 * 3. **in-flow with a level** — a level on an in-flow child is ignored, and a
 *    positioned sibling still paints above it.
 *
 * Native-free: the ids, the geometry, the readout and the check count live here
 * so the view, the steps, the README and the unit test read one source.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";

/** The `testId`s the view and the steps share. */
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

/**
 * The fills, one per layer, so the top box is a colour rather than an id.
 *
 * Red is the highest level and the **first** child, which is what makes the
 * measurement discriminate: tree order alone would paint blue on top.
 */
export const Z_INDEX_FILLS = {
  high: "#FF3B30",
  low: "#34C759",
  mid: "#0A84FF",
  flowBase: "#FFCC00",
  flowCover: "#AF52DE",
} as const;

/** The container both positioned stacks paint in. */
export const Z_INDEX_STACK = { width: 200, height: 120 } as const;

/** The overlapping box every positioned sibling shares, so one point is all three. */
export const Z_INDEX_BOX = {
  top: 15,
  left: 20,
  width: 160,
  height: 90,
} as const;

/** The levels the three positioned siblings declare. */
export const Z_INDEX_LEVELS = { high: 3, low: 1, mid: 2 } as const;

/** The in-flow sibling's band, and the level it declares in vain. */
export const Z_INDEX_FLOW = { width: 200, height: 48 } as const;
export const Z_INDEX_FLOW_LEVEL = 9;

/** One element a stack registered: the native id and the name the readout prints. */
export interface IndexedHandle {
  readonly id: number;
  readonly name: string;
}

/** The names of the handles a hit list reports, topmost first. */
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

/** A hit list in one word, so an empty readout is `none` rather than blank. */
export const namesOf = (names: ReadonlyArray<string>): string =>
  Arr.match(names, {
    onEmpty: () => "none",
    onNonEmpty: (present) => Arr.join(present, ","),
  });

/** What the probe prints: the three hit orders and the boxes a press reached. */
export interface ZIndexReadout {
  readonly stack: ReadonlyArray<string>;
  readonly plain: ReadonlyArray<string>;
  readonly flow: ReadonlyArray<string>;
  readonly presses: ReadonlyArray<string>;
}

/** The readout's one spelling, shared by the view, the steps and the test. */
export const zIndexReadout = (state: ZIndexReadout): string =>
  `stack=${namesOf(state.stack)} plain=${namesOf(state.plain)} flow=${namesOf(
    state.flow,
  )} presses=${namesOf(state.presses)}`;

/**
 * How many checks the probe asserts.
 *
 * Held to the probe's `ctx.expect*` sites by `z-index.test.ts`, so an assertion
 * added without the sentence — or a sentence edited alone — fails.
 */
export const Z_INDEX_CHECKS = 16;
