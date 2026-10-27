import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The OTP page's drawing runs the field's own rules.
 *
 * Guarded bug: the preview kept one character per input with `maxLength={1}`
 * and wrote the changed cell back, so typing never advanced and a pasted code
 * was truncated to its first digit — a field nobody ships, in a page that
 * documents pasting one. It now imports `applyOtpInput`, `decideOtpKey`,
 * `otpCells` and `otpEmptiedCell` from the primitive's core, so the drawing and
 * the component cannot drift.
 *
 * The behaviour of those rules is `packages/primitives/src/core/otp.test.ts`'s
 * subject; this file guards that the drawing still asks them.
 */

const source = readFileSync(
  new URL("./otp-field-demo.tsx", import.meta.url),
  "utf8",
);

describe("the OTP preview", () => {
  it("runs the primitive's distribution and focus rules", () => {
    for (const rule of [
      "applyOtpInput",
      "decideOtpKey",
      "normalizeOtp",
      "otpCells",
      "otpEmptiedCell",
    ]) {
      expect(source).toContain(rule);
    }
    expect(source).toContain('from "@gpuixui/primitives/core"');
  });

  it("hands a whole insert to the rule instead of truncating it", () => {
    // `maxLength={1}` is what cut a pasted code to one digit.
    expect(source).not.toContain("maxLength");
    expect(source).toContain("event.target.value");
  });

  it("clears one cell on Backspace, not the edit's own cell as well", () => {
    expect(source).toContain("otpEmptiedCell");
    expect(source).toContain("emptied.current");
  });
});
