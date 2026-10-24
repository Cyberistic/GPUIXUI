/**
 * The contract for a **declared switch paint**: the one control whose colours a
 * platform style owns.
 *
 * A switch is normally painted from the theme's roles — the accent fill when on,
 * the quiet `muted` track when off, the foreground knob — and the contrast,
 * mark and decorative tables measure every one of those roles where it is
 * painted. Apple's toggle is not: it is green on and grey off whatever the
 * accent is, so `PlatformStyle.switch` carries the platform's own three colours
 * and `Theme.switch` is the half for the resolved mode. Those three values enter
 * a theme through no role, so nothing measured them: a typo paints the runtime's
 * ignored value (black, or the previous paint) and a track equal to its own
 * surface draws a switch a reader cannot find, while every report stays empty.
 *
 * Two jobs are measured, both at {@link decorativeFloor}, because a declared
 * switch is a *look's* paint rather than one of the library's roles:
 *
 * - every declared value is a colour the renderer paints
 *   ({@link invalidSwitchColors} — the grammar `invalidColorRoles` and
 *   `invalidShadowColors` hold the other two authored colour tables to);
 * - the **knob** is perceptible on both tracks and each **track** is
 *   perceptible on the strips a switch sits on ({@link switchPlacements}).
 *
 * The floor is deliberately the perceptibility one and not the 3:1 a state
 * indicator needs. A declared switch is a platform control reproduced, and the
 * platform's own values sit under that bar: Apple's green is 1.98:1 on its page
 * and its white knob 1.24:1 on its off track, with the HIG's drop shadow — which
 * the primitive paints — carrying the knob. A consumer who needs the stronger
 * cue paints the library's accent switch instead of declaring one. What the
 * contract refuses is the switch that is not there at all.
 *
 * The report is one of `auditTheme`'s, so a declared switch a brand edits is
 * held by the gate rather than by a contract a consumer has to remember to run.
 */

import { isPaintableColor, themeColors, type ColourSource } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { isControlSize, type ControlSize } from "./scale.js";
import type { SwitchColors, SwitchMetrics } from "./theme.js";

/**
 * The three values a declared switch carries, in the order a theme writes them:
 * the on track, the off track and the knob that slides between them.
 */
export const switchPaintRoles = ["on", "off", "knob"] as const;

/** One value of a declared switch paint. */
export type SwitchPaintRole = (typeof switchPaintRoles)[number];

/**
 * The strips a switch sits on: the page, a card, a floating surface and a quiet
 * toolbar or sidebar — the same four a field stands on, because a switch is a
 * control too. The `muted` strip is the one that matters most: it is the
 * canonical home of a settings sidebar's switch, and a declared track has no
 * edge to fall back on (the primitive paints the platform's own 51×31 pill with
 * `borderWidth: 0`), so the track's own fill *is* the control's silhouette.
 */
export const switchSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

/** A strip a declared switch's track is painted on. */
export type SwitchSurface = (typeof switchSurfaces)[number];

/**
 * One thing a declared switch's paint is measured against.
 *
 * The two kinds are disjoint: the knob is only ever read on a track, and a track
 * is only ever read on a strip. A placement that named, say, the knob on the
 * page would measure a pair no painter draws, so the table is a union rather
 * than a cross product.
 */
export type SwitchPlacement =
  | {
      /** The knob, measured against the track it sits in. */
      readonly slot: "knob";
      /** The track under the knob. */
      readonly over: "on" | "off";
    }
  | {
      /** A track, measured against the surface the control stands on. */
      readonly slot: "on" | "off";
      /** The strip under the track. */
      readonly over: SwitchSurface;
    };

/** The proportional steps a declared `md` box takes at the other sizes. */
const switchScale: Readonly<Record<ControlSize, number>> = {
  sm: 0.8,
  md: 1,
  lg: 1.2,
};

/** The numbers a declared switch's box carries, in documentation order. */
export const switchMetricSlots = [
  "width",
  "height",
  "knob",
  "inset",
  "border",
] as const;

/** One number of a declared switch's box. */
export type SwitchMetric = (typeof switchMetricSlots)[number];

/**
 * What a box number has to be. The track's width and height and the knob's side
 * are drawn, so zero paints nothing; an inset and an edge may be zero, because a
 * platform's track can sit flush.
 */
