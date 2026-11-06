import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compositionExample,
  preferenceExample,
  presenceCompositionExample,
  presenceWindowExample,
  reducedMotionExample,
  springExample,
  storedConfigExample,
  storedLevelExample,
} from "./api.example.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const GLOBSTAR = "\u0000";

const globToRegExp = (glob: string): RegExp => {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const marked = escaped.replaceAll("**/", GLOBSTAR);
  const starred = marked.replaceAll("*", "[^/]*");
  return new RegExp(`^${starred.replaceAll(GLOBSTAR, "(?:.*/)?")}$`);
};

describe("the usage example", () => {
  it("reaches the documented values through the public API", () => {
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

    expect(eased).toBeGreaterThan(0.9);
    expect(eased).toBeLessThan(1);
    expect([first, second, third]).toEqual([0, 20, 40]);

    expect(sequenceEnd).toBe(140);
    expect(keyed).toBe(50);

    expect(coast).toBeGreaterThan(0);
    expect(coast).toBeLessThan(50);
  });

  it("resolves the preference a run moves with", () => {
    expect(preferenceExample()).toEqual([
      true,
      false,
      false,
      true,
      true,
      false,
    ]);
  });

  it("takes the values a decoded config wrote, on the ports that read them", () => {
    const stored = storedConfigExample();
    expect(stored.stockPreference).toEqual({
      enter: { duration: 0 },
      exit: { duration: 0 },
    });
    expect(stored.stockPhase).toEqual({ duration: 0.22, ease: "easeInOut" });
    expect(stored.droppedEasing).toEqual({ duration: 0.2 });
    expect(stored.composition).toEqual({
      initial: { opacity: 0, top: -4 },
      animate: { opacity: 1, top: 0 },
      transition: { duration: 0.2 },
    });
  });

  it("reads a stored animation speed where the caller owns it", () => {
    const stored = storedLevelExample();
    expect(stored.saved).toEqual({ duration: 0.32, ease: "easeInOut" });

    const house = { duration: 0.2, ease: "easeInOut" };
    expect(stored.dropped).toEqual(house);
    expect(stored.empty).toEqual(house);
    expect(stored.nested).toEqual(house);
    expect(stored.timed).toEqual({
      enter: { duration: 0.2, ease: "easeOut" },
      exit: { duration: 0.2, ease: "easeIn" },
    });

    expect(stored.reduced).toEqual({ duration: 0 });
  });

  it("counts a leaving surface's window from the timing, never shorter", () => {
    expect(presenceWindowExample()).toEqual([200, 320, 0]);
  });

  it("composes the frames, the timing and the pointer rule a surface paints", () => {
    const { entering, leaving, stored, pointsAtRest } =
      presenceCompositionExample();
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

    expect(stored).toEqual({
      initial: { opacity: 0 },
      animate: {},
      transition: { duration: 0.2 },
    });
    expect(pointsAtRest).toBe(true);
  });

  it("is excluded from the build by the name it carries", () => {
    const examples = readdirSync(new URL(".", import.meta.url)).filter(
      (name) => name.endsWith("example.ts") && !name.endsWith(".test.ts"),
    );

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
