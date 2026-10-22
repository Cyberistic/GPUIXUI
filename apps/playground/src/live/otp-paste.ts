/**
 * The caller's half of the `OTPField` paste contract, as the probe drives it.
 *
 * The component distributes one multi-character edit forward from the cell that
 * received it, because the pinned runtime publishes no paste event: a pasted
 * code arrives as an ordinary `onChange` carrying the whole clipboard. The probe
 * owns the clipboard source and prints the code the field reports, so the
 * window's assertion is the value a caller receives rather than the field's
 * internal cells. The readout splits that value with the package's own
 * `otpCells`, so it cannot disagree with the cells the field paints.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { otpCells } from "@gpuixui/primitives";

/** The cell count the probe mounts; a one-time code is six digits by default. */
export const OTP_PASTE_LENGTH = 6;

/** Where the window's checks read the fixture. */
export const OTP_PASTE_SOURCE = "otp-paste-source";
export const OTP_PASTE_LONGER = "otp-paste-longer";
export const OTP_PASTE_SOURCE_VALUE = "otp-paste-source-value";
export const OTP_PASTE_LONGER_VALUE = "otp-paste-longer-value";
export const OTP_PASTE_FIELD = "otp-paste-field";
export const OTP_PASTE_READOUT = "otp-paste-readout";

const MARKER_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * A code a mount copies, from the caller's random source.
 *
 * Lowercase letters and digits only: `normalizeOtp` drops every other
 * character, so a marker containing one would measure the filter instead of the
 * paste. The random source is a parameter so a test can pin the sequence.
 * `avoid` keeps the first character out of a set: the probe's longer marker
 * must not begin with the character already in the cell it is pasted over,
 * because `applyOtpInput` strips a reported prefix that matches that cell
 * (the runtime appends a paste to the field's text) and a replacement paste
 * beginning with it would be stripped as if it were typed text.
 */
export const otpPasteMarker = (
  random: () => number,
  length: number = OTP_PASTE_LENGTH,
  avoid: string = "",
): string => {
  const alphabet = Arr.fromIterable(MARKER_ALPHABET);
  const allowed = Arr.filter(
    alphabet,
    (character) => !Str.includes(character)(avoid),
  );
  const pick = (): string =>
    Option.getOrElse(
      Arr.get(alphabet, Math.floor(random() * Arr.length(alphabet))),
      () => "0",
    );
  const first = Option.getOrElse(
    Arr.get(allowed, Math.floor(random() * Math.max(1, Arr.length(allowed)))),
    () => "0",
  );
  return Arr.join(
    Arr.prepend(Arr.makeBy(Math.max(0, length - 1), pick), first),
    "",
  );
};

/** The test id of the cell at `index`, as `OTPField` derives it from its own. */
export const otpPasteCellId = (index: number): string =>
  `${OTP_PASTE_FIELD}-cell-${index + 1}`;

/** What the probe's readout holds: the reported code and the app's counters. */
export interface OtpPasteState {
  readonly value: string;
  readonly completes: number;
  readonly edits: number;
}

/** The `key=value` line the probe's checks assert against. */
export const otpPasteReadout = (state: OtpPasteState): string =>
  `value=${state.value} cells=${Arr.join(
    otpCells(state.value, OTP_PASTE_LENGTH),
    ",",
  )} completes=${state.completes} edits=${state.edits}`;

/**
 * The value a paste that reaches the field's end leaves behind.
 *
 * `current` keeps the cells before `index`; the pasted run fills forward from
 * `index`, truncated to the field's six cells. That is the component's own
 * `applyOtpInput` rule for every paste this probe drives (each one covers the
 * remaining cells), and `otp-paste.test.ts` holds the two together.
 */
export const otpPasteOver = (
  current: string,
  index: number,
  pasted: string,
): string =>
  Str.slice(0, index)(current) + Str.takeLeft(OTP_PASTE_LENGTH - index)(pasted);
