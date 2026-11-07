import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hoverDelay } from "./clock.js";

const source = (file: string): string =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

describe("hoverDelay", () => {
  it("keeps a delay a caller wrote, including no delay", () => {
    expect(hoverDelay(300, 150)).toBe(300);
    expect(hoverDelay(0, 150)).toBe(0);
  });

  it("reads a negative delay as no delay rather than a wait in the past", () => {
    expect(hoverDelay(-40, 150)).toBe(0);
  });

  it("takes the default for a delay it cannot read", () => {
    expect(hoverDelay(Number.NaN, 150)).toBe(150);
    expect(hoverDelay(Number.POSITIVE_INFINITY, 150)).toBe(150);
    expect(hoverDelay(Number.NEGATIVE_INFINITY, 150)).toBe(150);
  });

  it("is the one rule both hover-opened surfaces schedule by", () => {
    const offences = ["preview-card.tsx", "navigation-menu.tsx"].flatMap(
      (file) => {
        const text = source(file);
        return [
          ...(text.includes("hoverDelay(")
            ? []
            : [`${file} schedules a delay without reading it`]),

          ...(/setTimeout\([^)]*,\s*(open|close)Delay\)/.test(text)
            ? [`${file} hands a raw delay to setTimeout`]
            : []),
        ];
      },
    );

    expect(offences).toEqual([]);
  });
});
