/**
 * The `color-picker-lifecycle` fixture: the two pickers the probe paints, the
 * readout its state prints, and the crops a window's frame is read with.
 *
 * `ColorPicker` makes three claims a renderer suite cannot check. Its six
 * swatches are the **theme's own roles**, so a frame has to paint them; the
 * chosen swatch carries a marker the component builds from the page fill and
 * the body ink, so the marker has to be found on a fill no theme role owns; and
 * a typed hex goes through one normal form on commit, which only the painted
 * preview can confirm. The behaviour suite reads `style.backgroundColor` and
 * `aria-selected`, which say what was asked for.
 *
 * Every paint reading is confined to one cell's **inner** square: a rounded
 * cell's corners show the page, so a count over the whole box would read the
 * marker's own role out of the radius. A quarter inset clears a `radius.md`
 * corner on a `controlHeight.sm` cell and still holds the whole pip.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The six theme roles the picker offers, in the component's own order. */
export const SWATCH_ROLES = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

/** One swatch role. */
export type SwatchRole = (typeof SWATCH_ROLES)[number];

/** The `testId`s the view, the steps and the unit suite share. */
export const COLOR_PICKER_IDS = {
  probe: "color-picker-probe",
  readout: "color-picker-readout",
  enabled: "cp",
  disabled: "dp",
  before: "dp-before",
  after: "dp-after",
} as const;

/** The swatch the picker starts on: the theme's `primary` role. */
export const INITIAL_ROLE: SwatchRole = "primary";

/** The swatch a press chooses. */
export const PRESSED_ROLE: SwatchRole = "accent";

/** The swatch `Space`'s release chooses. */
export const SPACE_ROLE: SwatchRole = "muted";

/** The swatch `Enter`'s press chooses. */
export const ENTER_ROLE: SwatchRole = "destructive";

/** What a reader types into the field, without the `#` (it is optional input). */
export const TYPED_DRAFT = "f0a";

/** The value a typed draft commits: expanded per digit and lowercased. */
export const TYPED_COLOUR = "#ff00aa";

/** A draft the normal form refuses. */
export const INVALID_DRAFT = "zz";

/** Where a cell's inner square begins, as a share of its side. */
export const CELL_INSET = 0.25;

/**
 * The exact pixels a filled cell's inner square paints.
 *
 * A `sm` control cell is 28 points and its inner square 14, so a whole fill is
 * 784 pixels at this host's 2x scale. The floor leaves room for one device row
 * of antialiasing on each edge while staying far above the pip a `sm` spacing
 * disc can paint (a few dozen).
 */
export const SWATCH_INK_FLOOR = 500;

/** What the probe's readout prints. */
export interface ColorPickerState {
  /** The controlled value, in the component's normal form. */
  readonly value: string;
  /** How many times the enabled picker reported a new value. */
  readonly changes: number;
  /** How many times the disabled picker reported one (the refusal count). */
  readonly refused: number;
}

/** The readout: the value, the enabled picker's reports, the disabled one's. */
export const colorPickerReadout = (state: ColorPickerState): string =>
  `value=${state.value} changes=${state.changes} refused=${state.refused}`;

/** The `#rrggbb` a role paints, in the component's normal form. */
export const swatchColour = (
  colours: Readonly<Record<SwatchRole, string>>,
  role: SwatchRole,
): string =>
  Option.getOrElse(
    Option.map(Option.fromNullishOr(colours[role]), (hex) => hex.toLowerCase()),
    () => "",
  );

/** A swatch's address inside a picker. */
export const swatchId = (testId: string, role: SwatchRole): string => {
  const index = Arr.findFirstIndex(
    SWATCH_ROLES,
    (candidate) => candidate === role,
  );
  return `${testId}-swatch-${Option.getOrElse(index, () => -1)}`;
};

/** A picker part's address beside its swatches. */
export const partId = (testId: string, part: "preview" | "hex"): string =>
  `${testId}-${part}`;

/** A painted box, as the runtime's layout report gives it. */
export interface PaintedBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A box's inner square in the capture's device pixels.
 *
 * The inset is the share a rounded corner claims, so the crop holds the fill
 * and the marker and none of the page a radius shows.
 */
export const innerRegion = (
  box: PaintedBox,
  scale: number,
  inset = CELL_INSET,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round((box.x + box.width * inset) * scale),
    y: Math.round((box.y + box.height * inset) * scale),
    width: Math.max(1, Math.round(box.width * (1 - 2 * inset) * scale)),
    height: Math.max(1, Math.round(box.height * (1 - 2 * inset) * scale)),
  });

/** A box's whole rectangle in the capture's device pixels. */
export const boxRegion = (box: PaintedBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.max(1, Math.round(box.width * scale)),
    height: Math.max(1, Math.round(box.height * scale)),
  });

/**
 * The roles whose cells paint `counts`' page ink, in swatch order.
 *
 * A marker is the only page-coloured paint a cell holds, so an empty list is a
 * picker whose value matches no swatch and a one-name list is the chosen
 * swatch — the reading a marker that merely followed the press would fail.
 */
export const markedRoles = (
  counts: ReadonlyArray<number>,
): ReadonlyArray<SwatchRole> =>
  Arr.map(
    Arr.filter(
      Arr.map(SWATCH_ROLES, (role, index) => ({
        role,
        count: counts[index] ?? 0,
      })),
      (cell) => cell.count > 0,
    ),
    (cell) => cell.role,
  );

/**
 * The roles whose cell painted less than a solid fill.
 *
 * The complement of the floor: an empty list is six painted swatches, and a
 * failure names the role that painted nothing rather than a pixel count.
 */
export const unpaintedRoles = (
  counts: ReadonlyArray<number>,
): ReadonlyArray<SwatchRole> => {
  const painted = Arr.filter(
    Arr.map(SWATCH_ROLES, (role, index) => ({
      role,
      count: counts[index] ?? 0,
    })),
    (cell) => cell.count > SWATCH_INK_FLOOR,
  );
  return Arr.filter(
    SWATCH_ROLES,
    (role) => !Arr.some(painted, (cell) => cell.role === role),
  );
};

/**
 * A role list as one scalar, for the runner's equality check.
 *
 * `expectEqual` compares scalars, so the reading is spelled once here rather
 * than in every assertion: an empty string is no role, and two roles print in
 * swatch order.
 */
export const formatRoles = (roles: ReadonlyArray<SwatchRole>): string =>
  Arr.join(roles, ",");

/** The checks the probe asserts on a green run. */
export const COLOR_PICKER_CHECKS = 47;
