/**
 * Flex distribution (plan `833`).
 *
 * The bug being guarded: `flexGrow`/`flexBasis`/`justifyContent`/`alignItems`
 * are what 300+ shipped call sites lay their rows out with, and the arithmetic
 * the probe asserts lived only in the probe. A model that dropped the basis,
 * invented free space on a full row, or mis-split a remainder would let the
 * runtime checks and the expectations drift together.
 */
import { describe, expect, it } from "vitest";
import {
  crossOffset,
  describeNumbers,
  freeSpace,
  growWidths,
  justifyGaps,
  justifyOffset,
  measuredGaps,
  rowPositions,
  shrinkWidths,
  widthsMatch,
} from "./flex-layout-model.js";

describe("growWidths", () => {
  it("splits the free space equally for a 1:1 row", () => {
    expect(
      growWidths(600, [
        { basis: 0, grow: 1 },
        { basis: 0, grow: 1 },
      ]),
    ).toEqual([300, 300]);
  });

  it("splits the free space in proportion for a 1:2 row", () => {
    expect(
      growWidths(600, [
        { basis: 0, grow: 1 },
        { basis: 0, grow: 2 },
      ]),
    ).toEqual([200, 400]);
  });

  it("adds each share to the item's own basis", () => {
    expect(
      growWidths(600, [
        { basis: 200, grow: 1 },
        { basis: 100, grow: 1 },
      ]),
    ).toEqual([350, 250]);
  });

  it("leaves a non-growing item at its basis and gives the rest away", () => {
    expect(
      growWidths(600, [
        { basis: 100, grow: 0 },
        { basis: 0, grow: 1 },
      ]),
    ).toEqual([100, 500]);
  });

  it("distributes an indivisible remainder and still sums to the total", () => {
    const widths = growWidths(
      601,
      [0, 1, 2].map(() => ({ basis: 0, grow: 1 })),
    );
    const sum = widths.reduce((total, width) => total + width, 0);
    expect(sum).toBe(601);
    expect(Math.max(...widths)).toBeGreaterThan(200);
  });

  it("invents no free space when nothing grows", () => {
    expect(
      growWidths(600, [
        { basis: 100, grow: 0 },
        { basis: 150, grow: 0 },
      ]),
    ).toEqual([100, 150]);
  });
});

describe("freeSpace", () => {
  it("floors at zero when the bases overflow the row", () => {
    expect(
      freeSpace(300, [
        { basis: 200, grow: 1 },
        { basis: 200, grow: 1 },
      ]),
    ).toBe(0);
  });
});

describe("shrinkWidths", () => {
  it("leaves a flexShrink: 0 item at its basis", () => {
    expect(
      shrinkWidths(300, [
        { basis: 200, shrink: 0 },
        { basis: 200, shrink: 1 },
      ]),
    ).toEqual([200, 100]);
  });

  it("splits the overflow by shrink weight", () => {
    expect(
      shrinkWidths(300, [
        { basis: 200, shrink: 1 },
        { basis: 200, shrink: 3 },
      ]),
    ).toEqual([175, 125]);
  });

  it("changes nothing when the bases fit", () => {
    expect(
      shrinkWidths(600, [
        { basis: 200, shrink: 0 },
        { basis: 100, shrink: 1 },
      ]),
    ).toEqual([200, 100]);
  });
});

describe("justifyGaps", () => {
  it("spaces three items evenly with space-between", () => {
    expect(justifyGaps("space-between", 400, [60, 60, 60])).toEqual([110, 110]);
  });

  it("leaves no gap for flex-start or center", () => {
    expect(justifyGaps("center", 400, [60, 60, 60])).toEqual([0, 0]);
    expect(justifyGaps("flex-start", 400, [60, 60, 60])).toEqual([0, 0]);
  });

  it("has no gap list for a single item", () => {
    expect(justifyGaps("space-between", 400, [60])).toEqual([]);
  });

  it("halves the free space as a leading offset for center only", () => {
    expect(justifyOffset("center", 400, [60])).toBe(170);
    expect(justifyOffset("space-between", 400, [60, 60, 60])).toBe(0);
  });
});

describe("crossOffset", () => {
  it("centres a short child by half the leftover height", () => {
    expect(crossOffset("center", 60, 20)).toBe(20);
    expect(crossOffset("center", 60, 40)).toBe(10);
  });

  it("pins stretch and flex-start to the row's top", () => {
    expect(crossOffset("stretch", 60, 20)).toBe(0);
    expect(crossOffset("flex-start", 60, 26)).toBe(0);
  });

  it("clamps a taller child at the row's top instead of going negative", () => {
    expect(crossOffset("center", 60, 80)).toBe(0);
  });
});

describe("rowPositions", () => {
  it("places adjacent items end to start", () => {
    expect(rowPositions([300, 300], [0])).toEqual([0, 300]);
  });

  it("adds the gaps between items", () => {
    expect(rowPositions([60, 60, 60], [110, 110])).toEqual([0, 170, 340]);
  });

  it("starts at the leading offset", () => {
    expect(rowPositions([60], [], 170)).toEqual([170]);
  });
});

describe("widthsMatch", () => {
  it("accepts a one-pixel drift and rejects two", () => {
    expect(widthsMatch([233.5, 406.5], [233.33, 406.67], 1)).toBe(true);
    expect(widthsMatch([233.5, 406.5], [231.5, 406.5], 1)).toBe(false);
  });

  it("rejects a different number of items", () => {
    expect(widthsMatch([300], [300, 300], 1)).toBe(false);
  });
});

describe("measuredGaps", () => {
  it("reads the blank space between painted boxes", () => {
    expect(
      measuredGaps([
        { x: 0, width: 60 },
        { x: 170, width: 60 },
        { x: 340, width: 60 },
      ]),
    ).toEqual([110, 110]);
  });
});

describe("describeNumbers", () => {
  it("names the measured widths in a failure", () => {
    expect(describeNumbers([233.456, 406.5])).toBe("233.46,406.5");
    expect(describeNumbers([])).toBe("none");
  });
});
