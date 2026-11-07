import { describe, expect, it } from "vitest";
import { isResizeKey, keySize, nextSize } from "./resize.js";

const bounds = { min: 80, max: 520, step: 16 } as const;

describe("nextSize", () => {
  it("applies the pointer delta in both directions", () => {
    expect(nextSize({ start: 320, pointerDelta: 80, min: 80, max: 600 })).toBe(
      400,
    );
    expect(nextSize({ start: 320, pointerDelta: -40, min: 80, max: 600 })).toBe(
      280,
    );
  });

  it("clamps inclusively at both bounds", () => {
    expect(
      nextSize({ start: 320, pointerDelta: 1000, min: 80, max: 600 }),
    ).toBe(600);
    expect(
      nextSize({ start: 320, pointerDelta: -1000, min: 80, max: 600 }),
    ).toBe(80);
    expect(nextSize({ start: 80, pointerDelta: 0, min: 80, max: 600 })).toBe(
      80,
    );
    expect(nextSize({ start: 600, pointerDelta: 0, min: 80, max: 600 })).toBe(
      600,
    );
  });

  it("never returns a width below the minimum for a huge negative drag", () => {
    const width = nextSize({
      start: 320,
      pointerDelta: -10_000,
      min: 80,
      max: 600,
    });
    expect(width).toBe(80);
    expect(width).toBeGreaterThan(0);
  });
});

describe("keySize", () => {
  it("moves toward the key: left narrows and right widens", () => {
    expect(keySize({ size: 320, key: "left", ...bounds })).toBe(304);
    expect(keySize({ size: 320, key: "right", ...bounds })).toBe(336);
  });

  it("clamps an arrow held against either bound", () => {
    expect(keySize({ size: 80, key: "left", ...bounds })).toBe(80);
    expect(keySize({ size: 520, key: "right", ...bounds })).toBe(520);

    expect(keySize({ size: 1000, key: "left", ...bounds })).toBe(520);
  });

  it("jumps to the caller's bounds on Home and End", () => {
    expect(keySize({ size: 320, key: "home", ...bounds })).toBe(80);
    expect(keySize({ size: 320, key: "end", ...bounds })).toBe(520);
  });

  it("moves by the caller's step, not a hard-coded distance", () => {
    expect(keySize({ size: 320, key: "right", ...bounds, step: 48 })).toBe(368);
  });

  it("accepts only the four keys the divider handles", () => {
    expect(["left", "right", "home", "end"].every(isResizeKey)).toBe(true);

    expect(
      ["tab", "down", "ArrowLeft", "a", ""].filter(isResizeKey),
    ).toStrictEqual([]);
  });
});
