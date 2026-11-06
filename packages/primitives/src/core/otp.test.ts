import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  applyOtpInput,
  decideOtpKey,
  DEFAULT_OTP_LENGTH,
  normalizeOtp,
  otpEmptiedCell,
  otpCellCount,
  otpCells,
  otpLength,
} from "./otp.js";

describe("otpCellCount", () => {
  it("draws the documented six cells for a length that is not a number", () => {
    expect(otpCellCount("4")).toBe(DEFAULT_OTP_LENGTH);
    expect(otpCellCount(null)).toBe(DEFAULT_OTP_LENGTH);
    expect(otpCellCount(undefined)).toBe(DEFAULT_OTP_LENGTH);
    expect(otpCellCount({ cells: 4 })).toBe(DEFAULT_OTP_LENGTH);
  });

  it("keeps a real count, and one that cannot be laid out as one cell", () => {
    expect(otpCellCount(4)).toBe(4);
    expect(otpCellCount(0)).toBe(1);
    expect(otpCellCount(Number.NaN)).toBe(1);
    expect(otpCellCount(2.7)).toBe(2);
  });
});

describe("normalizeOtp", () => {
  it("keeps letters and digits and drops separators", () => {
    expect(normalizeOtp("12-34 56", 6)).toBe("123456");
    expect(normalizeOtp("ab12", 4)).toBe("ab12");
  });

  it("reads a stored code that is not text as no code", () => {
    expect(normalizeOtp(123456, 6)).toBe("");
    expect(normalizeOtp(0, 6)).toBe("");
    expect(normalizeOtp(true, 6)).toBe("");
    expect(normalizeOtp({ code: "123456" }, 6)).toBe("");
    expect(normalizeOtp(null, 6)).toBe("");
    expect(normalizeOtp(undefined, 6)).toBe("");
  });

  it("truncates to the field and tolerates a nonsense length", () => {
    expect(normalizeOtp("1234567", 6)).toBe("123456");
    expect(otpLength(0)).toBe(1);
    expect(otpLength(Number.NaN)).toBe(1);
    expect(normalizeOtp("123", 0)).toBe("1");
  });
});

describe("otpCells", () => {
  it("pads the code to one entry per cell", () => {
    expect(otpCells("12", 4)).toStrictEqual(["1", "2", "", ""]);
    expect(otpCells("", 3)).toStrictEqual(["", "", ""]);
    expect(otpCells("abcdef", 3)).toStrictEqual(["a", "b", "c"]);
  });

  it("pads a stored code that is not text to empty cells", () => {
    expect(otpCells(123456, 3)).toStrictEqual(["", "", ""]);
    expect(otpCells(null, 2)).toStrictEqual(["", ""]);
  });
});

describe("applyOtpInput", () => {
  it("replaces the cell on a one-character edit and advances", () => {
    expect(applyOtpInput("1", 0, "7", 4)).toStrictEqual({
      value: "7",
      focus: 1,
    });
    expect(applyOtpInput("1234", 1, "8", 4)).toStrictEqual({
      value: "1834",
      focus: 2,
    });
  });

  it("strips the character the runtime accumulated in the edited cell", () => {
    expect(applyOtpInput("1", 0, "12", 4)).toStrictEqual({
      value: "2",
      focus: 1,
    });
    expect(applyOtpInput("1", 0, "1234", 6)).toStrictEqual({
      value: "234",
      focus: 3,
    });
  });

  it("leaves an unchanged report alone instead of clearing the cell", () => {
    expect(applyOtpInput("12", 0, "1", 4)).toStrictEqual({
      value: "12",
      focus: 1,
    });
  });

  it("fills forward from a multi-character insert", () => {
    expect(applyOtpInput("", 0, "123456", 6)).toStrictEqual({
      value: "123456",
      focus: 5,
    });
    expect(applyOtpInput("12", 1, "9876", 6)).toStrictEqual({
      value: "19876",
      focus: 5,
    });
  });

  it("never grows past the field or reaches beyond the last cell", () => {
    expect(applyOtpInput("", 0, "123456789", 4)).toStrictEqual({
      value: "1234",
      focus: 3,
    });
    expect(applyOtpInput("12", 3, "9", 4)).toStrictEqual({
      value: "129",
      focus: 3,
    });
  });

  it("clears the edited cell and stays there on an empty edit", () => {
    expect(applyOtpInput("123", 1, "", 4)).toStrictEqual({
      value: "13",
      focus: 1,
    });
  });
});

describe("decideOtpKey", () => {
  it("moves between cells with the arrows and jumps with Home/End", () => {
    expect(decideOtpKey("12", 0, "right", 4)).toStrictEqual(
      Option.some({ value: "12", focus: 1 }),
    );
    expect(decideOtpKey("12", 1, "left", 4)).toStrictEqual(
      Option.some({ value: "12", focus: 0 }),
    );
    expect(decideOtpKey("12", 2, "home", 4)).toStrictEqual(
      Option.some({ value: "12", focus: 0 }),
    );
    expect(decideOtpKey("12", 0, "end", 4)).toStrictEqual(
      Option.some({ value: "12", focus: 3 }),
    );
  });

  it("does nothing at the ends or for a key that is not ours", () => {
    expect(decideOtpKey("12", 0, "left", 4)).toStrictEqual(Option.none());
    expect(decideOtpKey("12", 3, "right", 4)).toStrictEqual(Option.none());
    expect(decideOtpKey("12", 1, "a", 4)).toStrictEqual(Option.none());
    expect(decideOtpKey("12", 1, "enter", 4)).toStrictEqual(Option.none());
  });

  it("clears the previous cell on Backspace in an empty one", () => {
    expect(decideOtpKey("123", 3, "backspace", 4)).toStrictEqual(
      Option.some({ value: "12", focus: 2 }),
    );
  });

  it("leaves Backspace on a filled cell to the native input", () => {
    expect(decideOtpKey("123", 1, "backspace", 4)).toStrictEqual(Option.none());
    expect(decideOtpKey("", 0, "backspace", 4)).toStrictEqual(Option.none());
  });
});

describe("otpEmptiedCell", () => {
  it("reports the cell the key's own edit cleared", () => {
    expect(otpEmptiedCell("12", "1", 1, 4)).toBe(true);
  });

  it("answers false for a middle cell, whose neighbour shifts into it", () => {
    expect(otpEmptiedCell("123", "13", 1, 4)).toBe(false);
  });

  it("answers false for an edit that cleared nothing", () => {
    expect(otpEmptiedCell("123", "123", 1, 4)).toBe(false);
    expect(otpEmptiedCell("123", "12", 1, 4)).toBe(false);
    expect(otpEmptiedCell("", "", 0, 4)).toBe(false);
    expect(otpEmptiedCell("123", "125", 2, 4)).toBe(false);
  });

  it("reads a stored value that is not text as an empty cell", () => {
    expect(otpEmptiedCell(42, "", 0, 4)).toBe(false);
  });
});
