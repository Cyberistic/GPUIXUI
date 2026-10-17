import { describe, expect, it } from "vitest";
import { typography, type FontWeight, type TextRole } from "./typography.js";

const roles: readonly TextRole[] = [
  "caption",
  "label",
  "body",
  "bodyStrong",
  "code",
  "codeBlock",
  "h3",
  "h2",
  "h1",
  "display",
];

const ascendingPairs = [
  ["caption", "label"],
  ["label", "body"],
  ["body", "h3"],
  ["h3", "h2"],
  ["h2", "h1"],
  ["h1", "display"],
] as const;

describe("type scale", () => {
  it("gives every role leading above its size", () => {
    roles.forEach((role) => {
      expect(typography[role].lineHeight, role).toBeGreaterThan(
        typography[role].fontSize,
      );
    });
  });

  it("uses only the supported weights", () => {
    const weights: readonly FontWeight[] = [400, 500, 600, 700];
    roles.forEach((role) => {
      expect(weights, role).toContain(typography[role].fontWeight);
    });
  });

  it("orders sizes from caption to display", () => {
    ascendingPairs.forEach(([smaller, larger]) => {
      expect(
        typography[larger].fontSize,
        `${larger} > ${smaller}`,
      ).toBeGreaterThan(typography[smaller].fontSize);
    });
  });

  it("keeps sans and mono distinct and non-empty", () => {
    expect(typography.sans.length).toBeGreaterThan(0);
    expect(typography.mono.length).toBeGreaterThan(0);
    expect(typography.sans).not.toBe(typography.mono);
  });
});
