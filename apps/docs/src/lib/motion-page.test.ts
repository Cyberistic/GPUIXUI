import { describe, expect, it } from "vitest";
import {
  namedImports,
  publishedNames,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * `/docs/motion` is the only page that documents `@gpuixui/motion`, and the
 * package is not a dependency of the docs app — nothing in the build would
 * notice if the page taught a name the package no longer exports, printed a
 * preset's physics after it moved, or kept calling the animated surfaces
 * unwired after plan `600` Phase 0 landed.
 *
 * The page is held to four sources: the package's own modules (every value
 * export named, every snippet resolved), `spring.ts` and `motion.ts` for the
 * numbers it prints, the capability record for the measured runtime facts it
 * leans on, and `TODO.md` for the adoption it says is pending.
 */

const page = readRepo("apps/docs/content/docs/motion.mdx");
/** The page's prose with wrapping flattened, so a claim is not split by a line break. */
const pageText = page.replace(/\s+/g, " ");
const record = readRepo("docs/gpuix-capabilities.md");
const todo = readRepo("TODO.md");
const spring = readRepo("packages/motion/src/spring.ts");
const motion = readRepo("packages/motion/src/motion.ts");
const inertia = readRepo("packages/motion/src/inertia.ts");
const react = readRepo("packages/motion/src/react.ts");
const timing = readRepo("packages/motion/src/timing.ts");

/** The value names the package's modules export, in file order. */
const valueExports = (): ReadonlyArray<string> =>
  [
    "easing.ts",
    "spring.ts",
    "timeline.ts",
    "inertia.ts",
    "motion.ts",
    "react.ts",
    "timing.ts",
  ]
    .flatMap((file) =>
      [
        ...readRepo(`packages/motion/src/${file}`).matchAll(
          /^export (?:const|function|class|let) ([A-Za-z0-9_]+)/gm,
        ),
      ].map((match) => match[1] ?? ""),
    )
    .filter((name) => name !== "");

/** The preset table as the page prints it: name, stiffness, damping. */
const printedPresets = (): ReadonlyMap<string, readonly [string, string]> =>
  new Map(
    [
      ...page.matchAll(
        /^\|\s*`([a-zA-Z]+Spring)`\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm,
      ),
    ].map((match) => [
      match[1] ?? "",
      [match[2] ?? "", match[3] ?? ""] as const,
    ]),
  );

