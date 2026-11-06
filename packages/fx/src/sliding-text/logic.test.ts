import { describe, expect, it } from "vitest";
import { slideFrames } from "./logic.js";

describe("slideFrames", () => {
  it("arrives from the right and leaves to the left when reading forward", () => {
    const frames = slideFrames("forward", 240);
    expect(frames.enterFrom).toEqual({ opacity: 0, left: 240 });
    expect(frames.rest).toEqual({ opacity: 1, left: 0 });
    expect(frames.exitTo).toEqual({ opacity: 0, left: -240 });
  });

  it("mirrors both edges when reading back", () => {
    const frames = slideFrames("back", 240);
    expect(frames.enterFrom).toEqual({ opacity: 0, left: -240 });
    expect(frames.exitTo).toEqual({ opacity: 0, left: 240 });
  });

  it("fades in place before the box has reported a width", () => {
    expect(slideFrames("forward", 0)).toEqual({
      enterFrom: { opacity: 0, left: 0 },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: 0 },
    });
  });

  it("treats an unreadable width as no travel rather than as NaN", () => {
    expect(slideFrames("forward", Number.NaN).enterFrom).toEqual({
      opacity: 0,
      left: 0,
    });
    expect(slideFrames("forward", -16).exitTo).toEqual({ opacity: 0, left: 0 });
  });
});
