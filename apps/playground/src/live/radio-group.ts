import * as Option from "effect/Option";

export interface RadioChoice {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export const RADIO_IDS = {
  probe: "radio-probe",
  before: "radio-before",
  after: "radio-after",
  pointer: "radio-pointer",
  pointerReadout: "radio-pointer-readout",
  keys: "radio-keys",
  keysReadout: "radio-keys-readout",
  skip: "radio-skip",
  skipReadout: "radio-skip-readout",
  off: "radio-off",
  offReadout: "radio-off-readout",
  plan: "radio-plan",
  planReadout: "radio-plan-readout",
} as const;

export const radioRowId = (group: string, value: string): string =>
  `radio-row-${group}-${value}`;

export const RADIO_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "a1", label: "Aardvark" },
  { value: "b2", label: "Beaver" },
  { value: "g3", label: "Giraffe" },
  { value: "d4", label: "Dolphin" },
];

export const RADIO_SKIP_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "s1", label: "Kestrel" },
  { value: "s2", label: "Heron", disabled: true },
  { value: "s3", label: "Osprey" },
];

export const RADIO_OFF_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "o1", label: "Quartz" },
  { value: "o2", label: "Topaz" },
];

export const RADIO_PLAN_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "p1", label: "Pine" },
  { value: "p2", label: "Plum" },
  { value: "p3", label: "Pear" },
];

export const RADIO_SKIP_INITIAL = "s1";
export const RADIO_SKIP_AFTER = "s3";

export const RADIO_PLAN_VALUE = "p1";

export const RADIO_NONE = "none";

export const RADIO_COLUMN = 250;

export interface RadioState {
  readonly value: string;
  readonly reports: number;
}

export interface PlanState {
  readonly value: string;
  readonly last: string;
  readonly reports: number;
}

export const radioReadout = (state: RadioState): string =>
  `value=${state.value} reports=${state.reports}`;

export const planReadout = (state: PlanState): string =>
  `value=${state.value} last=${state.last} reports=${state.reports}`;

export const fieldOf = (
  readout: string,
  field: string,
): Option.Option<string> =>
  Option.fromNullishOr(
    new RegExp(
      `(?:^|\\s)${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=(\\S*)`,
    ).exec(readout)?.[1],
  );

export const countOf = (
  readout: string,
  field: string,
): Option.Option<number> =>
  Option.map(fieldOf(readout, field), (value) => Number(value));

export const selectionInk = (primary: string): string => primary;

export const isRingWidth = (inkWidth: number, groupWidth: number): boolean =>
  inkWidth > groupWidth / 2;

export const isDiscWidth = (inkWidth: number, groupWidth: number): boolean =>
  inkWidth < groupWidth / 2;

export const RADIO_CHECKS = 39;
