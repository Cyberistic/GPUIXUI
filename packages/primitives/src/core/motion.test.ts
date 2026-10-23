import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { reducedMotionOf } from "./motion.js";

const components = new URL("../components/", import.meta.url);

/** Every component source in the package, read once. */
const sources = Arr.map(
  Arr.filter(readdirSync(components), Str.endsWith(".tsx")),
  (file) => ({
    file,
    source: readFileSync(fileURLToPath(new URL(file, components)), "utf8"),
  }),
);

/**
 * The one rule behind every primitive's reduced motion.
 *
 * The bug this guards: each animated control took its own `reducedMotion` prop
 * and defaulted it to `false`, so an application that wrapped its tree in the
 * shared `MotionProvider preference="reduced"` still animated a tooltip, a
 * switch and a spinner unless it repeated the flag on every instance — the
 * motion context existed and no primitive read it.
 */
describe("reducedMotionOf", () => {
  it("reads the provider's preference when the control states none", () => {
    expect(reducedMotionOf(undefined, "reduced")).toBe(true);
    expect(reducedMotionOf(undefined, "animated")).toBe(false);
  });

  it("keeps a control's own answer over the provider's", () => {
    // One surface may hold — or move — against the application's default.
    expect(reducedMotionOf(false, "reduced")).toBe(false);
    expect(reducedMotionOf(true, "animated")).toBe(true);
  });

  it("routes every animated control through the one rule", () => {
    // The guard: a component that declares `reducedMotion` has to read the
    // provider-aware rule, and no control may keep the `!== true` test that
    // ignored the context — the shape the default flag had.
    const animated = Arr.filter(sources, ({ source }) =>
      source.includes("readonly reducedMotion?: boolean"),
    );
    expect(Arr.length(animated)).toBeGreaterThanOrEqual(8);
    expect(
      Arr.filter(
        animated,
        ({ source }) => !source.includes("reducedMotionOf("),
      ).map(({ file }) => file),
    ).toEqual([]);
    expect(
      Arr.filter(
        sources,
        ({ file, source }) =>
          !Str.endsWith(".test.tsx")(file) &&
          source.includes("props.reducedMotion !== true"),
      ).map(({ file }) => file),
    ).toEqual([]);
  });
});
