/**
 * The value and focus contract behind `OTPField`.
 *
 * A one-time-code field is one string distributed over `length` cells: the
 * code stays contiguous, so a caller never juggles an array. Two facts shape
 * the rules below.
 *
 * The runtime's `<input>` reports the **accumulated** text after an edit, so a
 * paste arrives as one multi-character change while ordinary typing arrives one
 * character at a time. `applyOtpInput` handles both from the cell that was
 * edited. There is no `onPaste` and no caret API in 0.10.0, so the field cannot
 * tell a paste from several fast keystrokes — it does not need to, because the
 * distribution is the same.
 *
 * GPUix also has no `onBeforeInput`: Backspace on a filled cell is the native
 * input's own edit (and arrives through the host `onChange`), while Backspace on an
 * **empty** cell has nothing to delete, so `decideOtpKey` is what clears the
 * cell before it and moves focus there.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** A usable cell count: a whole number, at least one. */
export const otpLength = (length: number): number =>
  Math.max(1, Math.trunc(Number.isFinite(length) ? length : 1));

/**
 * Keep letters and digits, drop separators, truncate to `length`.
 *
 * A code is alphanumeric by contract. Rejecting other characters (rather than
 * guessing at a locale or an escape) mirrors `core/number.ts`'s rule.
 */
export const normalizeOtp = (value: string, length: number): string =>
  Str.takeLeft(otpLength(length))(Str.replace(/[^0-9A-Za-z]/g, "")(value));

/** The value and focus index an edit produces. */
export interface OtpEdit {
  readonly value: string;
  readonly focus: number;
}

/** The compact code as one string per cell, padded with empty cells. */
export const otpCells = (
  value: string,
  length: number,
): ReadonlyArray<string> => {
  const limit = otpLength(length);
  const chars = Arr.fromIterable(normalizeOtp(value, limit));
  return Arr.makeBy(limit, (index) =>
    Option.getOrElse(Arr.get(chars, index), () => ""),
  );
};

/**
 * The one cell `Tab` enters at when the field is not focused.
 *
 * A code is one control, not `length` controls (plan `076`), so only one cell may
 * carry a tab stop: the first empty cell, which is where the next character
 * belongs. A full code leaves the stop on the last cell rather than outside the
 * field. While a cell holds focus the component uses that cell instead.
 */
export const otpTabStop = (value: string, length: number): number =>
  Math.min(Str.length(normalizeOtp(value, length)), otpLength(length) - 1);

/** A cell index clamped into the field. */
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

/**
 * Apply an edit reported by the cell at `index`.
 *
 * A one-character edit replaces that cell and advances; a longer insert fills
 * forward from it, which is exactly what a pasted code needs. An empty edit
 * clears the cell and leaves focus there, because the user is deleting rather
 * than moving on. An edit that carried only characters the field does not keep
 * (a typed separator) is neither: the cell keeps what it held. The code is
 * contiguous: editing a cell beyond its end appends at the end, so a gap can
 * never exist in the value a caller receives.
 */
export const applyOtpInput = (
  current: string,
  index: number,
  text: string,
  length: number,
): OtpEdit => {
  const limit = otpLength(length);
  const cells = otpCells(current, limit);
  const start = Math.min(indexOf(index, limit), Str.length(join(cells)));
  // The runtime appends to what the cell already held, so the reported text can
  // carry the old character with it ("1" + typed "2" reports "12"). Strip that
  // prefix; an unchanged report is left alone so it cannot clear the cell.
  const cell = Option.getOrElse(Arr.get(cells, start), () => "");
  const edited =
    cell !== "" &&
    Str.length(text) > Str.length(cell) &&
    Str.startsWith(cell)(text)
      ? Str.slice(Str.length(cell))(text)
      : text;
  const typed = normalizeOtp(edited, limit);

  if (typed === "") {
    // An empty host report is a deletion. A report that carried only characters
    // the field refuses (a typed separator) is not: the cell keeps its digit.
    if (Str.isNonEmpty(text)) return { value: join(cells), focus: start };
    return { value: join(withCell(cells, start, "")), focus: start };
  }

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

/**
 * The keys the native input does not already answer.
 *
 * Left/Right/Home/End move between cells instead of the caret — each cell holds
 * one character, so a caret has nowhere to go. Backspace is ours only when the
 * cell is empty: otherwise the input deletes its own character and reports it
 * through the host `onChange`, and handling it here too would delete twice.
 */
export const decideOtpKey = (
  current: string,
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
