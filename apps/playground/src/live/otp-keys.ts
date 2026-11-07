import * as Arr from "effect/Array";
import { otpCells } from "@gpuixui/primitives";

export const OTP_KEYS_LENGTH = 6;

export const OTP_KEYS_FIELD = "otp-keys-field";
export const OTP_KEYS_READOUT = "otp-keys-readout";
export const OTP_KEYS_CHANNELS = "otp-keys-channels";

export const otpKeysCellId = (index: number): string =>
  `${OTP_KEYS_FIELD}-cell-${index + 1}`;

export interface OtpKeysState {
  readonly value: string;
  readonly completes: number;
  readonly edits: number;
  readonly down: ReadonlyArray<string>;
  readonly up: ReadonlyArray<string>;
}

export const otpKeysReadout = (state: OtpKeysState): string =>
  `value=${state.value} cells=${Arr.join(
    otpCells(state.value, OTP_KEYS_LENGTH),
    ",",
  )} completes=${state.completes} edits=${state.edits}`;

export const otpKeysChannels = (state: OtpKeysState): string =>
  `down=${Arr.join(state.down, ",")} up=${Arr.join(state.up, ",")}`;
