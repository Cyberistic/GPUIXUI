import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ChartBox } from "./logic.js";
import {
  areaBands,
  areaPath,
  barMarksInRange,
  chartRange,
  chartWindow,
  clipArea,
  curvePath,
  finite,
  horizontalBarMarks,
  niceBound,
  pointMarks,
  polygonPath,
  radarGrid,
  radarPoints,
  radialArcs,
  ringBands,
  ringSegments,
  scaleX,
  scaleY,
  seriesPoints,
  valueLabel,
  zeroY,
} from "./geometry.js";

const box: ChartBox = { width: 200, height: 100 };

const someOr = <A>(value: Option.Option<A>, why: string): A =>
  Option.match(value, {
    onNone: () => {
      throw new Error(why);
    },
    onSome: (present) => present,
  });

const series = (values: ReadonlyArray<number>) => [
  { key: "a", label: "A", values },
];

describe("a signed scale", () => {
  it("rounds a negative floor below zero and a positive ceiling above it", () => {
    expect(niceBound(-93)).toBe(-100);
    expect(niceBound(93)).toBe(100);
    expect(niceBound(0)).toBe(0);
  });

  it("keeps a chart of positives on a zero floor", () => {
    expect(chartRange(series([32, 48]))).toEqual({ min: 0, max: 50 });
  });

  it("widens to a negative value so its bar has a floor to stand under", () => {
    expect(chartRange(series([-40, 20]))).toEqual({ min: -50, max: 20 });
  });

  it("measures a stack by its totals, not by its widest series", () => {
    const range = chartRange(
      [
        { key: "a", label: "A", values: [60] },
        { key: "b", label: "B", values: [60] },
      ],
      1,
      true,
    );
    expect(range.max).toBe(200);
  });

  it("lays out an empty chart instead of dividing by zero", () => {
    expect(chartRange(series([]))).toEqual({ min: 0, max: 1 });
  });

  it("places zero where the sign changes, and clamps a non-finite value", () => {
    const range = { min: -50, max: 50 };
    expect(zeroY(box, range)).toBe(50);
    expect(scaleY(50, box, range)).toBe(0);
    expect(scaleY(Number.NaN, box, range)).toBe(50);
    expect(finite(Number.NaN)).toBe(0);
  });

  it("places a horizontal value from the left edge", () => {
    expect(scaleX(0, box, { min: 0, max: 100 })).toBe(0);
    expect(scaleX(100, box, { min: 0, max: 100 })).toBe(200);
  });
});

describe("a series' points", () => {
  it("sits one point per labelled slot, at the slot's centre", () => {
    const points = seriesPoints([10, 20], box, { min: 0, max: 20 }, 4);
    expect(Arr.map(points, (point) => point.x)).toEqual([25, 75]);
  });
});

