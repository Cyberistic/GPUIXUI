import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as full from "./react.js";
import * as presence from "./react/presence.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exported = (module: object): ReadonlyArray<string> => Object.keys(module);

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

    expect(source).toContain('from "../presence.js"');
    expect(source).toContain('from "../provider.js"');
    expect(source).toContain('from "../timing.js"');

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
