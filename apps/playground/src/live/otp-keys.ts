/**
 * The keyboard half of `OTPField`, as the probe drives it.
 *
 * The field's header states two window facts that no probe had measured: the
 * native text editor consumes Left/Right/Home/End/Backspace on key **down**, so
 * the field's own navigation runs on key **up**; and a Backspace that already
 * emptied a cell through the native edit must not clear the cell before it as
 * well. The probe types a code into the shipped field and logs both key
 * channels, so the readout can prove which one the arrow arrived on rather than
 * assuming it.
 */
import * as Arr from "effect/Array";
import { otpCells } from "@gpuixui/primitives";

/** The cell count the probe mounts. */
export const OTP_KEYS_LENGTH = 6;

/** Where the window's checks read the fixture. */
export const OTP_KEYS_FIELD = "otp-keys-field";
export const OTP_KEYS_READOUT = "otp-keys-readout";
export const OTP_KEYS_CHANNELS = "otp-keys-channels";

/** The test id of the cell at `index`, as `OTPField` derives it from its own. */
export const otpKeysCellId = (index: number): string =>
  `${OTP_KEYS_FIELD}-cell-${index + 1}`;

/** What the probe's readouts hold: the code and the two key channels. */
export interface OtpKeysState {
  readonly value: string;
  readonly completes: number;
  readonly edits: number;
  readonly down: ReadonlyArray<string>;
  readonly up: ReadonlyArray<string>;
}

/** The code line: the value, the cells the field paints, and the counters. */
export const otpKeysReadout = (state: OtpKeysState): string =>
  `value=${state.value} cells=${Arr.join(
    otpCells(state.value, OTP_KEYS_LENGTH),
    ",",
  )} completes=${state.completes} edits=${state.edits}`;

/** The channel line: what the caller's own handlers saw, in order. */
export const otpKeysChannels = (state: OtpKeysState): string =>
  `down=${Arr.join(state.down, ",")} up=${Arr.join(state.up, ",")}`;
