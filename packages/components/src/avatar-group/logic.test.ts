/**
 * AvatarGroup's arithmetic, without a renderer.
 *
 * The bugs these guard: a cap that hides the wrong end of the list or accepts a
 * nonsense value; an overlap wide enough to paint the row backwards; a row whose
 * width disagrees with where the discs actually sit, so the group reflows the
 * page as it animates; a stagger counted per disc instead of through the row;
 * and a chip that paints a count no reader can resolve to names. The delay's
 * seconds and the reduced rule are `@gpuixui/motion`'s (`timing.test.ts`, "a
 * staggered timing").
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  avatarDiscLeft,
  avatarGroupRise,
  avatarGroupStepMs,
  avatarOverlap,
  avatarRise,
  avatarRowWidth,
  avatarStep,
  groupDelayMs,
  groupName,
  overflowName,
  overflowText,
  splitMembers,
  visibleCount,
} from "./logic.js";

const names = ["Ada", "Grace", "Alan", "Katherine", "Jean"];

describe("visibleCount", () => {
  it("shows the front of the list and hides the tail", () => {
    expect(splitMembers(names, Option.some(2)).visible).toEqual([
      "Ada",
      "Grace",
    ]);
    expect(splitMembers(names, Option.some(2)).hidden).toEqual([
      "Alan",
      "Katherine",
      "Jean",
    ]);
  });

  it("cannot show more members than the list holds", () => {
    expect(visibleCount(3, Option.some(9))).toBe(3);
    expect(visibleCount(3, Option.none())).toBe(3);
  });

  it("falls back for a cap that is not a usable count", () => {
    // A stored preference can arrive as a negative or a NaN; hiding the whole
    // group because of it would be worse than showing it.
    expect(visibleCount(4, Option.some(-2))).toBe(0);
    expect(visibleCount(4, Option.some(2.9))).toBe(2);
    expect(visibleCount(4, Option.some(Number.NaN))).toBe(4);
  });

  it("shows only the chip when the cap is zero", () => {
    expect(splitMembers(names, Option.some(0)).visible).toEqual([]);
    expect(splitMembers(names, Option.some(0)).hidden).toEqual(names);
  });
});

describe("the row's geometry", () => {
  it("tucks a quarter of the diameter under the previous disc by default", () => {
    // The md face is 32px, so the house overlap is 8px and a disc advances 24.
    expect(avatarOverlap(32, Option.none())).toBe(8);
    expect(avatarStep(32, avatarOverlap(32, Option.none()))).toBe(24);
  });

  it("keeps a caller's overlap inside the diameter", () => {
    // An overlap of 100px on a 32px face would both hide every face and reverse
    // the row, so it is held to one pixel short of the diameter.
    expect(avatarOverlap(32, Option.some(100))).toBe(31);
    expect(avatarStep(32, avatarOverlap(32, Option.some(100)))).toBe(1);
    expect(avatarOverlap(32, Option.some(-4))).toBe(0);
    expect(avatarOverlap(32, Option.some(Number.POSITIVE_INFINITY))).toBe(8);
  });

  it("sizes the row to the discs and the advances between them", () => {
    expect(avatarRowWidth(32, 4, 24)).toBe(32 + 24 * 3);
    expect(avatarRowWidth(32, 1, 24)).toBe(32);
    expect(avatarRowWidth(32, 0, 24)).toBe(0);
  });

  it("places each disc at its own advance", () => {
    expect([0, 1, 2, 3].map((index) => avatarDiscLeft(index, 24))).toEqual([
      0, 24, 48, 72,
    ]);
  });

  it("keeps the house rise for a distance the runtime cannot paint", () => {
    expect(avatarGroupRise).toBe(6);
    expect(avatarRise(Option.none())).toBe(6);
    expect(avatarRise(Option.some(12))).toBe(12);
    expect(avatarRise(Option.some(Number.NaN))).toBe(6);
    expect(avatarRise(Option.some(-3))).toBe(6);
  });
});

describe("the arrival", () => {
  it("counts the stagger through the row, not per disc", () => {
    expect(groupDelayMs(0, 4, Option.none())).toBe(0);
    expect(groupDelayMs(2, 4, Option.none())).toBe(avatarGroupStepMs * 2);
    expect(groupDelayMs(2, 4, Option.some(40))).toBe(80);
  });

  it("falls back for a step that cannot be scheduled", () => {
    expect(groupDelayMs(1, 3, Option.some(-10))).toBe(avatarGroupStepMs);
    expect(groupDelayMs(1, 3, Option.some(Number.NaN))).toBe(avatarGroupStepMs);
  });
});

describe("what the group says", () => {
  it("paints the count behind the chip and names the people", () => {
    expect(overflowText(3)).toBe("+3");
    expect(overflowName(2, ["Grace", "Alan"])).toBe("2 more: Grace, Alan");
    expect(overflowText(0)).toBe("");
    expect(overflowName(0, [])).toBe("");
  });

  it("names itself by its size unless the caller names it", () => {
    expect(groupName(Option.none(), 1)).toBe("1 avatar");
    expect(groupName(Option.none(), 3)).toBe("3 avatars");
    expect(groupName(Option.some("Project team"), 3)).toBe("Project team");
  });

  it("does not accept a blank caller name", () => {
    expect(groupName(Option.some("   "), 2)).toBe("2 avatars");
    expect(groupName(Option.some("  Team  "), 2)).toBe("Team");
  });
});