describe("curves", () => {
  const points = [
    { x: 0, y: 100 },
    { x: 50, y: 0 },
    { x: 100, y: 100 },
  ];

  it("joins points with straight segments", () => {
    expect(curvePath(points, "linear")).toEqual(
      Option.some("M0 100L50 0L100 100"),
    );
  });

  it("holds a value until the next one in a step chart", () => {
    expect(curvePath(points, "step")).toEqual(
      Option.some("M0 100H50V0H100V100"),
    );
  });

  it("passes a smooth curve through every point", () => {
    const path = someOr(curvePath(points, "smooth"), "no smooth curve");
    expect(path.startsWith("M0 100C")).toBe(true);
    expect(path).toContain("50 0");
    expect(path.endsWith("100 100")).toBe(true);
  });

  it("never overshoots the data it is drawn through", () => {
    const spiky = [
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
      { x: 150, y: 20 },
      { x: 200, y: 100 },
    ];
    const path = someOr(curvePath(spiky, "smooth"), "no smooth curve");

    const values = [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((match) =>
      Number(match[2]),
    );
    expect(values.length).toBeGreaterThan(4);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(20);
    expect(Math.max(...values)).toBeLessThanOrEqual(100);
  });

  it("paints a half-pixel run for a single point, never a zero-length path", () => {
    expect(curvePath([{ x: 10, y: 20 }], "linear")).toEqual(
      Option.some("M10 20h1"),
    );
    expect(curvePath([], "linear")).toEqual(Option.none());
  });
});

describe("an area", () => {
  const points = [
    { x: 0, y: 80 },
    { x: 100, y: 20 },
    { x: 200, y: 60 },
  ];

  it("closes the line down to the axis' zero", () => {
    const path = someOr(
      areaPath(points, box, { min: 0, max: 100 }, "linear"),
      "no area",
    );
    expect(path.endsWith("L200 100L0 100Z")).toBe(true);
  });

  it("fades by nesting bands, so the baseline is the lightest", () => {
    const bands = areaBands(points, box, { min: 0, max: 100 }, 4);
    expect(bands).toHaveLength(4);

    expect(bands[3]).toContain("M0 80");
  });

  it("clips a band at the cut and drops one that never reaches it", () => {
    expect(clipArea(points, 10, 100)).toEqual(Option.none());
    const clipped = someOr(clipArea(points, 70, 100), "no clipped band");
    expect(clipped.startsWith("M")).toBe(true);
    expect(clipped.endsWith("Z")).toBe(true);
  });
});

describe("bars on a signed axis", () => {
  it("stands a negative bar below zero instead of hiding it", () => {
    const [layer] = barMarksInRange(series([-40]), box, {
      min: -50,
      max: 50,
    });
    const mark = layer?.[0];
    expect(mark?.kind).toBe("rect");
    if (mark?.kind !== "rect") return;

    expect(mark.y).toBe(50);
    expect(mark.height).toBeCloseTo(40);
  });

  it("skips a zero rather than painting a pixel that claims a value", () => {
    const [layer] = barMarksInRange(series([0]), box, { min: 0, max: 100 });
    expect(layer).toEqual([]);
  });

  it("rounds a bar's corner inside its own width", () => {
    const [layer] = barMarksInRange(
      series([50]),
      box,
      { min: 0, max: 100 },
      4,
      12,
    );
    const mark = layer?.[0];
    if (mark?.kind !== "rect") throw new Error("no bar");
    expect(mark.rx).toBeGreaterThan(0);
    expect(mark.rx).toBeLessThanOrEqual(mark.width / 2);
  });

  it("draws a horizontal bar from the zero line rightwards", () => {
    const [layer] = horizontalBarMarks(series([25, 50]), box, {
      min: 0,
      max: 100,
    });
    const second = layer?.[1];
    if (second?.kind !== "rect") throw new Error("no bar");
    expect(second.x).toBe(0);
    expect(second.width).toBe(100);
    expect(second.y).toBe(55);
  });
});

describe("a radar", () => {
  const points = radarPoints([100, 50, 0], 3, box, 100);

  it("puts one point on each axis, clockwise from twelve o'clock", () => {
    expect(points).toHaveLength(3);
    expect(points[0]?.x).toBeCloseTo(100);
    expect(points[0]?.y).toBeCloseTo(4);

    expect(points[2]?.x).toBeCloseTo(100);
    expect(points[2]?.y).toBeCloseTo(50);
  });

  it("closes a web per level", () => {
    expect(radarGrid(4, 5, box)).toHaveLength(4);
    expect(someOr(polygonPath(points), "no polygon").endsWith("Z")).toBe(true);
    expect(polygonPath([])).toEqual(Option.none());
  });
});

describe("a radial and a ring", () => {
  it("keeps a ring in the stack when its value is zero, and draws nothing", () => {
    const arcs = radialArcs([60, 0], box, 100);
    expect(arcs[0]?.length).toBeGreaterThan(0);
    expect(arcs[1]).toEqual([]);
  });

  it("draws a full ring as two halves", () => {
    const arcs = radialArcs([100], box, 100);
    expect(arcs[0]).toHaveLength(2);
  });

  it("separates pie slices by the pad angle", () => {
    const joined = Arr.flatten(ringSegments([50, 50], box, 0, 0));
    const padded = Arr.flatten(ringSegments([50, 50], box, 0, 0.1));
    expect(joined).toHaveLength(2);
    expect(padded).toHaveLength(2);
    expect(padded[0]?.kind === "path" ? padded[0].d : "").not.toBe(
      joined[0]?.kind === "path" ? joined[0].d : "",
    );
  });

  it("opens the ring by its sweep, so a half sweep paints half the circle", () => {
    // Guards: a pie appeared whole on its first frame where Recharts' sweeps.
    const whole = Arr.flatten(ringSegments([50, 50], box, 0, 0, undefined, 1));
    const half = Arr.flatten(ringSegments([50, 50], box, 0, 0, undefined, 0.5));
    expect(half).toHaveLength(2);
    expect(half[1]?.kind === "path" ? half[1].d : "").not.toBe(
      whole[1]?.kind === "path" ? whole[1].d : "",
    );
  });

  it("keeps a slice's gap one width, rim to hub", () => {
    // read as overlapping there. The apex now stands off the hub by half the gap.
    const [first] = Arr.flatten(ringSegments([50, 50], box, 0, 0.1));
    const d = first?.kind === "path" ? first.d : "";
    const hub = `L${box.width / 2} ${box.height / 2}`;
    expect(d).toContain("L");
    expect(d).not.toContain(hub);
  });

  it("stacks each datum on its own concentric band", () => {
    const bands = ringBands([50, 30, 20], box);
    const radiusOf = (mark: unknown): number => {
      const d =
        typeof mark === "object" && mark !== null && "d" in mark
          ? String(mark.d)
          : "";
      return Number(/A([\d.]+)/.exec(d)?.[1] ?? 0);
    };
    expect(bands).toHaveLength(3);
    expect(radiusOf(bands[0]?.[0])).toBeGreaterThan(radiusOf(bands[1]?.[0]));
    expect(radiusOf(bands[1]?.[0])).toBeGreaterThan(radiusOf(bands[2]?.[0]));
  });

  it("keeps a zero datum's band and paints nothing in it", () => {
    const bands = ringBands([50, 0], box);
    expect(bands[1]).toEqual([]);
  });

  it("paints dots at each point with its own radius", () => {
    const dots = pointMarks([{ x: 1, y: 2 }], 3);
    expect(dots[0]).toEqual({ kind: "circle", cx: 1, cy: 2, r: 3 });
  });

  it("prints a value label without trailing zeros", () => {
    expect(valueLabel(12.34)).toBe("12.3");
    expect(valueLabel(Number.NaN)).toBe("0");
  });
});

describe("a brushed category window", () => {
  it("keeps whole indexes inside the list", () => {
    expect(chartWindow(4, [1, 3])).toEqual(Option.some({ start: 1, end: 3 }));
    expect(chartWindow(4, [-2, 2.7])).toEqual(
      Option.some({ start: 0, end: 3 }),
    );
    expect(chartWindow(4, [3, 1])).toEqual(Option.some({ start: 1, end: 3 }));
  });

  it("is at least one category wide", () => {
    expect(chartWindow(4, [2, 2])).toEqual(Option.some({ start: 2, end: 3 }));
  });

  it("paints everything when the window names nothing readable", () => {
    expect(chartWindow(4, undefined)).toEqual(Option.none());
    expect(chartWindow(0, [0, 1])).toEqual(Option.none());
    expect(chartWindow(4, [Number.NaN, 2])).toEqual(Option.none());
    expect(chartWindow(4, [9, 12])).toEqual(Option.none());
  });
});
