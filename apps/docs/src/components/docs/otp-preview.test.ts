import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
    expect(source).not.toContain("maxLength");
    expect(source).toContain("event.target.value");
  });

  it("clears one cell on Backspace, not the edit's own cell as well", () => {
    expect(source).toContain("otpEmptiedCell");
    expect(source).toContain("emptied.current");
  });
});
