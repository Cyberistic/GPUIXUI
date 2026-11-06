import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

export const HOVER_NESTINGS = [
  "text-unfilled",
  "text-filled",
  "div-filled",
  "inert-div",
] as const;

export type HoverNesting = (typeof HOVER_NESTINGS)[number];

export interface HoverCase {
  readonly id: HoverNesting;

  readonly caption: string;

  readonly rowEnter: boolean;

  readonly childEnter: boolean;

  readonly painted: boolean;
}

const byNesting: Record<HoverNesting, HoverCase> = {
  "text-unfilled": {
    id: "text-unfilled",
    caption: "the pointer on an unfilled `<text>` label",
    rowEnter: true,
    childEnter: true,
    painted: true,
  },
  "text-filled": {
    id: "text-filled",
    caption: "the pointer on a `<text>` label that paints a fill",
    rowEnter: false,
    childEnter: true,
    painted: false,
  },
  "div-filled": {
    id: "div-filled",
    caption: "the pointer on a `<div>` child that paints a fill",
    rowEnter: false,
    childEnter: true,
    painted: false,
  },
  "inert-div": {
    id: "inert-div",
    caption: "the pointer on a filled `<div>` that declares pointerEvents none",
    rowEnter: true,

    childEnter: true,
    painted: true,
  },
};

export const HOVER_CASES: ReadonlyArray<HoverCase> = Arr.map(
  HOVER_NESTINGS,
  (id) => byNesting[id],
);

export const hoverCase = (id: HoverNesting): HoverCase => byNesting[id];

export const HOVER_CAPTION = "hover-routing-caption";

export const HOVER_AWAY = "hover-routing-away";

export const hoverRowId = (id: HoverNesting): string => `hover-row-${id}`;

export const hoverChildId = (id: HoverNesting): string => `hover-child-${id}`;

export const hoverReadoutId = (id: HoverNesting): string =>
  `hover-readout-${id}`;

export class HoverCounts extends Schema.Class<HoverCounts>("HoverCounts")({
  row: Schema.Number,

  child: Schema.Number,

  leave: Schema.Number,
}) {}

export const formatHoverCounts = (counts: HoverCounts): string =>
  `row=${counts.row} child=${counts.child} leave=${counts.leave}`;

export const decodeHoverCounts = (text: string): Option.Option<HoverCounts> =>
  Option.flatMap(
    Option.all(
      Arr.map(text.trim().split(/\s+/), (token) => {
        const at = token.indexOf("=");
        return at <= 0
          ? Option.none<readonly [string, number]>()
          : Option.map(
              Schema.decodeUnknownOption(Schema.FiniteFromString)(
                token.slice(at + 1),
              ),
              (value) => [token.slice(0, at), value] as const,
            );
      }),
    ),
    (pairs) => Schema.decodeUnknownOption(HoverCounts)(R.fromEntries(pairs)),
  );

export interface HoverBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const pixelRegion = (
  box: HoverBox,
  scale: number,
): { x: number; y: number; width: number; height: number } => ({
  x: Math.round(box.x * scale),
  y: Math.round(box.y * scale),
  width: Math.round(box.width * scale),
  height: Math.round(box.height * scale),
});
