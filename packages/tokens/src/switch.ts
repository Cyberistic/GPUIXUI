import {
  isPaintableColor,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import { contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { isControlSize, type ControlSize } from "./scale.js";
import type { SwitchColors, SwitchMetrics } from "./theme.js";

export const switchPaintRoles = ["on", "off", "knob"] as const;

export type SwitchPaintRole = (typeof switchPaintRoles)[number];

export const switchSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

export type SwitchSurface = (typeof switchSurfaces)[number];

export type SwitchPlacement =
  | {
      readonly slot: "knob";

      readonly over: "on" | "off";
    }
  | {
      readonly slot: "on" | "off";

      readonly over: SwitchSurface;
    };

const switchScale: Readonly<Record<ControlSize, number>> = {
  sm: 0.8,
  md: 1,
  lg: 1.2,
};

export const switchMetricSlots = [
  "width",
  "height",
  "knob",
  "inset",
  "border",
] as const;

export type SwitchMetric = (typeof switchMetricSlots)[number];

const switchMetricRules: Readonly<
  Record<SwitchMetric, "positive" | "nonNegative">
> = {
  width: "positive",
  height: "positive",
  knob: "positive",
  inset: "nonNegative",
  border: "nonNegative",
};

export interface SwitchMetricFailure {
  readonly slot: SwitchMetric;

  readonly value: unknown;

  readonly rule: "finite" | "positive" | "nonNegative" | "fits";

  readonly needs?: number;
}

const drawable = (slot: SwitchMetric, value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  (switchMetricRules[slot] === "positive" ? value > 0 : value >= 0);

const boxNumber = (
  box: SwitchBoxSource,
  slot: SwitchMetric,
): number | undefined => {
  const value: unknown = box[slot];
  return drawable(slot, value) ? value : undefined;
};

const boxValues = (box: SwitchBoxSource): readonly SwitchMetricFailure[] =>
  switchMetricSlots.flatMap((slot): ReadonlyArray<SwitchMetricFailure> => {
    const value: unknown = box[slot];
    return drawable(slot, value)
      ? []
      : [
          {
            slot,
            value,
            rule:
              typeof value === "number" ? switchMetricRules[slot] : "finite",
          },
        ];
  });

const boxFit = (box: SwitchBoxSource): readonly SwitchMetricFailure[] => {
  const width = boxNumber(box, "width");
  const height = boxNumber(box, "height");
  const knob = boxNumber(box, "knob");
  const inset = boxNumber(box, "inset");

  if (
    width === undefined ||
    height === undefined ||
    knob === undefined ||
    inset === undefined
  ) {
    return [];
  }
  const inner = knob + inset * 2;
  return [
    ...(height < inner
      ? [
          {
            slot: "height" as const,
            value: height,
            rule: "fits" as const,
            needs: inner,
          },
        ]
      : []),
    ...(width <= inner
      ? [
          {
            slot: "width" as const,
            value: width,
            rule: "fits" as const,
            needs: inner + 1,
          },
        ]
      : []),
  ];
};

const boxNumbers = (
  box: SwitchBoxSource | null | undefined,
): SwitchMetrics | undefined => {
  if (box === undefined || box === null) {
    return undefined;
  }
  const width = boxNumber(box, "width");
  const height = boxNumber(box, "height");
  const knob = boxNumber(box, "knob");
  const inset = boxNumber(box, "inset");
  const border = boxNumber(box, "border");
  return width === undefined ||
    height === undefined ||
    knob === undefined ||
    inset === undefined ||
    border === undefined
    ? undefined
    : { width, height, knob, inset, border };
};

export function switchMetricsAt(
  metrics: SwitchMetrics,
  size: ControlSize,
): SwitchMetrics;
export function switchMetricsAt(
  metrics: SwitchBoxSource | null | undefined,
  size: ControlSize,
): SwitchMetrics | undefined;
export function switchMetricsAt(
  metrics: SwitchBoxSource | null | undefined,
  size: ControlSize,
): SwitchMetrics | undefined {
  const box = boxNumbers(metrics);
  if (box === undefined) {
    return undefined;
  }
  const scale = switchScale[isControlSize(size) ? size : "md"];
  if (scale === 1) return box;
  const height = Math.round(box.height * scale);
  const inset = Math.round(box.inset * scale);
  return {
    width: Math.round(box.width * scale),
    height,

    knob: Math.max(
      0,
      Math.min(Math.round(box.knob * scale), height - inset * 2),
    ),
    inset,
    border: box.border,
  };
}

const trackEdge = (
  paint: Partial<SwitchColors>,
  track: "on" | "off",
): string | undefined =>
  track === "off"
    ? (declared(paint, "edge") ?? declared(paint, "off"))
    : declared(paint, "on");

const knobRatio = (
  paint: Partial<SwitchColors>,
  track: "on" | "off",
  colors: Partial<ThemeColors>,
): number | undefined => {
  const knob =
    track === "off"
      ? (declared(paint, "knobOff") ?? declared(paint, "knob"))
      : declared(paint, "knob");
  if (track === "on" || declared(paint, "off") !== "transparent")
    return contrastRatio(knob, trackEdge(paint, track));
  const ratios = switchSurfaces.map((surface) =>
    contrastRatio(knob, colors[surface]),
  );
  return ratios.includes(undefined)
    ? undefined
    : Math.min(...ratios.filter((ratio) => ratio !== undefined));
};

export const switchPlacements: readonly SwitchPlacement[] = [
  { slot: "knob", over: "on" },
  { slot: "knob", over: "off" },
  ...switchSurfaces.flatMap(
    (surface): ReadonlyArray<SwitchPlacement> => [
      { slot: "on", over: surface },
      { slot: "off", over: surface },
    ],
  ),
];

export interface InvalidSwitchColor {
  readonly slot: SwitchPaintRole | OptionalSwitchSlot;

  readonly value: string | undefined;
}

export type SwitchPlacementFailure = SwitchPlacement & {
  readonly ratio: number | undefined;

  readonly floor: number;
};

export interface SwitchReport {
  readonly paint: readonly InvalidSwitchColor[];

  readonly placements: readonly SwitchPlacementFailure[];

  readonly metrics: readonly SwitchMetricFailure[];
}

export type SwitchBoxSource = {
  readonly [slot in SwitchMetric]?: unknown;
};

export interface SwitchAuditSource extends ColourSource {
  readonly switch?: Partial<SwitchColors> | null;

  readonly switchMetrics?: SwitchBoxSource | null;
}

const declaredSwitch = (
  theme: Pick<SwitchAuditSource, "switch">,
): Partial<SwitchColors> | undefined => theme.switch ?? undefined;

const declared = (
  paint: Partial<SwitchColors>,
  slot: SwitchPaintRole | OptionalSwitchSlot,
): string | undefined => {
  const value: unknown = paint[slot];
  return typeof value === "string" ? value : undefined;
};

const optionalSwitchSlots = ["edge", "knobOff"] as const;
type OptionalSwitchSlot = (typeof optionalSwitchSlots)[number];

const optionalFailures = (
  paint: Partial<SwitchColors>,
): ReadonlyArray<InvalidSwitchColor> =>
  optionalSwitchSlots.flatMap((slot): ReadonlyArray<InvalidSwitchColor> => {
    const value: unknown = paint[slot];
    return value === undefined || isPaintableColor(value)
      ? []
      : [{ slot, value: typeof value === "string" ? value : undefined }];
  });

const paintFailures = (
  paint: Partial<SwitchColors>,
): ReadonlyArray<InvalidSwitchColor> => [
  ...switchPaintRoles.flatMap(
    (slot): ReadonlyArray<InvalidSwitchColor> =>
      isPaintableColor(declared(paint, slot))
        ? []
        : [{ slot, value: declared(paint, slot) }],
  ),
  ...optionalFailures(paint),
];

export function switchFailures(
  theme: SwitchAuditSource,
  floor: number = decorativeFloor,
): SwitchReport {
  const paint = declaredSwitch(theme);
  const metrics = switchMetricFailures(theme);
  if (paint === undefined) {
    return { paint: [], placements: [], metrics };
  }
  return {
    paint: paintFailures(paint),
    placements: switchPlacements.flatMap(
      (placement): ReadonlyArray<SwitchPlacementFailure> => {
        const ratio =
          placement.slot === "knob"
            ? knobRatio(paint, placement.over, themeColors(theme))
            : contrastRatio(
                trackEdge(paint, placement.slot),
                themeColors(theme)[placement.over],
              );
        return ratio !== undefined && ratio >= floor
          ? []
          : [{ ...placement, ratio, floor }];
      },
    ),
    metrics,
  };
}

export function switchMetricFailures(
  theme: Pick<SwitchAuditSource, "switchMetrics">,
): readonly SwitchMetricFailure[] {
  const box = theme.switchMetrics ?? undefined;
  return box === undefined ? [] : [...boxValues(box), ...boxFit(box)];
}

export function invalidSwitchColors(
  theme: Pick<SwitchAuditSource, "switch">,
): readonly InvalidSwitchColor[] {
  const paint = declaredSwitch(theme);
  return paint === undefined ? [] : paintFailures(paint);
}
