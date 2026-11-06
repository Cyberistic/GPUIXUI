import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { applyOtpInput, otpCells } from "@gpuixui/primitives";
import { liveRegistry } from "./registry.js";
import {
  OTP_PASTE_FIELD,
  OTP_PASTE_LENGTH,
  OTP_PASTE_READOUT,
  otpPasteCellId,
  otpPasteMarker,
  otpPasteOver,
  otpPasteReadout,
} from "./otp-paste.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const otpPasteSteps = (() => {
  const start = scenarios.indexOf("const otpPasteSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

const otpPasteSection = (() => {
  const heading = "### `otp-paste-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  const end = readme.indexOf("\n### ", start + heading.length);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

const constant = (value: number) => () => value;

describe("the OTP paste fixture", () => {
  it("builds a marker from every character normalizeOtp keeps", () => {
    expect(otpPasteMarker(constant(0))).toBe("aaaaaa");
    expect(otpPasteMarker(constant(9 / 36))).toBe("jjjjjj");
    expect(otpPasteMarker(constant(35 / 36))).toBe("999999");
    expect(otpPasteMarker(constant(0), 9)).toBe("aaaaaaaaa");
  });

  it("keeps the first character out of the set it is asked to avoid", () => {
    const marker = otpPasteMarker(constant(0), 9, "a");
    expect(Str.slice(0, 1)(marker)).toBe("b");
    expect(Str.length(marker)).toBe(9);
  });

  it("prints one cell per character, so a seven-character code is visible", () => {
    expect(otpPasteReadout({ value: "", completes: 0, edits: 0 })).toBe(
      "value= cells=,,,,, completes=0 edits=0",
    );
    expect(otpPasteReadout({ value: "a1b2c3", completes: 1, edits: 2 })).toBe(
      "value=a1b2c3 cells=a,1,b,2,c,3 completes=1 edits=2",
    );

    expect(otpPasteReadout({ value: "a1b2c3d", completes: 0, edits: 1 })).toBe(
      "value=a1b2c3d cells=a,1,b,2,c,3 completes=0 edits=1",
    );
  });

  it("names the cells the field itself derives from its test id", () => {
    expect(otpPasteCellId(0)).toBe(`${OTP_PASTE_FIELD}-cell-1`);
    expect(otpPasteCellId(OTP_PASTE_LENGTH - 1)).toBe(
      `${OTP_PASTE_FIELD}-cell-6`,
    );
  });

  it("derives each pasted value from the shipped distribution rule", () => {
    const marker = "a1b2c3";
    const longer = "q7w8e9r0t";

    expect(otpPasteOver("", 0, marker)).toBe(
      applyOtpInput("", 0, marker, OTP_PASTE_LENGTH).value,
    );
    expect(otpPasteOver(marker, 0, longer)).toBe(
      applyOtpInput(marker, 0, longer, OTP_PASTE_LENGTH).value,
    );
    expect(otpPasteOver(marker, 2, longer)).toBe(
      applyOtpInput(marker, 2, longer, OTP_PASTE_LENGTH).value,
    );

    expect(
      otpPasteOver(Str.takeLeft(OTP_PASTE_LENGTH)(longer), 2, longer),
    ).toBe(
      applyOtpInput(
        Str.takeLeft(OTP_PASTE_LENGTH)(longer),
        2,
        longer,
        OTP_PASTE_LENGTH,
      ).value,
    );

    expect(otpPasteOver(marker, 0, longer)).toBe("q7w8e9");
    expect(otpPasteOver(marker, 2, longer)).toBe("a1q7w8");
    expect(otpPasteOver("q7w8e9", 2, longer)).toBe("q7q7w8");
    expect(Arr.length(otpCells(otpPasteOver(marker, 2, longer), 6))).toBe(6);
  });

  it("addresses itself with a readout no other probe owns", () => {
    expect([OTP_PASTE_READOUT, OTP_PASTE_FIELD]).toEqual([
      "otp-paste-readout",
      "otp-paste-field",
    ]);
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "otp-paste-lifecycle"),
    ).toEqual([
      {
        id: "otp-paste-lifecycle",
        title: expect.stringContaining("pasted"),
        capability: "input",
      },
    ]);
  });

  it("reads the record it cites, not the gap it once owed", () => {
    const prose = otpPasteSection.replace(/\s+/g, " ");
    expect(prose).toContain("Paste into a code field");
    expect(prose).not.toContain("unverified");
    expect(prose).not.toContain("can move");
  });

  it("documents the probe and prints the check count it asserts", () => {
    expect(readme).toContain(
      "### `otp-paste-lifecycle` — measured on 0.11.0 here",
    );
    const asserted =
      otpPasteSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(1);
    const printed = Number(
      /(\d+) checks, `--only otp-paste-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("asserts the distribution, the truncation and the one completion", () => {
    expect(otpPasteSteps).toContain(
      "a pasted code fills the six cells and completes once",
    );
    expect(otpPasteSteps).toContain(
      "a longer paste truncates to six cells and is not a second completion",
    );
    expect(otpPasteSteps).toContain(
      "a paste into the third cell rewrites from there and keeps the first two",
    );
    expect(otpPasteSteps).toContain("otpPasteCellId(OTP_PASTE_LENGTH - 1)");
    expect(otpPasteSteps).toContain(
      "otpPasteReadout({ value: marker, completes: 1, edits: 1 })",
    );
  });
});
