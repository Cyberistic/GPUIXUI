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
 */

import { isPaintableColor, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import type { SwitchColors } from "./theme.js";

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
  /** Which of the three values. */
  readonly slot: SwitchPaintRole;
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

/** What a declared switch's paint fails, in the two ways it can. */
export interface SwitchReport {
  /** Values the renderer cannot paint, in `switchPaintRoles` order. */
  readonly paint: readonly InvalidSwitchColor[];
  /** Placements too faint to be found, in `switchPlacements` order. */
  readonly placements: readonly SwitchPlacementFailure[];
}

/** The switch-shaped part of a theme the contract reads. */
export interface SwitchAuditSource {
  /** The roles a track is measured against; a strip the theme lost is reported. */
  readonly colors: Partial<ThemeColors>;
  /** The declared paint, or nothing for the accent switch. */
  readonly switch?: Partial<SwitchColors>;
}

/**
 * One declared value, read as the shape a store hands back: JSON has no
 * `undefined`, so a dropped key arrives as `null`, and neither is a colour. The
 * distinction the report keeps is between a *value* that is not a colour (a typo,
 * printed back) and a *slot* that is not there (an absence, printed as such).
 */
const declared = (
  paint: Partial<SwitchColors>,
  slot: SwitchPaintRole,
): string | undefined => {
  const value: unknown = paint[slot];
  return typeof value === "string" ? value : undefined;
};

/** The declared values the renderer cannot paint, in `switchPaintRoles` order. */
const paintFailures = (
  paint: Partial<SwitchColors>,
): ReadonlyArray<InvalidSwitchColor> =>
  switchPaintRoles.flatMap(
    (slot): ReadonlyArray<InvalidSwitchColor> =>
      isPaintableColor(declared(paint, slot))
        ? []
        : [{ slot, value: declared(paint, slot) }],
  );

/**
 * Measure a declared switch paint.
 *
 * A theme that declares none answers with an empty report: its switch is painted
 * from the accent family, and the roles that switch uses are measured by the
 * mark, contrast and decorative tables like every other role. A theme that
 * declares one is held to {@link invalidSwitchColors} and
 * {@link switchPlacements}, and a value or a strip the theme does not carry is
 * reported rather than skipped.
 *
 * @example
 * ```ts
 * import { platformTheme, switchFailures, themes } from "@gpuixui/tokens";
 *
 * switchFailures(platformTheme(themes.light, "darwin"));
 * // { paint: [], placements: [] } — Apple's switch is measured where it paints
 * ```
 */
export function switchFailures(
  theme: SwitchAuditSource,
  floor: number = decorativeFloor,
): SwitchReport {
  const paint = theme.switch;
  if (paint === undefined) {
    return { paint: [], placements: [] };
  }
  return {
    paint: paintFailures(paint),
    placements: switchPlacements.flatMap(
      (placement): ReadonlyArray<SwitchPlacementFailure> => {
        const [top, under] =
          placement.slot === "knob"
            ? [declared(paint, "knob"), declared(paint, placement.over)]
            : [declared(paint, placement.slot), theme.colors[placement.over]];
        const ratio = contrastRatio(top, under);
        return ratio !== undefined && ratio >= floor
          ? []
          : [{ ...placement, ratio, floor }];
      },
    ),
  };
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
  return theme.switch === undefined ? [] : paintFailures(theme.switch);
}
