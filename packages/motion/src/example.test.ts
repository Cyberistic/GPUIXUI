/**
 * The usage example is run, and it stays out of the published build.
 *
 * Two defects this guards. `src/example.ts` was named so the build config's
 * `*.example.ts` exclusion did not match it, so `nub run --filter
 * @gpuixui/motion build` published `dist/example.js` — a usage module the
 * package's own header promised was excluded — while every suite stayed green
 * because an example is not imported by anything. And nothing called the
 * example, so a break in the documented composition (`retarget`, a bezier
 * tween, `stagger`, a keyed `Sequence`, `sampleKeyframes`, a bounded coast)
 * compiled and shipped unexercised.
 *
 * `node:fs` is a test-time repository read, the standing exception
 * `packages/components`' `examples.test.ts` records: no runtime module imports
 * it. The package has no `effect` dependency, so the guard reads the config with
 * the same native helpers `docs.test.ts` uses.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compositionExample,
  presenceCompositionExample,
  presenceWindowExample,
  reducedMotionExample,
  springExample,
} from "./api.example.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A JSON object, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The build config's exclude globs, or a failure when it carries none. */
const excluded = ((): ReadonlyArray<string> => {
  const config: unknown = JSON.parse(read("../tsconfig.build.json"));
  const list = isRecord(config) ? config["exclude"] : undefined;
  if (!Array.isArray(list)) {
    throw new Error("example: tsconfig.build.json carries no exclude list");
  }
  return list.map((glob) => {
    if (typeof glob !== "string") {
      throw new Error("example: an exclude entry is not a glob");
    }
    return glob;
  });
})();

/** A marker for the `**` a `tsconfig` exclude may carry. */
const GLOBSTAR = "\u0000";

/**
 * A `tsconfig` exclude glob as the paths it matches.
 *
 * `*` stays inside one path segment and a double-star segment spans any number
 * of them, which is the subset the build config uses.
 */
const globToRegExp = (glob: string): RegExp => {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const marked = escaped.replaceAll("**/", GLOBSTAR);
  const starred = marked.replaceAll("*", "[^/]*");
  return new RegExp(`^${starred.replaceAll(GLOBSTAR, "(?:.*/)?")}$`);
};

describe("the usage example", () => {
  it("reaches the documented values through the public API", () => {
    // A spring retargeted mid-flight lands on the new target; reduced motion
    // completes immediately at the one it was given.
    expect(springExample()).toBeCloseTo(2, 6);
    expect(reducedMotionExample()).toBe(1);

    const [
      eased = 0,
      first = 0,
      second = 0,
      third = 0,
      sequenceEnd = 0,
      keyed = 0,
      coast = 0,
    ] = compositionExample();

    // The bezier tween is `0.96…` at its half way, not the linear `0.5` a
    // dropped curve would paint.
    expect(eased).toBeGreaterThan(0.9);
    expect(eased).toBeLessThan(1);
    expect([first, second, third]).toEqual([0, 20, 40]);
    // Three 100 ms steps staggered by 20 ms end at the last step's own end.
    expect(sequenceEnd).toBe(140);
    expect(keyed).toBe(50);
    // A bounded coast accumulates from its release towards, but never past,
    // the projected rest.
    expect(coast).toBeGreaterThan(0);
    expect(coast).toBeLessThan(50);
  });

  it("counts a leaving surface's window from the timing, never shorter", () => {
    // The bug this guards: a negative wait reached the arithmetic and shortened
    // the window, so the documented example unmounted a box before the tween it
    // paints ended. `presenceTiming("normal")` is 200 ms, and the 100 ms wait is
    // no wait rather than 100 ms subtracted from it.
    expect(presenceWindowExample()).toEqual([200, 320]);
  });

  it("composes the frames, the timing and the pointer rule a surface paints", () => {
    // The composition the README teaches: an anchored panel below its trigger
    // starts toward the trigger (`top: -4`) and rests at `0`, the exit retraces
    // that travel, the enter decelerates and the exit accelerates, and only the
    // resting surface is a pointer target.
    const { entering, leaving, pointsAtRest } = presenceCompositionExample();
    expect(entering).toEqual({
      initial: { opacity: 0, top: -4 },
      animate: { opacity: 1, top: 0 },
      transition: { duration: 0.2, ease: "easeOut" },
    });
    expect(leaving).toEqual({
      initial: { opacity: 0, top: -4 },
      animate: { opacity: 0, top: -4 },
      transition: { duration: 0.2, ease: "easeIn" },
    });
    expect(pointsAtRest).toBe(true);
  });

  it("is excluded from the build by the name it carries", () => {
    const examples = readdirSync(new URL(".", import.meta.url)).filter(
      (name) => name.endsWith("example.ts") && !name.endsWith(".test.ts"),
    );
    // A scan that finds no example cannot pass vacuously: the package has one.
    expect(examples.length).toBeGreaterThan(0);
    const shipped = examples.filter(
      (name) =>
        !excluded.some((glob) => globToRegExp(glob).test(`src/${name}`)),
    );
    expect(shipped).toEqual([]);
  });

  it("is not part of the public API", () => {
    expect(read("./index.ts")).not.toContain("example");
  });
});
