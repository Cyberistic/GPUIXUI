import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { motionLevelOf, motionLevels } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { surfaceLevelOf } from "./motion.js";

const sourceOf = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`./${name}.tsx`, import.meta.url)),
    "utf8",
  );

const surfaces = [
  "page-transition",
  "code-block",
  "copy-button",
  "theme-toggler",
] as const;

const stored: ReadonlyArray<unknown> = [
  "Faster",
  " normal",
  "",
  "None",
  "NONE",
  42,
  null,
  undefined,
  {},
  [],
  "toString",
  "__proto__",
];

describe("surfaceLevelOf", () => {
  it("keeps the one word the props use for no journey", () => {
    expect(surfaceLevelOf("none")).toBe("none");

    expect(motionLevelOf("none")).toBe("normal");
  });

  it("reads every other value through the table", () => {
    const names = R.keys(motionLevels);
    expect(Arr.map(names, surfaceLevelOf)).toEqual(names);
    expect(surfaceLevelOf("slow")).toBe("slow");

    expect(Arr.map(stored, surfaceLevelOf)).toEqual(
      Arr.map(stored, () => "normal"),
    );
  });

  it("is the reader the four surface props are typed and read with", () => {
    const missing = Arr.filter(surfaces, (name) => {
      const source = sourceOf(name);
      const reads =
        Str.includes("readonly level?: SurfaceLevel;")(source) &&
        Str.includes("level: storedLevel")(source) &&
        Str.includes("surfaceLevelOf(storedLevel)")(source);
      return !reads || Str.includes('MotionLevel | "none"')(source);
    });
    expect(missing).toEqual([]);
  });
});
