/**
 * The package-surface budget.
 *
 * `@gpuixui/components` is consumed from source, so the entry's import graph is
 * what every consumer pays for: every family re-exported from one barrel. The
 * cost was unmeasured — no number backed "this package is heavy to load" — and
 * a family that reached a new package would have added load time to every
 * consumer with nothing to notice it.
 *
 * `src/surface.ts` is the measurement; `scripts/surface-io.ts` reads this
 * workspace (the same resolver the report command uses, so the gate and the
 * printed numbers cannot disagree); `src/surface.budget.ts` records the ceiling.
 * The scanner itself is tested with literal sources, because the rules that
 * matter — type-only statements cost nothing, a multi-line clause is one import,
 * an exported string is not a specifier — are invisible in the totals.
 */

import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { measurePackageSurface } from "../scripts/surface-io.js";
import {
  measureSurface,
  runtimeSpecifiers,
  type SurfaceIO,
} from "./surface.js";
import { surfaceBudget } from "./surface.budget.js";

const scan = (source: string): ReadonlyArray<string> =>
  runtimeSpecifiers(source);

/** A graph made of literal sources: `resolves` are the paths an import may reach. */
const fakeIo = (input: {
  readonly files: Readonly<Record<string, string>>;
  readonly resolves?: ReadonlyArray<string>;
  readonly groups?: Readonly<Record<string, string>>;
}): SurfaceIO => ({
  read: (path) => Option.fromNullishOr(input.files[path]),
  resolve: (_from, specifier) =>
    Arr.contains(input.resolves ?? [], specifier)
      ? Option.some(specifier)
      : Option.none(),
  group: (path) => input.groups?.[path] ?? "@gpuixui/components",
});

describe("runtime specifiers", () => {
  it("counts a static import, a re-export and a side-effect import", () => {
    expect(
      scan(
        [
          'import { A } from "@gpuixui/tw";',
          'import Default from "./default.js";',
          'export * from "./star.js";',
          'export { B } from "./named.js";',
          'import "./side-effect.js";',
        ].join("\n"),
      ),
    ).toEqual([
      "@gpuixui/tw",
      "./default.js",
      "./star.js",
      "./named.js",
      "./side-effect.js",
    ]);
  });

  it("reads a multi-line clause once, from its closing line", () => {
    const source = [
      "import {",
      "  first,",
      "  second,",
      '} from "./parts.js";',
      "import Default, {",
      "  third,",
      '} from "./split.js";',
    ].join("\n");
    expect(scan(source)).toEqual(["./parts.js", "./split.js"]);
  });

  it("ignores a type-only statement, a comment and a computed import", () => {
    const source = [
      'import type { A } from "./types.js";',
      `export type { B } from "./types.js";`,
      "export type {",
      "  C,",
      `} from "./types.js";`,
      '// import "./commented.js";',
      ' * import { D } from "./documented.js";',
      'const specifier = "./computed.js";',
      "const lazy = () => import(specifier);",
    ].join("\n");
    expect(scan(source)).toEqual([]);
  });

  it("does not read an exported string as a specifier", () => {
    // A real defect this caught: `export const systemUiFont = ".SystemUIFont"`
    // in `@gpuixui/tokens` was counted as an import of a package named
    // `.SystemUIFont`, because any line starting with `export` and containing a
    // quote looked like a re-export.
    const source = [
      'export const systemUiFont = ".SystemUIFont";',
      'export type Variant = "a" | "b";',
      'export interface Props extends Omit<Base, "style"> {}',
    ].join("\n");
    expect(scan(source)).toEqual([]);
  });

  it("counts a literal dynamic import, wherever it sits", () => {
    expect(scan('const load = () => import("./lazy.js");')).toEqual([
      "./lazy.js",
    ]);
  });
});

describe("the surface walk", () => {
  it("follows a module once through a cycle", () => {
    const surface = measureSurface(
      "./a",
      fakeIo({
        files: {
          "./a": 'import "./b";',
          "./b": 'import "./a";',
        },
        resolves: ["./a", "./b"],
      }),
    );
    expect(Arr.map(surface.modules, (module) => module.path)).toEqual([
      "./a",
      "./b",
    ]);
  });

  it("counts an external package only where the measured package imports it", () => {
    const surface = measureSurface(
      "./a",
      fakeIo({
        files: {
          "./a": 'import "./tw";\nimport "effect";',
          "./tw": 'import "zod";',
        },
        resolves: ["./a", "./tw"],
        groups: { "./tw": "@gpuixui/tw" },
      }),
    );
    expect(surface.dependencies).toEqual([{ name: "effect", imports: 1 }]);
    expect(Arr.map(surface.groups, (group) => group.name)).toEqual([
      "@gpuixui/components",
      "@gpuixui/tw",
    ]);
  });

  it("reports a relative specifier that resolves to no file", () => {
    const surface = measureSurface(
      "./a",
      fakeIo({ files: { "./a": 'import "./missing.js";' } }),
    );
    expect(surface.unresolved).toEqual(["./a -> ./missing.js"]);
  });

  it("reports a resolved module it cannot read", () => {
    const surface = measureSurface(
      "./a",
      fakeIo({
        files: { "./a": 'import "./gone.js";' },
        resolves: ["./gone.js"],
      }),
    );
    expect(surface.unreadable).toEqual(["./gone.js"]);
  });
});

