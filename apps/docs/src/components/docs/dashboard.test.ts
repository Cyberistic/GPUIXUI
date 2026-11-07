import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ChartMark } from "@gpuixui/data/chart/logic";
import { HOURLY_PLOT, HOURLY_SCALE, hourlyStack } from "./dashboard";

const isRect = (
  mark: ChartMark,
): mark is Extract<ChartMark, { kind: "rect" }> => mark.kind === "rect";

describe("hourlyStack", () => {
  const stacks = hourlyStack();

  it("paints one series per model across every bucket", () => {
    expect(stacks).toHaveLength(5);
    for (const marks of stacks) expect(marks).toHaveLength(12);
  });

  it("stacks each bucket contiguously from the shared baseline", () => {
    for (let column = 0; column < 12; column += 1) {
      const marks = stacks
        .flatMap((series) => series[column] ?? [])
        .filter(isRect)
        .sort((left, right) => left.y - right.y);
      expect(marks.length).toBeGreaterThan(0);
      const lowest = marks[marks.length - 1];
      expect(lowest?.y ?? 0).toBeGreaterThanOrEqual(0);
      expect((lowest?.y ?? 0) + (lowest?.height ?? 0)).toBeCloseTo(
        HOURLY_PLOT.height,
        5,
      );
      for (let index = 1; index < marks.length; index += 1) {
        const lower = marks[index];
        const upper = marks[index - 1];
        expect(lower?.y ?? 0).toBeCloseTo(
          (upper?.y ?? 0) + (upper?.height ?? 0),
          5,
        );
      }
    }
  });

  it("draws the stack against the package's ceiling", () => {
    const tallestTotal = 113;
    const slot = HOURLY_PLOT.width / 12;
    const totals = stacks
      .flatMap((marks) => marks.filter(isRect))
      .reduce<ReadonlyArray<number>>(
        (sums, mark) => {
          const column = Math.round(mark.x / slot);
          return sums.map((sum, index) =>
            index === column ? sum + mark.height : sum,
          );
        },
        Array.from({ length: 12 }, () => 0),
      );
    const tallest = Math.max(...totals);

    expect(HOURLY_SCALE).toBeGreaterThanOrEqual(tallestTotal);
    expect(tallest / HOURLY_PLOT.height).toBeCloseTo(
      tallestTotal / HOURLY_SCALE,
      4,
    );
  });

  it("draws against the stacked ceiling, not the widest series (negative control)", () => {
    expect(HOURLY_SCALE).toBeGreaterThan(100);
  });
});

const blocksCss = (): string =>
  readFileSync(
    fileURLToPath(new URL("../../styles/blocks.css", import.meta.url)),
    "utf8",
  );

describe("chart load animation", () => {
  it("grows bars from the baseline and fades the donut in", () => {
    const css = blocksCss();

    expect(css).toContain("@keyframes gx-dash-grow");
    expect(css).toContain("transform: scaleY(0)");
    expect(css).toContain("transform-origin: bottom");

    expect(css).toContain("@keyframes gx-dash-draw");
    expect(css).toContain("opacity: 0");
  });

  it("paints the final frame at once under reduced motion", () => {
    const css = blocksCss();

    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation: none");
    expect(css).toContain(".gx-dash-donut-segment");
  });
});
