import * as Option from "effect/Option";

export const MENU_RADIO_IDS = {
  probe: "menu-radio-probe",
  readout: "menu-radio-readout",
  trigger: "menu-radio-trigger",
  menu: "menu-radio-menu",
  system: "menu-radio-system",
  light: "menu-radio-light",
  dark: "menu-radio-dark",
} as const;

export interface MenuRadioOption {
  readonly value: string;
  readonly label: string;
  readonly testId: string;
}

export const MENU_RADIO_OPTIONS: ReadonlyArray<MenuRadioOption> = [
  { value: "system", label: "System", testId: MENU_RADIO_IDS.system },
  { value: "light", label: "Light", testId: MENU_RADIO_IDS.light },
  { value: "dark", label: "Dark", testId: MENU_RADIO_IDS.dark },
];

export const MENU_RADIO_INITIAL = "system";

export const MENU_RADIO_NEXT = "dark";

export const MENU_RADIO_NEXT_ID = MENU_RADIO_IDS.dark;

export const MENU_RADIO_LABEL = "Appearance";

export interface MenuRadioState {
  readonly value: string;

  readonly reports: number;

  readonly opens: number;

  readonly closes: number;
}

export const menuRadioReadout = (state: MenuRadioState): string =>
  `value=${state.value} reports=${state.reports} opens=${state.opens} closes=${state.closes}`;

export const valueOf = (readout: string): Option.Option<string> =>
  Option.fromNullishOr(/^value=(\S+)/.exec(readout)?.[1]);

export const counterOf = (
  readout: string,
  field: "reports" | "opens" | "closes",
): Option.Option<number> =>
  Option.map(
    Option.fromNullishOr(new RegExp(`\\b${field}=(\\d+)`).exec(readout)?.[1]),
    Number,
  );

export const MENU_RADIO_CHECKS = 31;

export const markInk = (primary: string): string => primary;

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

export const MARK_TOLERANCE = 60;

export const inkDistance = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): number => Math.hypot(r - ink.r, g - ink.g, b - ink.b);

export const isMarkInk = (
  r: number,
  g: number,
  b: number,
  ink: { readonly r: number; readonly g: number; readonly b: number },
): boolean => inkDistance(r, g, b, ink) <= MARK_TOLERANCE;
