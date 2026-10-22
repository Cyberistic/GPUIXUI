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
const progress = readRepo("packages/motion/src/progress.ts");
const motion = readRepo("packages/motion/src/motion.ts");
const inertia = readRepo("packages/motion/src/inertia.ts");
const timeline = readRepo("packages/motion/src/timeline.ts");
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

  it("places the repair in the samplers a hand-built value reaches", () => {
    // `Inertia` is structural, so `{ tau: NaN, min: null, max: 10 }` type-checks
    // and `inertia()` never runs. The page taught the repair as a property of
    // the constructor, which leaves a caller who builds one by hand expecting
    // the `NaN` both samplers used to answer.
    const declaration = (source: string, name: string): string => {
      const start = source.indexOf(`export const ${name} = (`);
      const end = source.indexOf("\nexport ", start + 1);
      return start === -1
        ? ""
        : source.slice(start, end === -1 ? undefined : end);
    };

    expect(inertia).toContain("const tauOf = (tau: number): number =>");
    expect(inertia).toContain(
      "const boundsOf = (min: number | null, max: number | null): Bounds =>",
    );
    expect(inertia).toContain(
      "const finiteOr = (value: number, fallback: number): number =>",
    );

    // Both samplers repair the value they are handed, so neither can rely on
    // `inertia()` having done it.
    ["project", "sampleInertia"].forEach((name) => {
      const body = declaration(inertia, name);
      expect(body, `${name} no longer reads its own time constant`).toContain(
        "tauOf(inertia.tau)",
      );
      expect(body, `${name} no longer reads its own bounds`).toContain(
        "boundsOf(inertia.min, inertia.max)",
      );
    });

    expect(timeline).toContain(
      "const stopsOf = (frames: readonly Keyframe[]): ReadonlyArray<Keyframe> =>",
    );
    expect(timeline).toContain(
      "const finiteOr = (value: number, fallback: number): number =>",
    );
    // The drop happens in the sample, so a list built without `keyframe()` is
    // repaired the same way, and a `Sequence` step is repaired on insertion.
    expect(timeline).toContain("const stops = stopsOf(frames);");
    expect(timeline).toContain("startMs: finiteOr(startMs, 0)");
    // The duration repair's helper is the package's choice — a step whose
    // duration it cannot read is repaired either way — so the guard reads the
    // rule rather than the helper's name.
    expect(timeline).toMatch(/durationMs: \w+\(durationMs/);
    expect(timeline).toContain(
      "Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0",
    );

    expect(pageText).toContain(
      "The repair belongs to the sample, not the constructor",
    );
    expect(pageText).toContain("`{ tau: NaN, min: null, max: 10 }`");
    expect(pageText).toContain("repair what they are handed");
    expect(pageText).toContain("takes the house constant (`DEFAULT_TAU_MS`)");
    expect(pageText).toContain("an unreadable bound is dropped on its own");
    expect(pageText).toContain(
      "`project({ tau: NaN, min: null, max: 10 }, 0, 100)` is `10`",
    );

    expect(pageText).toContain("**is not a stop**");
    expect(pageText).toContain("a list with no readable frame samples `0`");
    expect(pageText).toContain("**completed on the first sample**");
    expect(pageText).toContain("is no wait rather than a `NaN` delay");
  });

  it("places the spring's repair in the samplers a hand-built physics reaches", () => {
    // `SpringPhysics` is structural, so a caller may build one without
    // `springPhysics()` — and a `NaN` damping made every formula answer `NaN`
    // (the spring jumped to its target in one frame) while a `NaN` rest
    // threshold meant the run never settled. The samplers read the *repaired*
    // physics, so the page has to teach the repair where a reader builds one
    // by hand rather than leaving it in the constructor's paragraph.
    expect(spring).toContain(
      "const physicsOf = (fields: SpringPhysicsParams): SpringPhysics =>",
    );
    expect(spring).toContain("const rest = physicsOf(physics);");
    expect(spring).toContain(
      "withinRest(physicsOf(physics), value, target, velocity)",
    );
    expect(spring).toContain(
      "mass: sanitizePositive(fields.mass, DEFAULT_MASS),",
    );
    expect(spring).toContain(
      "damping: sanitizeNonNegative(fields.damping, DEFAULT_DAMPING),",
    );
    expect(spring).toContain(
      "restDelta: sanitizePositive(fields.restDelta, DEFAULT_REST_DELTA),",
    );
    expect(spring).toContain(
      "restSpeed: sanitizePositive(fields.restSpeed, DEFAULT_REST_SPEED),",
    );

    expect(pageText).toContain(
      "**The repair belongs to the sampler, not the constructor.**",
    );
    expect(pageText).toContain(
      "`SpringPhysics` is an exported **structural** interface",
    );
    expect(pageText).toContain(
      "`{ mass: 1, stiffness: 260, damping: NaN }` type-checks",
    );
    expect(pageText).toContain(
      "`sampleSpring` and `atRest` therefore repair what they are handed",
    );
    expect(pageText).toContain(
      "a `NaN` damping made every formula answer `NaN`",
    );
    expect(pageText).toContain(
      "a `NaN` rest threshold meant the run never settled at all",
    );
  });

  it("places the curve's repair where a caller's own easing reaches", () => {
    // An `Easing` is a caller's function, so the package cannot trust it: a
    // curve that answers `NaN` would put that value into the interpolated
    // result and the run would paint nothing for its whole journey. The
    // progress is clamped and an unreadable answer falls back to the linear
    // progress — the rule the page has to carry, since `progress.ts` is private
    // and its helpers are not a surface a consumer has to learn.
    expect(progress).toContain(
      "export const clamp01 = (value: number): number =>",
    );
    expect(progress).toContain(
      "Number.isNaN(value) ? 0 : value < 0 ? 0 : value > 1 ? 1 : value",
    );
    expect(progress).toContain("export const eased = (");
    expect(progress).toContain("const unit = clamp01(progress);");
    expect(progress).toContain("return Number.isFinite(value) ? value : unit;");

    // The tween and the keyframe sampler both go through it.
    expect(motion).toContain(
      "const progress = eased(transition.easing, t / durationSec);",
    );
    expect(timeline).toContain(
      "return lo.value + (hi.value - lo.value) * eased(easing, local);",
    );

    expect(pageText).toContain("The curve is repaired the same way.");
    expect(pageText).toContain(
      "The progress a curve is handed is clamped into `[0, 1]`",
    );
    expect(pageText).toContain("is **not a curve**");
    expect(pageText).toContain("the run falls back to the linear progress");
    expect(pageText).toContain(
      "instead of painting nothing for its whole journey",
    );
    expect(pageText).toContain("`tween(300, myEasing)`");
  });

  it("places the sequence's end and its stagger rule where a driver waits", () => {
    // A step's own sample already reads a duration it cannot run as no
    // duration, but `duration()` added that duration to the step's start, so a
    // **negative** one landed the sequence's end *before* the step: a driver
    // waiting for the end stopped with a step unpainted. And `Sequence.stagger`
    // placed its members directly, so a negative step put one *before* the
    // group — already running when the sequence began — while the standalone
    // `stagger()` answered it differently. The page has to teach both rules.
    expect(timeline).toContain(
      "const durationOf = (durationMs: number): number =>",
    );
    expect(timeline).toContain(
      "Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0",
    );
    expect(timeline).toContain("durationMs: durationOf(durationMs),");
    expect(timeline).toContain("Math.max(max, step.startMs + step.durationMs)");

    expect(timeline).toContain("const staggerDelay = (");
    expect(timeline).toContain(
      "(Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0) * distance;",
    );
    expect(timeline).toContain(
      "): number => staggerDelay(stepMs, index, count, from);",
    );
    // The sequence's own group answers the same way, so a member cannot start
    // before the sequence does.
    expect(timeline).toContain(
      'startMs + staggerDelay(stepMs, index, count, "start"),',
    );

    expect(pageText).toContain(
      "a duration the step cannot **run** — one that is not a number, or one that is not positive — is no duration at all",
    );
    expect(pageText).toContain(
      "The sequence's own **end** follows the step it still has to run",
    );
    expect(pageText).toContain(
      "`duration()` never lands before a step the sequence still owes",
    );
    expect(pageText).toContain(
      "`complete()` cannot answer `true` while a step is pending",
    );
    expect(pageText).toContain("The two stagger entry points answer alike.");
    expect(pageText).toContain(
      "for the standalone `stagger()` **and** for `Sequence.stagger`",
    );
    expect(pageText).toContain(
      "the group's members all sit at the group's start",
    );
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
    // The page must carry the record's verdict, not the softer one it used to
    // print: detection is a measured absence (`not supported`), and a page that
    // called it `unverified` told a reader to wait for a probe that had run.
    expect(pageText).toContain("calls detection **`not supported`**");
    expect(pageText).toContain("a measured absence rather than an unrun probe");
    expect(pageText).not.toContain("unverified");
    expect(pageText).not.toContain("says not to claim a mode");
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
      [...printedPhaseRows].filter(
        ([phase, ease]) => ease !== phases.get(phase),
      ),
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