const switchMetricRules: Readonly<
  Record<SwitchMetric, "positive" | "nonNegative">
> = {
  width: "positive",
  height: "positive",
  knob: "positive",
  inset: "nonNegative",
  border: "nonNegative",
};

/** A declared switch box the renderer cannot draw, or whose knob it cannot fit. */
export interface SwitchMetricFailure {
  /** Which number of the box. */
  readonly slot: SwitchMetric;
  /**
   * The value the theme carries, or `undefined` when the slot is absent — a
   * stored box older than the slot, which reads as the absence it is.
   */
  readonly value: unknown;
  /** The rule it missed: a drawn size, a length, or the fit of the knob. */
  readonly rule: "finite" | "positive" | "nonNegative" | "fits";
  /**
   * For `fits`, the smallest value the slot must reach: the knob plus both of
   * its insets, so a reader is told what to grow rather than only which pair
   * collides.
   */
  readonly needs?: number;
}

/** One number of a box, when it is a number the renderer can lay out. */
const boxNumber = (
  box: SwitchBoxSource,
  slot: SwitchMetric,
): number | undefined => {
  const value: unknown = box[slot];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

/** Every drawn number of a box, each held to its own rule. */
const boxValues = (box: SwitchBoxSource): readonly SwitchMetricFailure[] =>
  switchMetricSlots.flatMap((slot): ReadonlyArray<SwitchMetricFailure> => {
    const value: unknown = box[slot];
    const rule = switchMetricRules[slot];
    const layable =
      typeof value === "number" &&
      Number.isFinite(value) &&
      (rule === "positive" ? value > 0 : value >= 0);
    return layable
      ? []
      : [{ slot, value, rule: typeof value === "number" ? rule : "finite" }];
  });

/**
 * The knob's fit inside its track.
 *
 * The primitive centres a knob of `knob` pixels in a `height` track and travels
 * it `width - knob - 2 × inset` to the on position (`switchThumbTravel`), so two
 * relations have to hold or the control paints a knob through the pill's edge:
 * the track's height holds the knob and both insets, and its width holds the
 * same plus a pixel for the travel. `inset` is measured from the track's outer
 * edge, so it includes the edge itself — Fluent's 12px knob at a 4px inset is
 * exactly its 20px track.
 */
const boxFit = (box: SwitchBoxSource): readonly SwitchMetricFailure[] => {
  const width = boxNumber(box, "width");
  const height = boxNumber(box, "height");
  const knob = boxNumber(box, "knob");
  const inset = boxNumber(box, "inset");
  // A number the report already named is not compared: the value that has to
  // grow is the one it reported.
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

/**
 * The box a platform switch paints at a control size.
 *
 * `md` is the platform's published control; `sm` and `lg` scale it
 * proportionally, because a platform specifies one switch and a preview that
 * draws a compact or large one must keep its knob inside its track. The knob is
 * fitted to the track's **inner** height — the height less both insets — rather
 * than to the track itself: scaling the knob and the inset apart rounded
 * Adwaita's 18px knob to 22 in a 29px track whose two insets took 8, so its
 * large switch drew the knob one pixel through the pill's edge. The edge is
 * drawn outside that gap, which is why `border` does not enter it.
 *
 * @example
 * ```ts
 * import { platformStyles, switchMetricsAt } from "@gpuixui/tokens";
 *
 * switchMetricsAt(platformStyles.darwin.switchMetrics, "md");
 * // { width: 38, height: 22, knob: 20, inset: 1, border: 0 }
 * ```
 */
export const switchMetricsAt = (
  metrics: SwitchMetrics,
  size: ControlSize,
): SwitchMetrics => {
  const scale = switchScale[isControlSize(size) ? size : "md"];
  if (scale === 1) return metrics;
  const height = Math.round(metrics.height * scale);
  const inset = Math.round(metrics.inset * scale);
  return {
    width: Math.round(metrics.width * scale),
    height,
    // A round knob inside the track's inner height, never taller than it.
    knob: Math.max(
      0,
      Math.min(Math.round(metrics.knob * scale), height - inset * 2),
    ),
    inset,
    border: metrics.border,
  };
};

/**
 * The declared switch paint's silhouette on the strip it stands on.
 *
 * An off track whose fill is transparent is carried by its outline, and a knob
 * on that track is read against the same outline rather than a fill the
 * renderer does not paint.
 */
const trackEdge = (
  paint: Partial<SwitchColors>,
  track: "on" | "off",
): string | undefined =>
  track === "off"
    ? (declared(paint, "edge") ?? declared(paint, "off"))
    : declared(paint, "on");

/**
 * Every placement a declared switch paints: the knob on each track it can sit
 * in, and each track on the four strips a switch stands on.
 */
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

/** A declared switch value the renderer cannot paint. */
export interface InvalidSwitchColor {
  /** Which of the three values, or the off track's optional outline. */
  readonly slot: SwitchPaintRole | "edge";
  /**
   * The value as the theme carries it, or `undefined` when the slot is absent —
   * a stored theme older than the slot, which is a different thing from a typo
   * and reads that way in the report.
   */
  readonly value: string | undefined;
}

/** A declared switch value that cannot be found where it is painted. */
export type SwitchPlacementFailure = SwitchPlacement & {
  /** The measured ratio, or `undefined` when a value could not be measured. */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
};

/** What a declared switch fails, in the three ways it can. */
export interface SwitchReport {
  /** Values the renderer cannot paint, in `switchPaintRoles` order. */
  readonly paint: readonly InvalidSwitchColor[];
  /** Placements too faint to be found, in `switchPlacements` order. */
  readonly placements: readonly SwitchPlacementFailure[];
  /** Box numbers the renderer cannot draw, and knobs its track cannot hold. */
  readonly metrics: readonly SwitchMetricFailure[];
}

/**
 * A switch box as a stored theme hands one back.
 *
 * Each slot is read as the value it is rather than trusted to be a number: JSON
 * has no `undefined`, a store can carry `"38"` where a design tool exported a
 * length, and `null` where a key was dropped. `Theme.switchMetrics` is the
 * authored shape; this is the shape the report is handed.
 */
export type SwitchBoxSource = {
  readonly [slot in SwitchMetric]?: unknown;
};

/**
 * The switch-shaped part of a theme the contract reads.
 *
 * A theme restored from storage writes `null` where it declares no paint — JSON
 * has no `undefined` — so the declaration is read through {@link declaredSwitch}
 * rather than compared to `undefined`. The roles a track is measured against are
 * the colour group's, which is the storage shape {@link ColourSource} names: a
 * strip the theme lost is reported, not thrown.
 */
export interface SwitchAuditSource extends ColourSource {
  /** The declared paint, or nothing for the accent switch. */
  readonly switch?: Partial<SwitchColors> | null;
  /**
   * The box the paint is drawn in. Measured on its own, because a consumer reads
   * it directly through `switchMetricsAt` as well as through the primitive.
   */
  readonly switchMetrics?: SwitchBoxSource | null;
}

/**
 * The paint a theme declares, or `undefined` for the accent switch.
 *
 * A value a store wrote as `null` is the absence it is: the theme declares no
 * paint, so its toggle is the accent family's — the state every shipped base
 * theme is in — rather than a set of slots to measure. Reading it by
 * `=== undefined` handed `null` to the report, which read its first slot off it.
 */
const declaredSwitch = (
  theme: Pick<SwitchAuditSource, "switch">,
): Partial<SwitchColors> | undefined => theme.switch ?? undefined;

/**
 * One declared value, read as the shape a store hands back: JSON has no
 * `undefined`, so a dropped key arrives as `null`, and neither is a colour. The
 * distinction the report keeps is between a *value* that is not a colour (a typo,
 * printed back) and a *slot* that is not there (an absence, printed as such).
 */
const declared = (
  paint: Partial<SwitchColors>,
  slot: SwitchPaintRole | "edge",
): string | undefined => {
  const value: unknown = paint[slot];
  return typeof value === "string" ? value : undefined;
};

/** The off track's outline, when the platform draws one, has to paint too. */
const edgeFailures = (
  paint: Partial<SwitchColors>,
): ReadonlyArray<InvalidSwitchColor> => {
  const value: unknown = paint.edge;
  return value === undefined || isPaintableColor(value)
    ? []
    : [{ slot: "edge", value: typeof value === "string" ? value : undefined }];
};

/** The declared values the renderer cannot paint, in `switchPaintRoles` order. */
const paintFailures = (
  paint: Partial<SwitchColors>,
): ReadonlyArray<InvalidSwitchColor> => [
  ...switchPaintRoles.flatMap(
    (slot): ReadonlyArray<InvalidSwitchColor> =>
      isPaintableColor(declared(paint, slot))
        ? []
        : [{ slot, value: declared(paint, slot) }],
  ),
  ...edgeFailures(paint),
];

/**
 * Measure a declared switch paint and the box it is drawn in.
 *
 * A theme that declares no paint answers with `paint` and `placements` empty:
 * its switch is painted from the accent family, and the roles that switch uses
 * are measured by the mark, contrast and decorative tables like every other
 * role. A box it carries is still measured (`metrics`), because the box is a
 * geometry decision a consumer can read directly through
 * {@link switchMetricsAt}, not a consequence of the paint. A theme that declares
 * a paint is held to {@link invalidSwitchColors}, {@link switchPlacements} and
 * {@link switchMetricFailures}, and a value or a strip the theme does not carry
 * is reported rather than skipped.
 *
 * @example
 * ```ts
 * import { platformTheme, switchFailures, themes } from "@gpuixui/tokens";
 *
 * switchFailures(platformTheme(themes.light, "darwin"));
 * // { paint: [], placements: [], metrics: [] } — Apple's switch is measured where it paints
 * ```
 */
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
        const [top, under] =
          placement.slot === "knob"
            ? [
                declared(paint, "knob"),
                // A transparent off track has no fill to read the knob
                // against; its outline is the surface the knob sits on.
                trackEdge(paint, placement.over),
              ]
            : [
                // An off track whose fill is transparent is carried by its
                // outline, so that is the silhouette measured on the strip.
                trackEdge(paint, placement.slot),
                themeColors(theme)[placement.over],
              ];
        const ratio = contrastRatio(top, under);
        return ratio !== undefined && ratio >= floor
          ? []
          : [{ ...placement, ratio, floor }];
      },
    ),
    metrics,
  };
}

