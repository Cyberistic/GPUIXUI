import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import * as full from "@gpuixui/motion/react";
import * as presence from "@gpuixui/motion/react/presence";

const packageRoot = new URL("../../", import.meta.url);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const sources = (relative = "src/"): ReadonlyArray<string> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return sources(`${path}/`);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    },
  );
};

const motionSpecifiers = (source: string): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(
      Arr.fromIterable(source.matchAll(/from\s+"(@gpuixui\/motion[^"]*)"/g)),
      (match) => Option.fromNullishOr(match[1]),
    ),
  );

const lightEntries: ReadonlyArray<string> = [
  "@gpuixui/motion/timing",
  "@gpuixui/motion/presence",
  "@gpuixui/motion/react/presence",
];

const isTest = Str.endsWith(".test.ts");

describe("the motion entry a primitive reads", () => {
  it("publishes the provider and hook from both entries as the same bindings", () => {
    expect(presence.useMotionPreference).toBe(full.useMotionPreference);
    expect(presence.MotionProvider).toBe(full.MotionProvider);
  });

  it("reaches the light entry, and no physics entry", () => {
    expect(
      motionSpecifiers('import { x } from "@gpuixui/motion/react";'),
    ).toEqual(["@gpuixui/motion/react"]);

    const production: ReadonlyArray<string> = Arr.filter(
      sources(),
      (path) => !isTest(path),
    );
    const offenders = Arr.flatMap(production, (path) =>
      Arr.map(
        Arr.filter(
          motionSpecifiers(read(path)),
          (specifier) => !Arr.contains(lightEntries, specifier),
        ),
        (specifier) => `${path}: ${specifier}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("reads the reduced preference through the light entry in every control", () => {
    const readers = Arr.filter(sources(), (path) =>
      Str.includes("useMotionPreference")(read(path)),
    );

    expect(Arr.length(readers)).toBeGreaterThanOrEqual(8);
    expect(
      Arr.filter(
        readers,
        (path) =>
          !Str.includes('from "@gpuixui/motion/react/presence"')(read(path)),
      ),
    ).toEqual([]);
  });

  it("names the light entry where the rule is taught", () => {
    expect(read("README.md")).toContain(
      "### The reduced-motion preference loads from the light entry",
    );
    expect(read("README.md")).toContain("core/motion-entry.test.ts");
  });
});
