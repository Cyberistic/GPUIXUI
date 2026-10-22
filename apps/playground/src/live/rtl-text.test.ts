/**
 * Holds the arithmetic the `rtl-text` probe reads a capture with.
 *
 * The probe's whole finding is "the crossbar is at the left end" versus "at
 * the right end", and that is decided by how much exact ink sits in the top
 * rows of each end band. A real frame cannot prove the arithmetic — a bar and
 * a letter's stem are both just ink — so the reader is held to a drawn frame
 * where the crossbar is known.
 *
 * The failure being guarded is a reader that counts the whole band instead of
 * its top rows: the vertical strokes of the letters would then swamp the
 * crossbar, and every right-to-left run would read as unresolved. The second
 * half is the guard that a run with no top ink at either end is *unresolved*
 * rather than "left", which is the default a bare ratio would return.
 */
import { readFileSync } from "node:fs";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import { liveRegistry } from "./registry.js";
import {
  crossbarSide,
  directionOf,
  readEndInk,
  RTL_CROSSBAR_FLOOR,
  RTL_EDGE,
  RTL_FONT_SIZE,
  RTL_TOP_ROWS,
  shaped,
  shapingOf,
  type EndInk,
} from "./rtl-text.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `rtlTextSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const rtlTextSteps");
  if (start === -1) return "";
  const ends = Arr.filter(
    [
      scenarios.indexOf("\nconst ", start + 1),
      scenarios.indexOf("\nexport const ", start + 1),
      scenarios.indexOf("\n/** The bodies", start + 1),
    ],
    (end) => end > start,
  );
  return scenarios.slice(
    start,
    Arr.reduce(ends, scenarios.length, (first, end) => Math.min(first, end)),
  );
})();

const FRAME = { width: 80, height: 40 } as const;
const INK = "#FF0000";
const PAGE = [255, 255, 255, 255] as const;
const MARK = [255, 0, 0, 255] as const;

/** Where the drawn ink sits: `top` bars and `bottom` strokes. */
interface Drawn {
  readonly top: ReadonlyArray<readonly [number, number, number, number]>;
  readonly bottom: ReadonlyArray<readonly [number, number, number, number]>;
}

/** A capture of `scale` device pixels per logical point holding `drawn`. */
const frameOf = (drawn: Drawn, scale = 1): Pixels.Pixels => {
  const width = FRAME.width * scale;
  const height = FRAME.height * scale;
  const covers = (
    rect: readonly [number, number, number, number],
    x: number,
    y: number,
  ): boolean => {
    const [left, top, right, bottom] = rect;
    return x >= left && x <= right && y >= top && y <= bottom;
  };
  const inked = (x: number, y: number): boolean =>
    [...drawn.top, ...drawn.bottom].some((rect) => covers(rect, x, y));
  const at = (x: number, y: number): ReadonlyArray<number> =>
    inked(Math.floor(x / scale), Math.floor(y / scale)) ? MARK : PAGE;
  return new Pixels.Pixels({
    width,
    height,
    data: Uint8Array.from(
      Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => at(x, y)),
      ).flat(2),
    ),
  });
};

/** The whole frame as a read region. */
const BOX = { x: 0, y: 0, width: FRAME.width, height: FRAME.height } as const;

/** The reader's answer, or a failure no test can pass through. */
const readOf = (frame: Pixels.Pixels, scale = 1): EndInk =>
  pipe(
    readEndInk(frame, BOX, scale, INK),
    Option.match({
      onNone: () => {
        throw new Error("the drawn frame carries ink the reader did not find");
      },
      onSome: (ends) => ends,
    }),
  );

/** A crossbar at the left end and a letter's stem at the right. */
const leftBar: Drawn = {
  top: [[2, 0, 20, 1]],
  bottom: [[70, 0, 71, 24]],
};

/** The same, mirrored. */
const rightBar: Drawn = {
  top: [[59, 0, 77, 1]],
  bottom: [[2, 0, 3, 24]],
};

