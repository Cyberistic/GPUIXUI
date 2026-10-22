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
 * A row height is the same box one step down. A list row is a press target —
 * every row answers a press, and a selectable one also takes a `tabIndex` and a
 * hover wash — while a `dense` row is built at exactly `density.rowHeight`
 * (`packages/components/src/list.tsx`), so a theme that shaves the row ships a
 * target under the floor even when every control height is right.
 *
 * A type role carries two numbers that only mean something together: a leading
 * shorter than the role's own size puts the next baseline inside this line's
 * glyph box, so ascenders and descenders collide. A type scale computed from a
 * factor can produce one (`lineHeight: size * 0.9`) and every suite would stay
 * green, so the pair is compared rather than the numbers alone.
 *
 * The type scale also carries a pair of roles, not two rungs: `bodyStrong` is
 * `body`'s emphasis, painted where a line has to stand out at the same size
 * (`Text role="bodyStrong"`, a card's title). The pair is designed at one size
 * and one leading (14/20) and differs by weight, so all three numbers are
 * compared. A brand that forwards one stored weight to every role paints the
 * emphasis exactly like the text it lifts; a brand that raises the body size and
 * leaves the strong role behind paints a card title smaller than the copy under
 * it. Both keep every number finite, positive and ordered, so only the pair
 * sees either.
 *
 * A control height is the other pair across groups: the box is exactly
 * `density.controlHeight[size]` and the text inside it is laid at
 * `typography.label`'s or `typography.body`'s leading, so a brand that grows its
 * type without growing the box (or shaves the box while keeping its type) paints
 * a label taller than the control that carries it. Every number stays finite,
 * positive and pressable, so nothing else sees it.
 *
 * The box carries a drawing as well as a line: an `Icon` defaults to `md`, the
 * selection boxes and a spinner's dot are drawn at the same step
 * (`packages/icons/src/icon.tsx`, `packages/primitives/src/components/Spinner.tsx`),
 * and an `IconButton` is a square at its control height. A brand that grows the
 * icon scale without growing the controls paints a glyph taller than the box it
 * is centred in, which clips or overflows an action — again with every number
 * finite, positive, ordered and pressable.
 *
 * A zero `borderWidth.strong` is the same class one role over: that width is the
 * width of **both** focus rings — `keyboardFocusRing`'s outline and
 * `focusRing`'s spread — and the ring's colour is measured against the fills it
 * hugs, so a brand can keep every colour report clean while the focus cue paints
 * nothing. The decorative `thin` divider may be zero; the strong width may not.
 *
 * A type role carries three numbers, and the third was inspected by nothing:
 * `fontWeight` is a positive real number the runtime clamps into its 1–1000
 * range, so a weight the theme computes to `NaN`/`Infinity` is serialised as
 * `null`, dropped, and the role paints at the runtime's default weight — a
 * heading silently loses its emphasis while every other number is usable. The
 * weight is read as `finite` rather than as one of the four steps the type
 * declares: the runtime accepts any number in its range, so a variable font's
 * 450 is a design choice, and only a value that cannot survive the batch is the
 * report's business.
 *
 * `invalidColorRoles` covers the values the renderer cannot parse as a colour;
 * this covers the ones it cannot lay out or press.
 */

import type { BoxShadow, Elevation } from "./elevation.js";
import { controlSizes, targetSize, type ControlSize } from "./scale.js";
import type { Theme } from "./theme.js";
import type { TextRole, Typography } from "./typography.js";

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
 * - `finite` — any real number, including a negative shadow offset, and a font
 *   weight, which the runtime clamps into its 1–1000 range: only a value the
 *   serialised batch drops (`NaN`, `Infinity`) is unusable there;
 * - `nonNegative` — a length that cannot go below zero but may be zero
 *   (`radius.none`, a hairline divider, a shadow with no blur);
 * - `positive` — a size a reader has to see (a type size, an icon, the strong
 *   border that is the focus ring's width), where zero paints nothing;
 * - `pressable` — a control height or a dense list row, which is also the box a
 *   pointer presses, so it reaches {@link targetSize.minimum}. The library
 *   builds a control at its `controlHeight` and a dense row at its `rowHeight`
 *   with no extra inset, so a shorter one is a target a reader cannot reliably
 *   hit;
 * - `leading` — a type role's line height, which reaches the role's own font
 *   size. Below that the next baseline sits inside this line's glyph box, so the
 *   two lines collide. It is a rule about two tokens, so it is applied
 *   where the pair sits together ({@link inspectType}) rather than to one value;
 * - `fits` — a control height, which contains the leading of the tallest type
 *   role a control paints (`label` or `body`) and the icon it draws
 *   (`iconSize.md`). The box is exactly `density.controlHeight[size]` and both
 *   painters lay their text at that leading, so a box below it clips or spills
 *   the label while every number is finite, positive and pressable; the same box
 *   is a square action's icon, so a glyph taller than it overflows the control.
 *   Reported on the height, the number that has to grow, and only once: a height
 *   that already misses the pressable floor is reported as `pressable`.
 * - `emphasis` — the pair `bodyStrong` and `body`: the strong role's size and
 *   leading equal the body's, and its weight exceeds it. The two roles are one
 *   emphasis at one size (14/20): a brand that forwards one weight to every role
 *   paints them identically, and a brand that raises the body's size or leading
 *   alone paints the role meant to stand out smaller or looser than the copy it
 *   lifts. Reported on the strong role, the number that has to change, and
 *   applied where the pair sits together ({@link inspectEmphasis}) because it is
 *   about two roles.
 */
export type NumberRule =
  | "finite"
  | "positive"
  | "nonNegative"
  | "pressable"
  | "leading"
  | "fits"
  | "emphasis";

/** The rules one value can be measured against on its own. */
type SingleRule = Exclude<NumberRule, "leading" | "fits" | "emphasis">;

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

/** The numbers one type role carries, in the shape a stored theme can carry them. */
interface TextStyleNumbers {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: number;
}

/**
 * The type scale as the report reads it. The families are dropped to the two
 * names it needs, and each role's numbers are opened to `number` rather than
 * the declared `FontWeight` union: the report exists for a theme restored from
 * storage, which is exactly a theme carrying a weight the type cannot express.
 */
type TypographyNumbers = Omit<Typography, TextRole> & {
  readonly [role in TextRole]: TextStyleNumbers;
};

/** The fields the number audit reads: every group of a theme except its colours. */
export type NumberSource = Pick<
  Theme,
  "spacing" | "radius" | "borderWidth" | "iconSize" | "density"
> & {
  /** Opened so a stored weight the type cannot express is still inspected. */
  readonly typography: TypographyNumbers;
  /**
   * A level the theme does not carry is the shadow report's business
   * (`invalidShadowColors`), not a number this report can inspect, so a stored
   * theme older than a level is measured over the levels it has.
   */
  readonly elevation: Partial<Elevation>;
};

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

/**
 * Every border width, each held to its own rule. `thin` is a decorative divider
 * a surface may drop to zero; `strong` is the width of both focus rings, so a
 * zero there removes the only cue keyboard focus has.
 */
const inspectBorderWidths = (
  borderWidth: NumberSource["borderWidth"],
): readonly InvalidNumber[] => [
  ...inspect("borderWidth", "thin", borderWidth.thin, "nonNegative"),
  ...inspect("borderWidth", "strong", borderWidth.strong, "positive"),
];

/** The size and leading of every text role, the leading against its size, and the weight. */
const isTextStyle = (value: unknown): value is TextStyleNumbers =>
  typeof value === "object" && value !== null && "fontSize" in value;

const isShadowList = (value: unknown): value is readonly BoxShadow[] =>
  Array.isArray(value);

/** Every number a text role carries, and the two comparisons between them. */
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
      ...inspect(
        "typography",
        `${role}.fontWeight`,
        value.fontWeight,
        "finite",
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

/**
 * The one pair of type roles that differ by weight alone. `bodyStrong` is
 * `body` at the same size and leading, so the weight is the whole difference
 * between reading and emphasis — a card title, a lead-in, a line a reader is
 * meant to notice. All three numbers are compared: a brand that forwards one
 * weight to every role draws both roles identically, and a brand that raises the
 * body's size or leading alone leaves the strong role behind. Both keep every
 * size, leading and weight layable, so nothing else sees either.
 */
const inspectEmphasis = (
  typography: NumberSource["typography"],
): readonly InvalidNumber[] => {
  const { body, bodyStrong } = typography;
  // An unusable number is already the single-value report's: comparing it would
  // report one broken value twice, under a rule that says nothing about it. A
  // leading inside its own glyph box is the same — the `leading` rule owns that
  // line — so the pair compares only leadings that are decisions.
  const usable = (value: number): boolean =>
    Number.isFinite(value) && value > 0;
  const reaching = (role: TextStyleNumbers): boolean =>
    usable(role.fontSize) &&
    usable(role.lineHeight) &&
    role.lineHeight >= role.fontSize;
  const shared = (
    path: "fontSize" | "lineHeight",
    comparable: boolean,
  ): readonly InvalidNumber[] => {
    const bodyValue = body[path];
    const strongValue = bodyStrong[path];
    return !comparable || bodyValue === strongValue
      ? []
      : [
          {
            group: "typography",
            path: `bodyStrong.${path}`,
            value: strongValue,
            rule: "emphasis",
          },
        ];
  };
  const outweighs =
    !Number.isFinite(body.fontWeight) ||
    !Number.isFinite(bodyStrong.fontWeight) ||
    bodyStrong.fontWeight > body.fontWeight
      ? []
      : [
          {
            group: "typography",
            path: "bodyStrong.fontWeight",
            value: bodyStrong.fontWeight,
            rule: "emphasis",
          } satisfies InvalidNumber,
        ];
  return [
    ...shared("fontSize", usable(body.fontSize) && usable(bodyStrong.fontSize)),
    ...shared("lineHeight", reaching(body) && reaching(bodyStrong)),
    ...outweighs,
  ];
};

/**
 * The ceiling a control's box has to contain: the taller of the two type roles a
 * control paints and the icon a control draws. A button, a toggle and a select
 * trigger lay their text at `typography.label`'s leading; a field lays its value
 * at `typography.body`'s (`packages/primitives/src/core/style.ts`'s
 * `controlStyle` and `fieldTextStyle`); an `Icon` defaults to `iconSize.md`
 * (`packages/icons/src/icon.tsx`), which is also the step a selection box, a
 * spinner's dot and a menu row's leading slot are drawn at, so the box is a
 * square action's glyph as well as a line of text. An unusable leading is the
 * type report's, and an unusable icon the icon report's, not this one's.
 */
const controlContent = (
  typography: NumberSource["typography"],
  iconSize: NumberSource["iconSize"],
): number | undefined => {
  const parts = [
    typography.label.lineHeight,
    typography.body.lineHeight,
    iconSize.md,
  ];
  return parts.every(Number.isFinite) ? Math.max(...parts) : undefined;
};

/**
 * Every control height, held to the pressable floor and to what it carries. A
 * height that is not pressable is reported once, by that rule; the fit is
 * measured only on a height a pointer can already press, so one shrunken box is
 * not two defects.
 */
const inspectControlHeights = (
  density: NumberSource["density"],
  typography: NumberSource["typography"],
  iconSize: NumberSource["iconSize"],
): readonly InvalidNumber[] =>
  controlSizes.flatMap((size: ControlSize) => {
    const value = density.controlHeight[size];
    const pressable = inspect(
      "density",
      `controlHeight.${size}`,
      value,
      "pressable",
    );
    if (pressable.length > 0) {
      return pressable;
    }
    const content = controlContent(typography, iconSize);
    return content === undefined || value >= content
      ? []
      : [
          {
            group: "density",
            path: `controlHeight.${size}`,
            value,
            rule: "fits",
          },
        ];
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
 * runtime can paint, every control height and row height is one a reader can hit,
 * every control height contains the text and the icon it carries, every type
 * role's leading reaches its own size, and the strong body role outweighs the
 * body it emphasises. A number
 * that is not finite is dropped rather than clamped, a size at or below zero
 * paints an element no one can find, a control height under
 * {@link targetSize.minimum} is a press target the library's own components do
 * not pad up, the same floor holds a dense list row to `rowHeight`, a leading
 * shorter than its type stacks the next line into the current one, a control
 * height below the leading of the label or value it paints — or below the
 * `iconSize.md` glyph it draws — clips the text or the icon, a
 * zero `borderWidth.strong` leaves the focus ring nothing to paint, a
 * `bodyStrong` that does not share `body`'s size and leading or does not weigh
 * more than it paints an emphasis as plain reading or as a smaller title, and a
 * text role's `fontWeight` that is not finite is dropped so the role paints at
 * the runtime's default weight — all
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
 * invalidNumbers(
 *   extendTheme(lightTheme, {
 *     density: "compact",
 *     typography: { body: { lineHeight: 26 } },
 *   }),
 * );
 * // [{ group: "density", path: "controlHeight.sm", value: 24, rule: "fits" }]
 * invalidNumbers(
 *   extendTheme(lightTheme, {
 *     density: "compact",
 *     iconSize: { md: 26, lg: 28, xl: 30 },
 *   }),
 * );
 * // [{ group: "density", path: "controlHeight.sm", value: 24, rule: "fits" }]
 * invalidNumbers(
 *   extendTheme(lightTheme, { typography: { bodyStrong: { fontWeight: 400 } } }),
 * );
 * // [{ group: "typography", path: "bodyStrong.fontWeight", value: 400, rule: "emphasis" }]
 * invalidNumbers(extendTheme(lightTheme, { borderWidth: { strong: 0 } }));
 * // [{ group: "borderWidth", path: "strong", value: 0, rule: "positive" }]
 * const stored = {
 *   ...lightTheme,
 *   typography: {
 *     ...lightTheme.typography,
 *     h1: { ...lightTheme.typography.h1, fontWeight: Number.NaN },
 *   },
 * };
 * invalidNumbers(stored);
 * // [{ group: "typography", path: "h1.fontWeight", value: NaN, rule: "finite" }]
 * ```
 */
export function invalidNumbers(theme: NumberSource): readonly InvalidNumber[] {
  return [
    ...inspectLengths("spacing", theme.spacing, "nonNegative"),
    ...inspectLengths("radius", theme.radius, "nonNegative"),
    ...inspectBorderWidths(theme.borderWidth),
    ...inspectLengths("iconSize", theme.iconSize, "positive"),
    ...inspectType(theme.typography),
    ...inspectEmphasis(theme.typography),
    ...inspectControlHeights(theme.density, theme.typography, theme.iconSize),
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
