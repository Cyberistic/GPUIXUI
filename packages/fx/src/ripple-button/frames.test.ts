import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { rippleFrames } from "./logic.js";

const motionFields = [
  "opacity",
  "width",
  "height",
  "top",
  "right",
  "bottom",
  "left",
  "borderRadius",
];

describe("the ripple's frames", () => {
  it("tween the radius and only fields the runtime animates", () => {
    const keys = Arr.flatMap(
      Object.values(rippleFrames({ x: 10, y: 10 }, 20)),
      (frame) => Object.keys(frame),
    );
    expect(keys).toContain("borderRadius");
    expect(Arr.filter(keys, (key) => !motionFields.includes(key))).toEqual([]);
  });
});
