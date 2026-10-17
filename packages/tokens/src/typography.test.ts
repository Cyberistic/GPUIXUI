import { describe, expect, it } from "vitest";
import {
  textRoles,
  typography,
  type FontWeight,
  type TextRole,
} from "./typography.js";

/**
 * The two size ladders. `bodyStrong` is a weight variant of `body` and shares
 * its size, so it belongs to neither; every other role steps strictly down.
 */
const proseLadder = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "label",
  "caption",
] as const satisfies ReadonlyArray<TextRole>;

const codeLadder = [
  "code",
  "codeBlock",
] as const satisfies ReadonlyArray<TextRole>;

const laddered: ReadonlyArray<TextRole> = [
  ...proseLadder,
  "bodyStrong",
  ...codeLadder,
];

/** The roles that fail to step down from the role before them. */
const brokenSteps = (
  ladder: ReadonlyArray<TextRole>,
): ReadonlyArray<TextRole> =>
  ladder.filter((role, index) => {
    const previous = index === 0 ? undefined : ladder[index - 1];
    return (
      previous !== undefined &&
      typography[previous].fontSize <= typography[role].fontSize
    );
  });

describe("type scale", () => {
  it("gives every role leading above its size", () => {
    textRoles.forEach((role) => {
      expect(typography[role].lineHeight, role).toBeGreaterThan(
        typography[role].fontSize,
      );
    });
  });

  it("uses only the supported weights", () => {
    const weights: readonly FontWeight[] = [400, 500, 600, 700];
    textRoles.forEach((role) => {
      expect(weights, role).toContain(typography[role].fontWeight);
    });
  });

  it("places every role on exactly one ladder", () => {
    expect(laddered.toSorted()).toEqual([...textRoles].toSorted());
    expect(new Set(laddered).size).toBe(laddered.length);
  });

  it("steps each ladder strictly down in size", () => {
    expect(brokenSteps(proseLadder), "prose ladder").toEqual([]);
    expect(brokenSteps(codeLadder), "code ladder").toEqual([]);
  });

  it("keeps sans and mono distinct and non-empty", () => {
    expect(typography.sans.length).toBeGreaterThan(0);
    expect(typography.mono.length).toBeGreaterThan(0);
    expect(typography.sans).not.toBe(typography.mono);
  });

  it("indexes every non-family role exactly once, in documentation order", () => {
    const roles = Object.keys(typography).filter(
      (key) => key !== "sans" && key !== "mono",
    );
    expect(textRoles).toEqual(roles);
    expect(new Set(textRoles).size).toBe(textRoles.length);
    expect(textRoles[0]).toBe("display");
    expect(textRoles.at(-1)).toBe("codeBlock");
  });
});
