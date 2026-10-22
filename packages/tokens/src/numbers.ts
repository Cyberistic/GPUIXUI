/**
 * The numeric token contract: a number a theme carries is a value the renderer
 * lays out, and a number it cannot lay out fails in silence.
 *
 * GPUix serialises a style batch with `JSON.stringify` before it reaches native
 * (`@gpuix/native@0.11.0`, `dist/mutations.js`), so `NaN` and `Infinity` become
 * `null` and the property is dropped: the element paints as if it were never
 * set. Measured in the runtime's test renderer, `borderRadius: NaN` beside a
 * valid `borderWidth`, `fontSize` and `backgroundColor` left those three on the
 * element and dropped only the radius. A negative size is accepted rather than
 * dropped and paints nothing a reader can use — `fontSize: -4` laid a text
 * element out at height 0 — so a size that must be positive is held to that.
 *
 * A control height is also the box a pointer presses. The library builds a
 * control at its `controlHeight` and reserves no extra hit area, so a height
 * under `targetSize.minimum` is a target a reader cannot reliably hit — the
 * claim `docs/design-system.md` §6 makes about the shipped presets, held here
 * for a brand's density too.
 *
 * A row height is the same box one step down. A list row is a press target — it
 * takes a `tabIndex`, a press and a hover wash — and a `dense` row is built at
 * exactly `density.rowHeight` (`packages/components/src/list.tsx`), so a theme
 * that shaves the row ships a target under the floor even when every control
 * height is right.
 *
 * A type role carries two numbers that only mean something together: a leading
 * shorter than the role's own size puts the next baseline inside this line's
 * glyph box, so ascenders and descenders collide. A type scale computed from a
 * factor can produce one (`lineHeight: size * 0.9`) and every suite would stay
 * green, so the pair is compared rather than the numbers alone.
 *
 * `invalidColorRoles` covers the values the renderer cannot parse as a colour;
 * this covers the ones it cannot lay out or press.
 */

import type { BoxShadow } from "./elevation.js";
import { targetSize } from "./scale.js";
import type { Theme } from "./theme.js";
import type { TextStyle } from "./typography.js";

/** A group of numeric tokens, in the order the catalogue lists them. */
export type NumberGroup =
  | "spacing"
  | "radius"
  | "borderWidth"
  | "iconSize"
  | "typography"
  | "density"
  | "elevation";

/**
 * What makes a number usable.
 *
 * - `finite` — any real number, including a negative shadow offset;
 * - `nonNegative` — a length that cannot go below zero but may be zero
 *   (`radius.none`, a hairline divider, a shadow with no blur);
 * - `positive` — a size a reader has to see (a type size, an icon), where zero
 *   paints nothing;
 * - `pressable` — a control height or a dense list row, which is also the box a
 *   pointer presses, so it reaches {@link targetSize.minimum}. The library
 *   builds a control at its `controlHeight` and a dense row at its `rowHeight`
 *   with no extra inset, so a shorter one is a target a reader cannot reliably
 *   hit;
 * - `leading` — a type role's line height, which reaches the role's own font
 *   size. Below that the next baseline sits inside this line's glyph box, so the
 *   two lines collide. It is the one rule about two tokens, so it is applied
 *   where the pair sits together ({@link inspectType}) rather than to one value.
 */
export type NumberRule =
  | "finite"
  | "positive"
  | "nonNegative"
  | "pressable"
  | "leading";

/** The rules one value can be measured against on its own. */
type SingleRule = Exclude<NumberRule, "leading">;

/** One numeric token that is not a number the renderer can lay out. */
export interface InvalidNumber {
  /** The group it belongs to, so a failure names the decision that broke. */
  readonly group: NumberGroup;
  /**
   * Its path inside that group: `md` for `radius.md`,
   * `controlHeight.md`, `body.fontSize`, `lg[0].blurRadius`.
   */
  readonly path: string;
  /** The value the theme carries, which may be `NaN` or `Infinity`. */
  readonly value: number;
  /** The rule it missed. */
  readonly rule: NumberRule;
}

/** The fields the number audit reads: every group of a theme except its colours. */
export type NumberSource = Pick<
  Theme,
  | "spacing"
  | "radius"
  | "borderWidth"
  | "iconSize"
  | "typography"
  | "density"
  | "elevation"
>;

/** Whether `value` meets `rule`. */
const layable = (value: number, rule: SingleRule): boolean => {
  if (!Number.isFinite(value)) {
    return false;
  }
  if (rule === "positive") {
    return value > 0;
  }
  if (rule === "pressable") {
    return value >= targetSize.minimum;
  }
  return rule === "finite" || value >= 0;
};

const inspect = (
  group: NumberGroup,
  path: string,
  value: number,
  rule: SingleRule,
): readonly InvalidNumber[] =>
  layable(value, rule) ? [] : [{ group, path, value, rule }];

/**
 * Inspect every number in a record of lengths. A value that is not a number is
 * skipped, because the type scale carries the two family names beside its roles.
 */