/**
 * The declared switch box the renderer cannot draw, on its own.
 *
 * `switchFailures(theme).metrics` is the same list, for a caller that wants the
 * whole report; this is the check a style author runs after editing a platform's
 * box, beside `invalidSwitchColors`. Five numbers are drawn —
 * `switchMetricSlots`: the track's width and height, the knob's side, the inset
 * it keeps and the edge it may draw — and two relations are measured on top:
 * the track's height holds the knob and both insets, and its width holds the
 * same plus a pixel of travel, so a switch can show its two states. A number the
 * renderer cannot lay out is reported under `finite`, the rule every report
 * keeps for a value a store wrote.
 *
 * A box a theme does not carry answers with nothing: the library's accent switch
 * derives its box from the icon step.
 *
 * @example
 * ```ts
 * import { platformTheme, switchMetricFailures, themes } from "@gpuixui/tokens";
 *
 * const edited = platformTheme(themes.light, "darwin");
 * switchMetricFailures({
 *   ...edited,
 *   switchMetrics: { ...edited.switchMetrics, knob: 30 },
 * });
 * // [{ slot: "height", value: 22, rule: "fits", needs: 32 }]
 * ```
 */
export function switchMetricFailures(
  theme: Pick<SwitchAuditSource, "switchMetrics">,
): readonly SwitchMetricFailure[] {
  const box = theme.switchMetrics ?? undefined;
  return box === undefined ? [] : [...boxValues(box), ...boxFit(box)];
}

/**
 * The declared switch values the renderer cannot paint, on their own.
 *
 * `switchFailures(theme).paint` is the same list, for a caller that wants both
 * halves; this is the check a style author runs after editing a platform's
 * toggle, beside `invalidColorRoles` and `invalidShadowColors`.
 *
 * @example
 * ```ts
 * import { invalidSwitchColors, platformTheme, themes } from "@gpuixui/tokens";
 *
 * const edited = platformTheme(themes.light, "darwin");
 * invalidSwitchColors({
 *   ...edited,
 *   switch: { ...edited.switch, off: "#E9E9E" },
 * });
 * // [{ slot: "off", value: "#E9E9E" }]
 * ```
 */
export function invalidSwitchColors(
  theme: Pick<SwitchAuditSource, "switch">,
): readonly InvalidSwitchColor[] {
  const paint = declaredSwitch(theme);
  return paint === undefined ? [] : paintFailures(paint);
}
