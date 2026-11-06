import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { storedNumber, storedText } from "./stored.js";

export const otpLength = (length: number): number =>
  Math.max(1, Math.trunc(Number.isFinite(length) ? length : 1));

export const DEFAULT_OTP_LENGTH = 6;

export const otpCellCount = (length: unknown): number =>
  Option.match(storedNumber(length), {
    onNone: () => DEFAULT_OTP_LENGTH,
    onSome: otpLength,
  });

export const normalizeOtp = (value: unknown, length: number): string =>
  Str.takeLeft(otpLength(length))(
    Str.replace(/[^0-9A-Za-z]/g, "")(storedText(value) ?? ""),
  );

export interface OtpEdit {
  readonly value: string;
  readonly focus: number;
}

export const otpCells = (
  value: unknown,
  length: number,
): ReadonlyArray<string> => {
  const limit = otpLength(length);
  const chars = Arr.fromIterable(normalizeOtp(value, limit));
  return Arr.makeBy(limit, (index) =>
    Option.getOrElse(Arr.get(chars, index), () => ""),
  );
};

const indexOf = (index: number, length: number): number =>
  Math.min(
    otpLength(length) - 1,
    Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0),
  );

const join = (cells: ReadonlyArray<string>): string => Arr.join(cells, "");

const withCell = (
  cells: ReadonlyArray<string>,
  index: number,
  char: string,
): ReadonlyArray<string> =>
  Arr.map(cells, (cell, at) => (at === index ? char : cell));

export const applyOtpInput = (
  current: unknown,
  index: number,
  text: string,
  length: number,
): OtpEdit => {
  const limit = otpLength(length);
  const cells = otpCells(current, limit);
  const start = Math.min(indexOf(index, limit), Str.length(join(cells)));

  const cell = Option.getOrElse(Arr.get(cells, start), () => "");
  const edited =
    cell !== "" &&
    Str.length(text) > Str.length(cell) &&
    Str.startsWith(cell)(text)
      ? Str.slice(Str.length(cell))(text)
      : text;
  const typed = normalizeOtp(edited, limit);

  if (typed === "")
    return { value: join(withCell(cells, start, "")), focus: start };

  if (Str.length(typed) === 1) {
    return {
      value: join(withCell(cells, start, typed)),
      focus: Math.min(limit - 1, start + 1),
    };
  }

  const inserted = Arr.fromIterable(typed);
  const next = Arr.map(cells, (cell, at) =>
    at >= start && at - start < Arr.length(inserted)
      ? Option.getOrElse(Arr.get(inserted, at - start), () => cell)
      : cell,
  );
  return {
    value: join(next),
    focus: Math.min(limit - 1, start + Arr.length(inserted)),
  };
};

export const otpEmptiedCell = (
  before: unknown,
  after: unknown,
  index: number,
  length: number,
): boolean => {
  const limit = otpLength(length);
  const at = indexOf(index, limit);
  const cell = (value: unknown): string =>
    Option.getOrElse(Arr.get(otpCells(value, limit), at), () => "");
  return cell(before) !== "" && cell(after) === "";
};

export const decideOtpKey = (
  current: unknown,
  index: number,
  key: string,
  length: number,
): Option.Option<OtpEdit> => {
  const limit = otpLength(length);
  const cells = otpCells(current, limit);
  const at = indexOf(index, limit);
  const value = join(cells);
  const moveTo = (target: number): Option.Option<OtpEdit> =>
    target === at ? Option.none() : Option.some({ value, focus: target });

  if (key === "left") return moveTo(Math.max(0, at - 1));
  if (key === "right") return moveTo(Math.min(limit - 1, at + 1));
  if (key === "home") return moveTo(0);
  if (key === "end") return moveTo(limit - 1);
  if (key !== "backspace") return Option.none();

  const filled = Option.getOrElse(Arr.get(cells, at), () => "") !== "";
  if (filled || at === 0) return Option.none();
  return Option.some({
    value: join(withCell(cells, at - 1, "")),
    focus: at - 1,
  });
};
