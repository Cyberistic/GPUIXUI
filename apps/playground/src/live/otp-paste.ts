import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { otpCells } from "@gpuixui/primitives";

export const OTP_PASTE_LENGTH = 6;

export const OTP_PASTE_SOURCE = "otp-paste-source";
export const OTP_PASTE_LONGER = "otp-paste-longer";
export const OTP_PASTE_SOURCE_VALUE = "otp-paste-source-value";
export const OTP_PASTE_LONGER_VALUE = "otp-paste-longer-value";
export const OTP_PASTE_FIELD = "otp-paste-field";
export const OTP_PASTE_READOUT = "otp-paste-readout";

const MARKER_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

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

export const otpPasteCellId = (index: number): string =>
  `${OTP_PASTE_FIELD}-cell-${index + 1}`;

export interface OtpPasteState {
  readonly value: string;
  readonly completes: number;
  readonly edits: number;
}

export const otpPasteReadout = (state: OtpPasteState): string =>
  `value=${state.value} cells=${Arr.join(
    otpCells(state.value, OTP_PASTE_LENGTH),
    ",",
  )} completes=${state.completes} edits=${state.edits}`;

export const otpPasteOver = (
  current: string,
  index: number,
  pasted: string,
): string =>
  Str.slice(0, index)(current) + Str.takeLeft(OTP_PASTE_LENGTH - index)(pasted);
