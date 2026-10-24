/**
 * The `radio-group-lifecycle` fixture: the four groups the probe paints, the
 * readouts their state prints, and the ink a window's frame is read with.
 *
 * A radio group's visible state is one filled disc in the chosen row: the box
 * is the theme's `primary` role and the dot inside it the on-colour, so a press
 * changes **paint**, not only React state. The package's suites read
 * `aria-valuetext` and the resolved `StyleDesc`; only a frame says the fill
 * reached the glass, and only the box's width says the keyboard ring around the
 * focused row is a ring rather than another disc.
 *
 * The groups are separate so one measurement cannot borrow another's state:
 * `pointer` is driven by presses, `keys` only by the window's own traversal and
 * keys, `skip` carries a disabled option, `off` is disabled whole, and `plan` is
 * a controlled group whose owner **declines** every choice so the roving base
 * can be read from the values it reports.
 *
 * Every option label is unique across the fixture: `clickText` presses the
 * words a row paints, so two rows named "Alpha" would make one probe press
 * ambiguous.
 */
import * as Option from "effect/Option";

/** One option the fixture lists, named the way the row paints it. */
export interface RadioChoice {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** The `testId`s the view, the steps and the unit suite share. */
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

/**
 * The address of one row's painted label.
 *
 * A shipped `RadioGroup` forwards its `testId` to the group wrapper and gives
 * its rows none, so a window cannot name an option: the fixture lists the rows
 * as `RadioGroupItem` children and names the text each row paints instead.
 */
export const radioRowId = (group: string, value: string): string =>
  `radio-row-${group}-${value}`;

/** The pointer group's four choices, none of them disabled. */
export const RADIO_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "a1", label: "Aardvark" },
  { value: "b2", label: "Beaver" },
  { value: "g3", label: "Giraffe" },
  { value: "d4", label: "Dolphin" },
];

/** The group an arrow has to walk over a disabled choice. */
export const RADIO_SKIP_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "s1", label: "Kestrel" },
  { value: "s2", label: "Heron", disabled: true },
  { value: "s3", label: "Osprey" },
];

/** A group disabled whole: no row takes a press or a key. */
export const RADIO_OFF_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "o1", label: "Quartz" },
  { value: "o2", label: "Topaz" },
];

/** The controlled group whose owner keeps the value it was given. */
export const RADIO_PLAN_CHOICES: ReadonlyArray<RadioChoice> = [
  { value: "p1", label: "Pine" },
  { value: "p2", label: "Plum" },
  { value: "p3", label: "Pear" },
];

/** The value the skip group starts on, and the one an arrow must reach. */
export const RADIO_SKIP_INITIAL = "s1";
export const RADIO_SKIP_AFTER = "s3";

/** The value the declined group's owner keeps, whatever its rows report. */
export const RADIO_PLAN_VALUE = "p1";

/** What a group's readout prints for no reported value yet. */
export const RADIO_NONE = "none";

/** The width every fixture group is laid out at. */
export const RADIO_COLUMN = 250;

/** A group's own state: the value it paints and the reports it made. */
export interface RadioState {
  readonly value: string;
  readonly reports: number;
}

/** A controlled group's state: the value the owner kept and the last report. */
export interface PlanState {
  readonly value: string;
  readonly last: string;
  readonly reports: number;
}

/** The readout: the choice, then how many times the group reported. */
export const radioReadout = (state: RadioState): string =>
  `value=${state.value} reports=${state.reports}`;

/** The declined group's readout: the kept value, the last report, the count. */
export const planReadout = (state: PlanState): string =>
  `value=${state.value} last=${state.last} reports=${state.reports}`;

/**
 * One `key=value` field of a readout, or `None` when the readout has no such
 * field.
 *
 * A field is matched after the start or a space, so `reports=` cannot answer a
 * read for `ports=`; a value may be empty, which is a group that starts with no
 * choice rather than a missing field.
 */
export const fieldOf = (
  readout: string,
  field: string,
): Option.Option<string> =>
  Option.fromNullishOr(
    new RegExp(
      `(?:^|\\s)${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=(\\S*)`,
    ).exec(readout)?.[1],
  );

/** A numeric field of a readout, or `None` when it is absent. */
export const countOf = (
  readout: string,
  field: string,
): Option.Option<number> =>
  Option.map(fieldOf(readout, field), (value) => Number(value));

/** The ink a chosen row paints: the theme's `primary` role, filled whole. */
export const selectionInk = (primary: string): string => primary;

/**
 * Whether a frame box is the keyboard ring rather than the selection disc.
 *
 * The ring is drawn around the whole option row, so it is wider than half the
 * group's box; the disc is one 16-point circle. Both are the same role, so
 * width is the only thing that tells them apart in a frame.
 */
export const isRingWidth = (inkWidth: number, groupWidth: number): boolean =>
  inkWidth > groupWidth / 2;

/** Whether a frame box is the selection disc rather than the ring. */
export const isDiscWidth = (inkWidth: number, groupWidth: number): boolean =>
  inkWidth < groupWidth / 2;

/** The checks the probe asserts on a green run. */
export const RADIO_CHECKS = 39;
