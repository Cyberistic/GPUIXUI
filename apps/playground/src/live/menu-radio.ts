/**
 * The `menu-radio-lifecycle` fixture: an exclusive-choice menu, the state its
 * readout prints, and the colours a window's frame is read with.
 *
 * A radio row's state is a **check mark**, not a layout: the leading slot is a
 * fixed icon column, so the chosen row's box is the same whether it is marked
 * or not. A renderer suite can read `aria-selected` and the mark's accessible
 * name; only a frame says whether the mark's ink is the `primary` role, in the
 * chosen row and nowhere else. That is the reading this fixture exists for.
 *
 * The mark's role is the theme's `primary`, the one ink `MenuCheckMark` paints.
 * The fixture holds no hex of its own so a palette change moves the expectation
 * rather than the probe.
 */
import * as Option from "effect/Option";

/** The `testId`s the view, the steps and the unit suite share. */
export const MENU_RADIO_IDS = {
  probe: "menu-radio-probe",
  readout: "menu-radio-readout",
  trigger: "menu-radio-trigger",
  menu: "menu-radio-menu",
  system: "menu-radio-system",
  light: "menu-radio-light",
  dark: "menu-radio-dark",
} as const;

/** One choice in the menu. */
export interface MenuRadioOption {
  readonly value: string;
  readonly label: string;
  readonly testId: string;
}

/**
 * The three choices, in the order the menu paints them.
 *
 * The first choice is the initial value, so a window can prove the mark starts
 * on it and moves when another row is pressed.
 */
export const MENU_RADIO_OPTIONS: ReadonlyArray<MenuRadioOption> = [
  { value: "system", label: "System", testId: MENU_RADIO_IDS.system },
  { value: "light", label: "Light", testId: MENU_RADIO_IDS.light },
  { value: "dark", label: "Dark", testId: MENU_RADIO_IDS.dark },
];

/** The row the menu opens on. */
export const MENU_RADIO_INITIAL = "system";

/** The row the probe chooses to move the mark. */
export const MENU_RADIO_NEXT = "dark";

/** The locator of the row {@link MENU_RADIO_NEXT} names. */
export const MENU_RADIO_NEXT_ID = MENU_RADIO_IDS.dark;

/** The group's accessible name, and the content's. */
export const MENU_RADIO_LABEL = "Appearance";

/** What the probe's readout prints. */
export interface MenuRadioState {
  /** The caller's chosen value, the group's only truth. */
  readonly value: string;
  /** How many times the caller's `onValueChange` ran. */
  readonly reports: number;
  /** How many times the surface opened. */
  readonly opens: number;
  /** How many times the surface closed. */
  readonly closes: number;
}

/** The readout: the chosen value, then the two counters. */
export const menuRadioReadout = (state: MenuRadioState): string =>
  `value=${state.value} reports=${state.reports} opens=${state.opens} closes=${state.closes}`;

/** The value a window's own state names, or `None` for a blank. */
export const valueOf = (readout: string): Option.Option<string> =>
  Option.fromNullishOr(/^value=(\S+)/.exec(readout)?.[1]);

/** The counter a readout names, or `None` when the field is absent. */
export const counterOf = (
  readout: string,
  field: "reports" | "opens" | "closes",
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(new RegExp(`\\b${field}=(\\d+)`).exec(readout)?.[1]),
    Number,
  );

/** The checks the probe asserts on a green run. */
export const MENU_RADIO_CHECKS = 31;

/** The ink the mark paints: the theme's `primary` role. */
export const markInk = (primary: string): string => primary;

/** A `#rrggbb` colour's channels, or `None` when it is not that shape. */
export const rgbOf = (
  hex: string,
): Option.Option<{
  readonly r: number;
  readonly g: number;
  readonly b: number;
}> => {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  return Option.map(Option.fromNullishOr(match), (parsed) => ({
    r: Number.parseInt(parsed[1] ?? "0", 16),
    g: Number.parseInt(parsed[2] ?? "0", 16),
    b: Number.parseInt(parsed[3] ?? "0", 16),
  }));
};

/**
 * How close a frame's pixel must be to the mark's ink to count as the mark.
 *
 * A 16-point check glyph is a 1.33-point stroke, so no pixel is fully covered:
 * the window's closest pixel measures 82% of the ink over the row's fill, 51
 * away in RGB. The row's own text is 67 away and the fill is further, so 60
 * counts every part of the glyph and neither of the other two paints. The unit
 * suite holds this number to the measured 82% and to the text's distance.
 */
export const MARK_TOLERANCE = 60;

/** The RGB distance between a frame pixel and the mark's ink. */
export const inkDistance = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): number => Math.hypot(r - ink.r, g - ink.g, b - ink.b);

/** Whether a pixel's channels are the mark's ink within {@link MARK_TOLERANCE}. */
export const isMarkInk = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): boolean => inkDistance(r, g, b, ink) <= MARK_TOLERANCE;