describe("the right-to-left reader", () => {
  it("finds the crossbar at the end that carries it", () => {
    const left = readOf(frameOf(leftBar));
    expect(left.left).toBeGreaterThan(left.right * RTL_CROSSBAR_FLOOR);
    expect(crossbarSide(left)).toBe("left");
    expect(directionOf(left)).toBe("rtl");
  });

  it("reads the mirrored run as the other direction", () => {
    const right = readOf(frameOf(rightBar));
    expect(right.right).toBeGreaterThan(right.left * RTL_CROSSBAR_FLOOR);
    expect(crossbarSide(right)).toBe("right");
    expect(directionOf(right)).toBe("ltr");
  });

  it("reads the same run at a device scale", () => {
    const left = readOf(frameOf(leftBar, 2), 2);
    expect(crossbarSide(left)).toBe("left");
    expect(left.width).toBeCloseTo(70, 0);
  });

  it("leaves a run with no top ink unresolved rather than naming a side", () => {
    const ends = readOf(
      frameOf({
        top: [[30, 0, 50, 1]],
        bottom: [
          [2, 8, 20, 20],
          [59, 8, 77, 20],
        ],
      }),
    );
    expect(ends.left).toBe(0);
    expect(ends.right).toBe(0);
    expect(crossbarSide(ends)).toBe("unresolved");
    expect(directionOf(ends)).toBe("unresolved");
  });

  it("reads equal ends as unresolved", () => {
    const even = readOf(
      frameOf({
        top: [
          [2, 0, 20, 1],
          [59, 0, 77, 1],
        ],
        bottom: [],
      }),
    );
    expect(crossbarSide(even)).toBe("unresolved");
  });

  it("reports a blank region, an outside region and an unreadable colour as absent", () => {
    const frame = frameOf(leftBar);
    const blank = { x: 30, y: 30, width: 8, height: 4 } as const;
    const outside = { x: 400, y: 0, width: 40, height: 40 } as const;
    expect(readEndInk(frame, blank, 1, INK)).toBe(Option.none());
    expect(readEndInk(frame, outside, 1, INK)).toBe(Option.none());
    expect(readEndInk(frame, BOX, 1, "notacolour")).toBe(Option.none());
  });

  it("holds the bands and rows the probe crops the ends with", () => {
    expect(RTL_EDGE).toBe(10);
    expect(RTL_TOP_ROWS).toBe(3);
    expect(RTL_FONT_SIZE).toBe(32);
  });
});

describe("the shaping reading", () => {
  it("reads a joining difference in both directions", () => {
    expect(shapingOf(58, 79)).toEqual({ joined: 58, separated: 79, delta: 21 });
    expect(shaped(shapingOf(58, 79))).toBe(true);
    expect(shaped(shapingOf(79, 58))).toBe(true);
  });

  it("does not read two identical layouts as shaping", () => {
    expect(shaped(shapingOf(58, 58))).toBe(false);
    // Below half a point is rounding, not a shaper choosing a form.
    expect(shaped(shapingOf(58, 58.4))).toBe(false);
    expect(shaped(shapingOf(58, 58.5))).toBe(true);
  });
});

describe("the right-to-left probe's record", () => {
  it("registers the probe once with the text capability", () => {
    expect(liveRegistry.filter((probe) => probe.id === "rtl-text")).toEqual([
      {
        id: "rtl-text",
        title: expect.stringContaining("right to left"),
        capability: "text",
      },
    ]);
  });

  it("documents the probe under the version it was measured on", () => {
    expect(readme).toContain("### `rtl-text` — measured on 0.11.0 here");
  });

  it("prints the check count the steps execute", () => {
    const sites = steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const reads = steps.match(/read\(RTL_IDS/g)?.length ?? 0;
    // `read` asserts the box and the ink; its two sites are counted once above.
    const executed = reads * 2 + (sites - 2);
    expect(executed).toBe(19);
    const printed = Number(
      /(\d+) checks, `--only rtl-text`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(executed);
  });

  it("prints the ends and advances the frame measured", () => {
    // The values are host measurements, and the page is what the docs site and
    // a release report cite: a stale number has to fail rather than teach the
    // previous run.
    expect(readme).toContain(
      "| `nnT` (Latin control) | **0** | **92** | 46 pt |",
    );
    expect(readme).toContain(
      "| `ייT` (Hebrew, RTL base) | **92** | **0** | 30.5 pt |",
    );
    expect(readme).toContain(
      "| `aייT` (Hebrew, LTR base) | **0** | **92** | 48 pt |",
    );
    expect(readme).toContain("**58 pt**");
    expect(readme).toContain("**79 pt**");
    expect(readme).toContain("**21 pt**");
  });

  it("states the result the samples settle, not only the table", () => {
    expect(readme).toContain("**The platform runs bidi and shaping.**");
    expect(readme).toContain("**The layout is still the app's to mirror.**");
    expect(readme).toContain(
      "**Text direction follows the first strong character**",
    );
  });
});
