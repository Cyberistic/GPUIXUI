import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { reducedMotionOf as published } from "@gpuixui/motion/timing";
import { reducedMotionOf } from "./motion.js";

const components = new URL("../components/", import.meta.url);

const sources = Arr.map(
  Arr.filter(readdirSync(components), Str.endsWith(".tsx")),
  (file) => ({
    file,
    source: readFileSync(fileURLToPath(new URL(file, components)), "utf8"),
  }),
);

describe("reducedMotionOf", () => {
  it("reads the provider's preference when the control states none", () => {
    expect(reducedMotionOf(undefined, "reduced")).toBe(true);
    expect(reducedMotionOf(undefined, "animated")).toBe(false);
  });

  it("keeps a control's own answer over the provider's", () => {
    expect(reducedMotionOf(false, "reduced")).toBe(false);
    expect(reducedMotionOf(true, "animated")).toBe(true);
  });

  it("is the motion package's own rule, not a second copy", () => {
    expect(reducedMotionOf).toBe(published);
  });

  it("routes every animated control through the one rule", () => {
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