const inspectLengths = <Scale extends object>(
  group: NumberGroup,
  scale: Scale,
  rule: SingleRule,
  prefix = "",
): readonly InvalidNumber[] =>
  Object.entries(scale).flatMap(([key, value]) =>
    typeof value === "number"
      ? inspect(group, `${prefix}${key}`, value, rule)
      : [],
  );

const isTextStyle = (value: unknown): value is TextStyle =>
  typeof value === "object" && value !== null && "fontSize" in value;

const isShadowList = (value: unknown): value is readonly BoxShadow[] =>
  Array.isArray(value);

/** The size and leading of every text role, and the leading against its size. */
const inspectType = (
  typography: NumberSource["typography"],
): readonly InvalidNumber[] =>
  Object.entries(typography).flatMap(([role, value]) => {
    if (!isTextStyle(value)) {
      return [];
    }
    const measured = [
      ...inspect("typography", `${role}.fontSize`, value.fontSize, "positive"),
      ...inspect(
        "typography",
        `${role}.lineHeight`,
        value.lineHeight,
        "positive",
      ),
    ];
    // Only comparable when both numbers are usable; an unusable one is already
    // reported by the size check above, and would be reported twice here.
    const collides =
      value.fontSize > 0 &&
      value.lineHeight > 0 &&
      value.lineHeight < value.fontSize;
    return collides
      ? [
          ...measured,
          {
            group: "typography",
            path: `${role}.lineHeight`,
            value: value.lineHeight,
            rule: "leading",
          },
        ]
      : measured;
  });

/** The four numbers a shadow carries. Offsets and spread may be negative. */
const inspectShadow = (
  level: string,
  index: number,
  shadow: BoxShadow,
): readonly InvalidNumber[] => {
  const at = `${level}[${index}].`;
  return [
    ...inspect("elevation", `${at}offsetX`, shadow.offsetX, "finite"),
    ...inspect("elevation", `${at}offsetY`, shadow.offsetY, "finite"),
    ...inspect(
      "elevation",
      `${at}blurRadius`,
      shadow.blurRadius,
      "nonNegative",
    ),
    ...inspect("elevation", `${at}spreadRadius`, shadow.spreadRadius, "finite"),
  ];
};

/**
 * Every numeric token in a theme that the renderer cannot lay out or a pointer
 * cannot press.
 *
 * An empty array means every size, length and shadow a theme carries is one the
 * runtime can paint, every control height and row height is one a reader can hit
 * and every type role's leading reaches its own size. A number
 * that is not finite is dropped rather than clamped, a size at or below zero
 * paints an element no one can find, a control height under
 * {@link targetSize.minimum} is a press target the library's own components do
 * not pad up, the same floor holds a dense list row to `rowHeight`, and a
 * leading shorter than its type stacks the next line into the current one — all
 * reported by path instead of shipping as a default.
 *
 * @example
 * ```ts
 * import { extendTheme, invalidNumbers, lightTheme } from "@gpuixui/tokens";
 *
 * invalidNumbers(extendTheme(lightTheme, { radius: { md: 0 } })); // []
 * invalidNumbers(extendTheme(lightTheme, { radius: { md: Number.NaN } }));
 * // [{ group: "radius", path: "md", value: NaN, rule: "nonNegative" }]
 * invalidNumbers(extendTheme(lightTheme, { density: { controlHeight: { sm: 20 } } }));
 * // [{ group: "density", path: "controlHeight.sm", value: 20, rule: "pressable" }]
 * invalidNumbers(extendTheme(lightTheme, { density: { rowHeight: 20 } }));
 * // [{ group: "density", path: "rowHeight", value: 20, rule: "pressable" }]
 * invalidNumbers(
 *   extendTheme(lightTheme, { typography: { body: { lineHeight: 12 } } }),
 * );
 * // [{ group: "typography", path: "body.lineHeight", value: 12, rule: "leading" }]
 * ```
 */
export function invalidNumbers(theme: NumberSource): readonly InvalidNumber[] {
  return [
    ...inspectLengths("spacing", theme.spacing, "nonNegative"),
    ...inspectLengths("radius", theme.radius, "nonNegative"),
    ...inspectLengths("borderWidth", theme.borderWidth, "nonNegative"),
    ...inspectLengths("iconSize", theme.iconSize, "positive"),
    ...inspectType(theme.typography),
    ...inspectLengths(
      "density",
      theme.density.controlHeight,
      "pressable",
      "controlHeight.",
    ),
    ...inspectLengths(
      "density",
      theme.density.controlPaddingX,
      "nonNegative",
      "controlPaddingX.",
    ),
    ...inspect("density", "rowHeight", theme.density.rowHeight, "pressable"),
    ...Object.entries(theme.elevation).flatMap(([level, shadows]) =>
      isShadowList(shadows)
        ? shadows.flatMap((shadow, index) =>
            inspectShadow(level, index, shadow),
          )
        : [],
    ),
  ];
}
