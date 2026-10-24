/**
 * The package's two React entries, and the cost that separates them.
 *
 * The bug this guards: the presence hooks were published only on
 * `@gpuixui/motion/react`, whose physics hooks drive a retained `MotionValue`
 * and reach the spring, inertia and timeline samplers. A surface that only
 * enters and leaves — every overlay, panel and reveal in `@gpuixui/components`
 * — therefore loaded physics it never sampled, while the components package's
 * surface budget claimed the samplers were not part of an overlay's cost. The
 * presence half has its own entry now. This suite holds the two entries to one
 * set of bindings and the light entry to the modules it may reach, so the split
 * cannot silently be undone by a hook moving back to the heavy entry.
 *
 * Sync `node:fs` and a guarded `JSON.parse` are deliberate and test-time only:
 * this is the same manifest-and-source read `docs.test.ts` performs, and a plain
 * `it` has no Effect runtime to provide `FileSystem` to.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as full from "./react.js";
import * as presence from "./react/presence.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A JSON object, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The runtime exports of a module; the cases compare them as a set. */
const exported = (module: object): ReadonlyArray<string> => Object.keys(module);

/** The samplers a fade never runs: the light entry may not reach one. */
const physics = [
  "./index.js",
  "./motion.js",
  "./spring.js",
  "./inertia.js",
  "./timeline.js",
  "./hook-read.js",
  "./easing.js",
] as const;

describe("the React entries", () => {
  it("publishes the presence half from both entries as the same bindings", () => {
    // A second binding is the failure: a tree wrapped in one entry's provider
    // would not be read by the other entry's hook, so the preference would
    // depend on which import a package happened to choose.
    expect(presence.useSurfaceTiming).toBe(full.useSurfaceTiming);
    expect(presence.useSurfacePresence).toBe(full.useSurfacePresence);
    expect(presence.MotionProvider).toBe(full.MotionProvider);
    expect(presence.useMotionPreference).toBe(full.useMotionPreference);
  });

  it("keeps the light entry to the presence half", () => {
    expect(exported(presence)).toEqual(
      expect.arrayContaining([
        "MotionProvider",
        "useMotionPreference",
        "useSurfacePresence",
        "useSurfaceTiming",
      ]),
    );
    expect(exported(presence)).toHaveLength(4);
    // The heavy entry still publishes every physics hook beside it, so the
    // split moved nothing out of the documented entry.
    expect(exported(full)).toEqual(
      expect.arrayContaining([
        "MotionProvider",
        "useInertia",
        "useMotion",
        "useMotionPreference",
        "useSpring",
        "useSurfacePresence",
        "useSurfaceTiming",
        "useTransition",
      ]),
    );
    expect(exported(full)).toHaveLength(8);
  });

  it("reaches no physics module from the light entry", () => {
    const source = read("./react/presence.ts");
    const offenders = physics.filter((specifier) =>
      source.includes(`"${specifier}"`),
    );
    expect(offenders).toEqual([]);
    // A scan that read nothing cannot satisfy the rule above: the three modules
    // the half really composes are named.
    expect(source).toContain('from "../presence.js"');
    expect(source).toContain('from "../provider.js"');
    expect(source).toContain('from "../timing.js"');
    // The rule has to be able to report a sampler, or it passes by reading
    // nothing — the heavy entry is the control.
    expect(
      physics.filter((specifier) =>
        read("./react.ts").includes(`"${specifier}"`),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("declares the subpath a consumer imports the light entry by", () => {
    const manifest: unknown = JSON.parse(read("../package.json"));
    const subpaths = isRecord(manifest) ? manifest["exports"] : undefined;
    const entry = isRecord(subpaths) ? subpaths["./react/presence"] : undefined;
    expect(isRecord(entry) ? entry["types"] : undefined).toBe(
      "./src/react/presence.ts",
    );
    expect(isRecord(entry) ? entry["default"] : undefined).toBe(
      "./src/react/presence.ts",
    );
  });
});