describe("the recorded budget", () => {
  const surface = measurePackageSurface();
  const own = Option.getOrElse(
    Arr.findFirst(
      surface.groups,
      (group) => group.name === "@gpuixui/components",
    ),
    () => ({ name: "@gpuixui/components", modules: 0, bytes: 0 }),
  );

  /**
   * One family's graph: what a consumer of `@gpuixui/components/<family>` pays.
   *
   * The barrel re-exports every family, so the entry's graph answers a different
   * question from a consumer's. `motion-grid` is the animated family that draws
   * the entrance seam and nothing else, so its motion share is the seam's cost
   * rather than a physics hook's.
   */
  const family = measurePackageSurface(
    fileURLToPath(new URL("./motion-grid.tsx", import.meta.url)),
  );
  const familyMotion = Option.getOrElse(
    Arr.findFirst(family.groups, (group) => group.name === "@gpuixui/motion"),
    () => ({ name: "@gpuixui/motion", modules: 0, bytes: 0 }),
  );

  /** The modules of a package in one graph, by file name. */
  const moduleNames = (
    graph: ReadonlyArray<{ readonly path: string; readonly group: string }>,
    group: string,
  ): ReadonlyArray<string> =>
    Arr.map(
      Arr.filter(graph, (module) => module.group === group),
      (module) => module.path.slice(module.path.lastIndexOf("/") + 1),
    );

  it("measures a real graph, so the budget cannot pass on an empty walk", () => {
    expect(own.modules).toBeGreaterThan(50);
    expect(own.bytes).toBeGreaterThan(100 * 1024);
    expect(Arr.map(surface.groups, (group) => group.name)).toEqual(
      expect.arrayContaining([
        "@gpuixui/tokens",
        "@gpuixui/tw",
        "@gpuixui/icons",
        "@gpuixui/keyboard",
      ]),
    );
  });

  it("keeps the entry graph at the recorded module count", () => {
    expect(
      own.modules,
      "the entry's module count moved; run `nub scripts/surface.ts` and update src/surface.budget.ts with the reason",
    ).toBe(surfaceBudget.modules);
  });

  it("keeps the entry graph under the byte ceiling", () => {
    expect(own.bytes).toBeLessThanOrEqual(surfaceBudget.bytes);
  });

  it("imports only the packages the budget records", () => {
    expect(Arr.map(surface.dependencies, (entry) => entry.name)).toEqual(
      surfaceBudget.packages,
    );
  });

  it("reaches every module it imports", () => {
    expect(surface.unresolved).toEqual([]);
    expect(surface.unreadable).toEqual([]);
  });

  it("gives a family the presence half of motion, not its physics", () => {
    // The bug this guards: the seam imported `@gpuixui/motion/react` for the
    // provider and the two presence hooks, and that entry drives a retained
    // `MotionValue` — so every family that enters and leaves loaded the spring,
    // inertia, timeline and hook bookkeeping the fade never samples. The React
    // presence half is its own entry now, and a family that imports only the
    // seam pays for it alone.
    expect(family.unresolved).toEqual([]);
    expect(familyMotion.modules).toBe(surfaceBudget.familyMotion.modules);
    expect(familyMotion.bytes).toBeLessThanOrEqual(
      surfaceBudget.familyMotion.bytes,
    );
    // The names, so a sampler rejoining the route fails by name rather than by
    // a count a reader has to decode.
    const physics = [
      "easing.ts",
      "hook-read.ts",
      "inertia-read.ts",
      "inertia.ts",
      "motion.ts",
      "progress.ts",
      "react.ts",
      "spring.ts",
      "timeline.ts",
    ] as const;
    const present = moduleNames(family.modules, "@gpuixui/motion");
    expect(Arr.filter(present, (name) => Arr.contains(physics, name))).toEqual(
      [],
    );
    // The half it does pay is really there: a graph that reached no motion
    // module cannot satisfy the rule above by reading nothing.
    expect(present).toEqual(
      expect.arrayContaining(["presence.ts", "provider.ts", "timing.ts"]),
    );
    expect(present).toContain("presence.ts");
    expect(Arr.length(present)).toBeGreaterThanOrEqual(4);
  });
});
