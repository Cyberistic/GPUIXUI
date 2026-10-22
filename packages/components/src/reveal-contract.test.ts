/**
 * The measured reveal has one implementation.
 *
 * The bug this guards: `AccordionContent` re-implemented `AutoHeight` — the same
 * `onLayout` measurement, the same clipped outer box and the same
 * `presenceMotion` height tween — so the reveal's rules had two homes. A fix to
 * one (the exit retarget, the reduced preference) need not reach the other, and
 * the accordion's copy had already drifted: its animate frame ignored the closed
 * state and it had no `style` state for a caller. The disclosure parts now
 * compose `AutoHeight`, and this suite keeps the rule in one module: no source
 * may both measure a body and tween its height, and both disclosure parts must
 * import the reveal.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

/** Every readable source file under `relative`, recursively, minus suites. */
const sourcesUnder = (relative: string): ReadonlyArray<string> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return sourcesUnder(`${path}/`);
      if (!/\.tsx?$/.test(entry.name)) return [];
      if (Str.includes(".test.")(entry.name)) return [];
      return [path];
    },
  );
};

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

/** Whether a source mentions `needle` at all. */
const mentions = (relative: string, needle: string): boolean =>
  Str.includes(needle)(read(relative));

const sources = sourcesUnder("src/");

/** Where the reveal lives, and the parts that must compose it. */
const reveal = "src/auto-height.tsx";
const consumers = ["src/accordion.tsx", "src/collapsible.tsx"] as const;

describe("the measured reveal", () => {
  it("has one implementation, so its rules cannot drift apart", () => {
    // Measuring a body and tweening its height is `AutoHeight`'s job. A second
    // copy reads the same `onLayout` and paints the same frames, and the two
    // then have to be fixed twice.
    const offenders = Arr.filter(sources, (file) => {
      const body = read(file);
      return (
        Str.includes("onLayout")(body) && Str.includes("presenceMotion(")(body)
      );
    });
    expect(offenders).toEqual([reveal]);
  });

  it("is composed by both disclosure parts", () => {
    const missing = Arr.filter(
      consumers,
      (file) => !mentions(file, "auto-height.js"),
    );
    expect(missing).toEqual([]);
  });

  it("is not re-inlined by the accordion", () => {
    // The specific regression: the body measuring and tweening itself again.
    expect(mentions("src/accordion.tsx", "onLayout")).toBe(false);
    expect(mentions("src/accordion.tsx", "presenceMotion(")).toBe(false);
  });

  it("still measures and tweens, so the rule cannot pass by deletion", () => {
    expect(mentions(reveal, "onLayout")).toBe(true);
    expect(mentions(reveal, "presenceMotion(")).toBe(true);
    expect(mentions(reveal, "useSurfacePresence(")).toBe(true);
    expect(mentions(reveal, "height: 0")).toBe(true);
  });
});
