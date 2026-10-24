/**
 * The motion entry every primitive reads, and the physics it must not load.
 *
 * The bug this guards: `@gpuixui/motion` publishes two React entries — the full
 * one (`@gpuixui/motion/react`, whose physics hooks reach the spring, inertia and
 * timeline samplers) and the presence half (`@gpuixui/motion/react/presence`,
 * the provider and the two presence hooks, 4 modules / 29 KiB against the full
 * entry's 13 / 101). Every animated primitive read `useMotionPreference` from
 * the full entry, so a consumer that imported one `Button`, `Spinner` or
 * `Tooltip` loaded a physics engine the control never samples — and a composed
 * family that reaches a primitive paid it too.
 *
 * Both entries publish the same bindings, so this is a routing rule, not a
 * behaviour change: the identity case proves the provider and hook a tree
 * mounts are the ones the light entry hands out.
 *
 * Sync `node:fs` is deliberate and test-time only: this is the same
 * manifest-and-source read `core/motion.test.ts` performs, and a plain `it` has
 * no Effect runtime to provide `FileSystem` to.
 */

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

/** Every source file under a directory a consumer's toolchain reads. */
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

/** Every `@gpuixui/motion` entry a source imports, in file order. */
const motionSpecifiers = (source: string): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(
      Arr.fromIterable(source.matchAll(/from\s+"(@gpuixui\/motion[^"]*)"/g)),
      (match) => Option.fromNullishOr(match[1]),
    ),
  );

/** The entries that carry a fade, a level table or the preference only. */
const lightEntries: ReadonlyArray<string> = [
  "@gpuixui/motion/timing",
  "@gpuixui/motion/presence",
  "@gpuixui/motion/react/presence",
];

const isTest = Str.endsWith(".test.ts");

describe("the motion entry a primitive reads", () => {
  it("publishes the provider and hook from both entries as the same bindings", () => {
    // A second binding would make the preference depend on which entry a
    // package happened to import: a tree under one provider would not be read
    // by the other entry's hook.
    expect(presence.useMotionPreference).toBe(full.useMotionPreference);
    expect(presence.MotionProvider).toBe(full.MotionProvider);
  });

  it("reaches the light entry, and no physics entry", () => {
    // The unit control: the reader must report the full entry it is told to
    // refuse, or a scan that read nothing would pass the case below.
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
    // A tree with fewer controls than this means the scan lost the package.
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
    const seam = read("src/core/motion.ts");
    expect(seam).toContain("`@gpuixui/motion/react/presence`");
    expect(seam).not.toContain("`@gpuixui/motion/react`");
    // The package's own map of what a consumer loads has to say where the
    // preference comes from, beside the two subpath routes it documents.
    expect(read("README.md")).toContain(
      "### The reduced-motion preference loads from the light entry",
    );
    expect(read("README.md")).toContain("core/motion-entry.test.ts");
  });
});