/** The presets as `spring.ts` declares them. */
const declaredPresets = (): ReadonlyMap<string, readonly [string, string]> =>
  new Map(
    [
      ...spring.matchAll(
        /export const ([a-zA-Z]+Spring): SpringPhysics = springPhysics\(\{\s*stiffness: (\d+),\s*damping: (\d+),/g,
      ),
    ].map((match) => [
      match[1] ?? "",
      [match[2] ?? "", match[3] ?? ""] as const,
    ]),
  );

/** One §3 row of the capability record, found by the start of its first cell. */
const recordRow = (capability: string): string =>
  record.split("\n").find((line) => line.startsWith(`| ${capability}`)) ?? "";

/** The rows of one `## ` section, so the level rows cannot be read as phase rows. */
const section = (heading: string): string => {
  const start = page.indexOf(`## ${heading}`);
  const end = page.indexOf("\n## ", start + 1);
  return start === -1 ? "" : page.slice(start, end === -1 ? undefined : end);
};

/** The house levels as the page's timing table prints them. */
const printedLevels = (): ReadonlyMap<string, string> => {
  const table = section("House timing");
  return new Map(
    [...table.matchAll(/^\|\s*`([a-z]+)`\s*\|\s*(\d+)\s*\|/gm)].map(
      (match) => [match[1] ?? "", match[2] ?? ""] as const,
    ),
  );
};

/** The levels `motionLevels` declares, name → milliseconds. */
const declaredLevels = (): ReadonlyMap<string, string> => {
  const block =
    /export const motionLevels = \{([\s\S]*?)\} as const;/.exec(timing)?.[1] ??
    "";
  return new Map(
    [...block.matchAll(/(\w+): (\d+),/g)].map(
      (match) => [match[1] ?? "", match[2] ?? ""] as const,
    ),
  );
};

/** The phase rows as the page prints them. */
const printedPhases = (): ReadonlyMap<string, string> => {
  const table = section("House timing");
  return new Map(
    [...table.matchAll(/^\|\s*`(enter|exit|standard)`\s*\|\s*`(\w+)`/gm)].map(
      (match) => [match[1] ?? "", match[2] ?? ""] as const,
    ),
  );
};

/** The easings `motionEasings` declares, phase → easing. */
const declaredPhases = (): ReadonlyMap<string, string> => {
  const block =
    /export const motionEasings[^{]*\{([\s\S]*?)\};/.exec(timing)?.[1] ?? "";
  return new Map(
    [...block.matchAll(/(\w+): "(\w+)",/g)].map(
      (match) => [match[1] ?? "", match[2] ?? ""] as const,
    ),
  );
};

describe("the motion page", () => {
  it("resolves every import it prints against the package's own exports", () => {
    const imports = namedImports(typescriptSnippets(page));

    // The scan has to have seen the snippets, or the assertion below is empty.
    expect(imports.length).toBeGreaterThanOrEqual(4);
    expect(unresolvedImports(imports, publishedNames())).toEqual([]);
  });

  it("documents every value the package's own modules export", () => {
    // A new export is a new capability, and this page is the only place a
    // reader can find it: an undocumented one would be invisible without being
    // absent.
    const names = valueExports();
    expect(names).toContain("layoutSpring");
    expect(names).toContain("MotionValue");
    expect(names).toContain("useSpring");

    const undocumented = names.filter((name) => !page.includes(name));
    expect(
      undocumented,
      "the page does not name these exports of @gpuixui/motion",
    ).toEqual([]);
  });

  it("prints the preset physics the package actually ships", () => {
    // The table is the page's most copyable number: a reader tunes against it
    // and a preset edit that leaves it behind teaches the old feel.
    const declared = declaredPresets();
    const printed = printedPresets();

    expect(declared.size).toBe(3);
    expect([...printed.keys()].sort()).toEqual([...declared.keys()].sort());
    expect(
      [...printed].filter(
        ([name, physics]) =>
          physics[0] !== declared.get(name)?.[0] ||
          physics[1] !== declared.get(name)?.[1],
      ),
    ).toEqual([]);
  });

  it("prints the two defaults the source declares", () => {
    // `tween()`'s duration and `inertia()`'s time constant are the numbers a
    // caller relies on when they pass neither.
    const tweenMs = /export const DEFAULT_TWEEN_MS = (\d+)/.exec(motion)?.[1];
    const tauMs = /const DEFAULT_TAU_MS = (\d+)/.exec(inertia)?.[1];

    expect(tweenMs).toBeDefined();
    expect(tauMs).toBeDefined();
    expect(page).toContain(`\`DEFAULT_TWEEN_MS\` of ${tweenMs} ms`);
    expect(page).toContain(`defaults to ${tauMs} ms`);
  });

  it("documents the initial option the hooks read once at mount", () => {
    // `MotionOptions.initial` is the one hook option that is not a policy:
    // without it a hook mounted at rest runs an entry animation the caller
    // never asked for, and the page named `reducedMotion` alone — an option a
    // reader could not discover from the only page that documents the package.
    const options =
      /export interface MotionOptions \{[\s\S]*?\n\}/.exec(react)?.[0] ?? "";
    expect(options, "MotionOptions is gone").toContain(
      "readonly initial?: number;",
    );

    expect(pageText).toContain("`{ reducedMotion, initial }`");
    expect(pageText).toContain("the value the **first** run starts from");
    expect(pageText).toContain("the default is the target");
    expect(pageText).toContain("read once at mount");
    expect(pageText).toContain("a later change is ignored");
  });

  it("describes reduced motion as the app's policy, not a runtime capability", () => {
    // The claim is true because the record proves the typings publish no
    // preference query and the value finishes an active run on the flag. If
    // either changed, the page would be telling a reader to supply a preference
    // the runtime reads.
    expect(recordRow("Reduced-motion detection")).toContain(
      "| not supported |",
    );
    expect(recordRow("Reduced-motion detection")).toContain(
      "publishes no preference query",
    );
    expect(motion).toContain("if (this.active && reducedMotion)");
    expect(motion).toContain("private finish(): void");

    expect(pageText).toContain("exposes no reduced-motion preference");
    expect(pageText).toContain("so the app supplies");
    expect(pageText).toContain(
      "finishes an active run immediately at its target",
    );
    expect(pageText).not.toContain("reads the system preference");
    expect(pageText).not.toContain("detects the system");
  });

  it("quotes the runtime's measured tween and its clip", () => {
    // These are runtime facts, so the page is held to the record's row rather
    // than to the sentence it prints, and the probe it cites has to be the one
    // the row cites.
    const row = recordRow("Animated geometry and content clipping");
    expect(row).toContain("| supported, with limits |");
    expect(row).toContain("motion-geometry");
    expect(row).toContain("40, 43, 117, 123, 221, 240, 240, 240");

    expect(pageText).toContain("`motion-geometry`");
    expect(pageText).toContain("`40, 43, 117, 123, 221, 240, 240, 240`");
    expect(pageText).toContain("onMotionComplete");
    expect(pageText).toContain("clips");
    expect(pageText).toContain("/docs/runtime#measured-in-a-window");
  });

  it("keeps the missing transform key tied to the record's verdict", () => {
    expect(recordRow("Per-element `transform`")).toContain("| not supported |");
    expect(pageText).toContain("no `transform` key");
    expect(pageText).toContain("cannot be painted or animated");
  });

  it("prints the house levels and phases the timing module declares", () => {
    // `motionTiming` is what every animated surface passes to the runtime, so
    // its two tables are the page's most-copied numbers. A level edited in
    // `timing.ts` would otherwise leave the docs teaching the old feel — and
    // the page printed the five durations in prose, where no guard could read
    // them.
    const declared = declaredLevels();
    const printed = printedLevels();

    expect(declared.size).toBe(5);
    expect(
      [...declared.keys()].filter((name) => !printed.has(name)),
      "the page does not print every house level",
    ).toEqual([]);
    expect(printed.size).toBe(declared.size);
    expect(
      [...printed].filter(([name, ms]) => ms !== declared.get(name)),
      "the page prints a level the timing module no longer declares",
    ).toEqual([]);

    const phases = declaredPhases();
    const printedPhaseRows = printedPhases();
    expect(phases.size).toBe(3);
    expect(printedPhaseRows.size).toBe(phases.size);
    expect(
      [...printedPhaseRows].filter(([phase, ease]) => ease !== phases.get(phase)),
    ).toEqual([]);

    // The unit the function converts to is the runtime's: the levels are
    // milliseconds and the returned duration is seconds.
    expect(timing).toContain("motionLevels[level] / 1000");
    expect(pageText).toContain("a duration in **seconds**");
    expect(timing).toContain(
      'if (options.preference === "reduced") return { duration: 0 };',
    );
    expect(pageText).toContain("the duration is `0` and no easing is named");
  });

  it("calls the animated surfaces unwired only while plan 600 owes the wiring", () => {
    // The page's honest admission has an end date. When Phase 0 lands, the
    // sentence has to change, so the claim cannot quietly outlive the wiring —
    // and the wiring cannot land while this page still calls it pending.
    const owed = todo.includes("`[ ]` Phase 0: wire `@gpuixui/motion` into");
    expect(page.includes("tracked as plan `600` Phase 0")).toBe(owed);
    expect(page).toContain("the **runtime's**");
  });
});
