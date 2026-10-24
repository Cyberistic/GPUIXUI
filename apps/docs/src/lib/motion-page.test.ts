import { readFileSync } from "node:fs";
import { linear, motionCurve } from "../../../../packages/motion/src/easing.js";
import {
  inertia,
  project,
  sampleInertia,
} from "../../../../packages/motion/src/inertia.js";
import {
  delayedTiming,
  presenceTiming,
} from "../../../../packages/motion/src/presence.js";
import {
  atRest,
  layoutSpring,
  retarget,
  sampleSpring,
  springPhysics,
} from "../../../../packages/motion/src/spring.js";
import {
  keyframe,
  sampleKeyframes,
  Sequence,
  stagger,
} from "../../../../packages/motion/src/timeline.js";
import {
  motionLevels,
  motionTimingOf,
  preferenceOf,
  reducedMotionOf,
} from "../../../../packages/motion/src/timing.js";
import { describe, expect, it } from "vitest";

/**
 * `/docs/motion` is the one page that documents `@gpuixui/motion`, and it
 * claimed the package while omitting one of its entry points: the presence seam
 * — `fadeFrom`, `presenceTiming`, `presenceMotion`, `presenceStyle`,
 * `exitWindowMs` and the rest — shipped and every overlay in the library takes
 * its frames, timing and mount window from it, but the page listed five modules
 * and showed two specifiers, so a reader writing their own surface could not
 * find the journey. The level table was hand-typed beside `motionLevels`, which
 * is the drift this repo holds to a derivation elsewhere.
 *
 * Both lists are read from the package now: the entry points from its `exports`
 * map, the presence values from the module's own `export const` lines, and the
 * five levels from `timing.ts`. A new export therefore fails until the page
 * names it, and a changed duration fails until the table follows.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A record, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifest: unknown = JSON.parse(read("packages/motion/package.json"));
const exportsMap =
  isRecord(manifest) && isRecord(manifest["exports"])
    ? manifest["exports"]
    : {};

/** `.` → `@gpuixui/motion`; `./presence` → `@gpuixui/motion/presence`. */
const specifier = (key: string): string =>
  key === "." ? "@gpuixui/motion" : `@gpuixui/motion/${key.slice(2)}`;

const entryPoints = Object.keys(exportsMap).map(specifier).toSorted();

const page = read("apps/docs/content/docs/motion.mdx").replace(/\s+/g, " ");

const presenceValues = [
  ...read("packages/motion/src/presence.ts").matchAll(/^export const (\w+)/gm),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/**
 * The React entry's exports: its `export const` hooks and the names its
 * `export { … }` blocks re-publish. The page's module table is the one list a
 * reader uses to find a hook, so it is held to this set rather than to a
 * hand-written row.
 */
const reactSource = read("packages/motion/src/react.ts");
const reactExports = [
  ...[...reactSource.matchAll(/^export const (\w+)/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  ),
  ...[...reactSource.matchAll(/export \{([^}]*)\}/g)].flatMap((match) =>
    (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "" && !name.startsWith("type ")),
  ),
];

/** The page's own React row, between its bars. */
const reactRow = (): string => {
  const start = page.indexOf("| React |");
  const end = page.indexOf("|", start + 9);
  return page.slice(start, end);
};

/** The page's own presence row, between its bars. */
const presenceRow = (): string => {
  const start = page.indexOf("| presence |");
  const end = page.indexOf("|", start + 12);
  return page.slice(start, end);
};

/** The page's own timing row, between its bars. */
const timingRow = (): string => {
  const start = page.indexOf("| timing |");
  const end = page.indexOf("|", start + 10);
  return page.slice(start, end);
};

/** The page's own easing row, between its bars. */
const easingRow = (): string => {
  const start = page.indexOf("| easing |");
  const end = page.indexOf("|", start + 10);
  return page.slice(start, end);
};

/** The values `easing.ts` exports. */
const easingExports = [
  ...read("packages/motion/src/easing.ts").matchAll(/^export const (\w+)/gm),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/** The values `timing.ts` exports. */
const timingExports = [
  ...read("packages/motion/src/timing.ts").matchAll(/^export const (\w+)/gm),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

interface Level {
  readonly name: string;
  readonly ms: string;
}

const declaredLevels: ReadonlyArray<Level> = (() => {
  const source = read("packages/motion/src/timing.ts");
  const block =
    source.split("export const motionLevels = {")[1]?.split("} as const")[0] ??
    "";

  return [...block.matchAll(/^\s*(\w+): (\d+),$/gm)].flatMap((match) =>
    match[1] === undefined || match[2] === undefined
      ? []
      : [{ name: match[1], ms: match[2] }],
  );
})();

/** The page's own level rows: a name, its milliseconds and the reason. */
const printedLevels: ReadonlyArray<Level> = [
  ...page.matchAll(/\| `(\w+)` \| (\d+) \|/g),
].flatMap((match) =>
  match[1] === undefined || match[2] === undefined
    ? []
    : [{ name: match[1], ms: match[2] }],
);

describe("the motion page", () => {
  it("names every entry point the package publishes", () => {
    const missing = entryPoints.filter(
      (entry) => !page.includes(`\`${entry}\``),
    );

    expect(entryPoints.length).toBeGreaterThanOrEqual(5);
    expect(missing).toEqual([]);
  });

  it("documents the presence seam every surface takes its journey from", () => {
    const missing = presenceValues.filter(
      (name) => !presenceRow().includes(`\`${name}\``),
    );

    expect(presenceValues.length).toBeGreaterThanOrEqual(8);
    expect(missing).toEqual([]);
    expect(page).toContain("## Presence");
    expect(page).toContain("@gpuixui/motion/presence");
  });

  it("names every React entry the page's module table lists", () => {
    // Bug guarded: the row listed four sampling hooks and none of the presence
    // hooks a surface composes, so a reader of the module table never learned
    // the mounted window exists — while the package publishes it here.
    const row = reactRow();
    const missing = reactExports.filter((name) => !row.includes(`\`${name}\``));

    expect(reactExports.length).toBeGreaterThanOrEqual(8);
    expect(row).not.toBe("");
    expect(missing).toEqual([]);
  });

  it("splits the presence table's ownership where the package does", () => {
    // Bug guarded: the page said the presence entry owns the mount window,
    // while the timer lives in the React entry (`useSurfacePresence`) and the
    // presence entry publishes only its conversion (`exitWindowMs`). A reader
    // was pointed at a module that cannot keep a leaving box mounted. The
    // React half is its own light entry now, so the timer is declared there and
    // the full entry re-exports it rather than owning a second binding.
    expect(read("packages/motion/src/react/presence.ts")).toContain(
      "export const useSurfacePresence = (",
    );
    expect(read("packages/motion/src/react.ts")).toContain(
      'from "./react/presence.js"',
    );
    expect(read("packages/motion/src/presence.ts")).toContain(
      "export const exitWindowMs = (",
    );
    expect(page).toContain("the **mounted window** itself is a timer");
    expect(page).toContain("`useSurfacePresence` keeps a leaving box painted");
    expect(page).not.toContain(
      "owns the three frames, the enter and exit timing and the mount window",
    );
  });

  it("teaches the fail-safe a stored preference takes", () => {
    // Bug guarded: the page taught the two literal names and the provider's
    // default, so a reader whose settings row decodes as NULL — or as a string
    // a release renamed — could not learn what their tree would do, or why the
    // fallback direction is the reduced one.
    expect(preferenceOf("animated")).toBe("animated");
    expect(preferenceOf("reduced")).toBe("reduced");
    expect(preferenceOf(null)).toBe("animated");
    expect(preferenceOf(undefined)).toBe("animated");
    expect(preferenceOf("middle")).toBe("reduced");

    expect(page).toContain("`preferenceOf`");
    expect(page).toContain("@gpuixui/motion/timing");
    expect(page).toContain("An absent value");
    expect(page).toContain('the house `"animated"`');
    expect(page).toContain("not one of those names");
    expect(page).toContain('takes `"reduced"`');
    expect(page).toContain("The two mistakes are not equal");
  });

  it("teaches the provider's preference to the physics hooks", () => {
    // Bug guarded: the provider is the default for every hook below it, the
    // four physics hooks included, and `options.reducedMotion` is the per-run
    // override. The page stopped at "a reduced run is a zero-duration
    // assignment", so a reader could not learn that one provider silences a
    // count-up, a width tween or a coast, or that a hook's own option wins.
    expect(reducedMotionOf(undefined, "reduced")).toBe(true);
    expect(reducedMotionOf(undefined, "animated")).toBe(false);
    expect(reducedMotionOf(false, "reduced")).toBe(false);
    expect(reducedMotionOf(true, "animated")).toBe(true);

    const row = timingRow();
    const listed = [...row.matchAll(/`(\w+)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );

    expect(timingExports).toContain("reducedMotionOf");
    expect(listed).toContain("preferenceOf");
    expect(listed).toContain("reducedMotionOf");
    expect(listed.filter((name) => !timingExports.includes(name))).toEqual([]);
    expect(page).toContain(
      "`useMotion`, `useSpring`, `useTransition` and `useInertia` read it",
    );
    expect(page).toContain("`options.reducedMotion` is the per-run override");
    expect(page).toContain("in both directions");
    expect(page).toContain("`reducedMotionOf(override, preference)`");
  });

  it("teaches the wait a no-journey timing drops", () => {
    // Bug guarded: the page listed `delayedTiming` in its module table and never
    // stated its rule, so a reader could only learn from the package that a
    // stagger's wait disappears — and it disappears for every journey the timing
    // cannot run, not only the zero a reduced run takes.
    const enter = presenceTiming("normal").enter;
    const noJourney = [
      { duration: 0 },
      {},
      { duration: Number.NaN },
      { duration: -0.2 },
      { duration: 1e308 },
    ];

    expect(noJourney.map((timing) => delayedTiming(timing, 80))).toEqual(
      noJourney,
    );
    // A readable run keeps its wait, so the rule cannot pass by dropping every
    // stagger.
    expect(delayedTiming(enter, 80).delay).toBe(0.08);
    expect(page).toContain(
      "**A wait rides with a journey that actually runs.**",
    );
    expect(page).toContain("the runtime sits the wait out");
    expect(page).toContain("absent");
    expect(page).toContain("`NaN`");
    expect(page).toContain("not positive");
    expect(page).toContain("overflow");
  });

  it("holds the easing row to the curves the module exports", () => {
    // Bug guarded: the row wrote its circular and overshooting curves as the
    // wildcards `circ*` and `back*` and never named `ease` or `motionCurve`, so
    // the module table a reader scans for a function was both incomplete and
    // unreadable as a list of imports.
    const row = easingRow();
    const listed = [...row.matchAll(/`(\w+)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );

    expect(easingExports.length).toBeGreaterThanOrEqual(12);
    expect(row).not.toBe("");
    expect(easingExports.filter((name) => !listed.includes(name))).toEqual([]);
    // A wildcard is not an export: `circ*` would read as `circ` here.
    expect(listed.filter((name) => !easingExports.includes(name))).toEqual([]);
  });

  it("teaches the curve a timing name stands for", () => {
    // Bug guarded: the page listed easing names and never said the sampled
    // curve under a name is the binding's own curve, while the runtime eases a
    // tweened box with that name — two halves of one transition could be
    // sampled at different speeds without a reader being told.
    const easeOut = motionCurve("easeOut")(0.5).toFixed(4);
    const ease = motionCurve("ease")(0.5).toFixed(4);

    expect(easeOut).toBe("0.6846");
    expect(ease).toBe("0.8024");
    // A name no release carries has no curve to imitate.
    expect(motionCurve("middle")).toBe(linear);

    expect(page).toContain(`motionCurve("easeOut")(0.5); // ${easeOut}`);
    expect(page).toContain(`motionCurve("ease")(0.5); // ${ease}`);
    expect(page).toContain("not cubic polynomials that share their labels");
    expect(page).toContain("`linear` is the progress itself");
    expect(page).toContain("`bezier(x1, y1, x2, y2)`");
    expect(page).toContain(
      "A name this release does not carry is the linear progress",
    );
  });

  it("prints the five durations motionLevels declares", () => {
    expect(declaredLevels.length).toBeGreaterThanOrEqual(5);
    expect(printedLevels).toEqual(declaredLevels);
  });

  it("teaches the timing a stored duration and options object get", () => {
    // Bug guarded: the page listed `motionTimingOf` in its module table and
    // never said what a store's duration or options object gets, so a reader
    // resuming a saved tween could not tell whether a `null` config or a `NaN`
    // duration throws, paints nothing, or moves with the house timing.
    expect(motionTimingOf(Number.NaN)).toEqual({
      duration: motionLevels.normal / 1000,
      ease: "easeInOut",
    });
    expect(motionTimingOf(-5)).toEqual(motionTimingOf(motionLevels.normal));
    // A config a store never wrote is the timing a caller who states nothing
    // gets, not a throw.
    expect(motionTimingOf(220, null)).toEqual(motionTimingOf(220));
    // A phase it does not name is the house one, and a named phase still wins.
    expect(motionTimingOf(220, { phase: "enter" })).toEqual({
      duration: 0.22,
      ease: "easeOut",
    });

    expect(page).toContain("`motionTimingOf`");
    expect(page).toContain("not positive and finite");
    expect(page).toContain("config as often as a literal");
    expect(page).toContain("`motionLevels.normal`");
    expect(page).toContain("`standard`");

    // The snippet's comments are the executed values, so a printed easing or
    // duration cannot drift from the timing a run takes.
    const enter = motionTimingOf(220, { phase: "enter" });
    const plain = motionTimingOf(220);
    expect(page).toContain(
      `// { duration: ${String(enter.duration)}, ease: "${String(enter.ease)}" }`,
    );
    expect(page).toContain(
      `// { duration: ${String(plain.duration)}, ease: "${String(plain.ease)}" }`,
    );
    expect(page).toContain(`the house ${String(motionLevels.normal)} ms`);
  });

  it("calls the frame builder with the arguments it declares", () => {
    // Bug guarded: the snippet called `fadeFrom("top")` with one argument
    // while the builder takes an axis and an offset, and the frames table
    // named the side-aware builder `fadeFrom` instead of `fadeFromSide`.
    expect(read("packages/motion/src/presence.ts")).toContain(
      "export const fadeFromSide = (",
    );
    expect(page).toContain('fadeFromSide("top", 8)');
    expect(page).toContain("`fadeFromSide(side, offset)`");
    expect(page).toContain("`fadeFrom(axis, offset)`");
    expect(page).not.toMatch(/fadeFrom\("top"\)/);
  });

  it("teaches how a spring is sampled and retargeted", () => {
    // Bug guarded: the page named `springPhysics`, `sampleSpring`, `atRest` and
    // `retarget` only in its module table, so a reader could not learn that a
    // spring is sampled at an elapsed time they own, that a sample inside the
    // rest thresholds is the target, or that `retarget` seeds the next run from
    // the frame on screen instead of restarting it.
    const mid = sampleSpring(layoutSpring, 0, 100, 0, 80);
    const next = retarget(mid, 200);

    expect(mid.settled).toBe(false);
    expect(mid.value.toFixed(1)).toBe("39.7");
    expect(next.value).toBe(mid.value);
    expect(next.velocity).toBe(mid.velocity);
    expect(next.target).toBe(200);
    expect(sampleSpring(layoutSpring, 0, 100, 0, 2000).settled).toBe(true);
    expect(atRest(layoutSpring, 100, 100, 0)).toBe(true);

    expect(page).toContain("## Springs");
    expect(page).toContain(
      `const mid = sampleSpring(layoutSpring, 0, 100, 0, 80); // ${mid.value.toFixed(1)} at 80 ms, still moving`,
    );
    expect(page).toContain("the same value and velocity, toward 200");
    expect(page).toContain(
      "`retarget` is how a running spring changes its mind",
    );
    expect(page).toContain("`atRest(physics, value, target, velocity)`");
    expect(page).toContain("`settled: true`");
  });

  it("teaches the physics a stored declaration gets", () => {
    // Bug guarded: `springPhysics` and the samplers repair a structural
    // declaration, and the page never said so — a saved physics whose stiffness
    // a decode lost, or one that carries no physics at all, reaches the sampler
    // as the house spring rather than as a `NaN` trajectory or a `TypeError`.
    const house = springPhysics({});

    expect(house).toEqual({
      mass: 1,
      stiffness: 260,
      damping: 28,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
    expect(springPhysics({ stiffness: Number.NaN })).toEqual(house);
    expect(retarget(null, 2)).toEqual({
      value: 0,
      velocity: 0,
      target: 2,
      settled: false,
    });

    expect(page).toContain(
      "`springPhysics({})` — stiffness `260`, damping `28`, mass `1`",
    );
    expect(page).toContain(
      "a declaration carrying no physics at all is that same house spring",
    );
    expect(page).toContain("`retarget(null, 2)` is a run from `0` toward `2`");
  });

  it("teaches how a keyframe set and its stagger are read", () => {
    // Bug guarded: the page named `keyframe`, `sampleKeyframes` and `stagger`
    // only in its module table, so a reader could not learn that a set is read
    // by its offsets rather than by declaration order, that a repeated offset is
    // an instant jump, or what a stored timeline paints.
    const journey = [keyframe(1, 40), keyframe(0, 0), keyframe(0.5, 100)];

    expect(sampleKeyframes(journey, 0.25)).toBe(50);
    expect(sampleKeyframes(journey, 0.75)).toBe(70);
    // Two frames at one offset jump, and the one declared last holds.
    const jump = [
      keyframe(0, 0),
      keyframe(0.5, 100),
      keyframe(0.5, 20),
      keyframe(1, 40),
    ];
    expect(sampleKeyframes(jump, 0.5)).toBe(20);
    expect(sampleKeyframes(jump, 0.75)).toBe(30);
    // A timeline a store never wrote is no stop.
    expect(sampleKeyframes(null, 0.5)).toBe(0);

    expect(stagger(40, 2, 4)).toBe(80);
    expect(stagger(40, 0, 4, "end")).toBe(120);
    expect(stagger(40, 0, 0)).toBe(0);

    expect(page).toContain("## Keyframes");
    expect(page).toContain(
      `sampleKeyframes(journey, 0.25); // ${sampleKeyframes(journey, 0.25)} — read by offset, not declaration order`,
    );
    expect(page).toContain(
      `sampleKeyframes(journey, 0.75); // ${sampleKeyframes(journey, 0.75)}`,
    );
    expect(page).toContain(`stagger(40, 2, 4); // ${stagger(40, 2, 4)} ms`);
    expect(page).toContain(
      `stagger(40, 0, 4, "end"); // ${stagger(40, 0, 4, "end")} ms`,
    );
    expect(page).toContain("two frames at one offset are an instant jump");
    expect(page).toContain("a set with none paints `0`");
  });

  it("teaches the sequence clock both entry points read", () => {
    // Bug guarded: `Sequence` appeared in the module table and nowhere else, so
    // a reader could not learn how steps are placed, or that `sample` and
    // `complete` read one clock — the two used to disagree about a clock before
    // the sequence and a sequence with nothing left to run.
    const sequence = new Sequence<string>().at("title", 0, 120).append(
      "body",
      180,
    );

    expect(sequence.duration()).toBe(300);
    expect(sequence.sample(-5).map((step) => step.state)).toEqual([
      "active",
      "pending",
    ]);
    expect(sequence.complete(-5)).toBe(false);
    expect(sequence.complete(sequence.duration())).toBe(true);

    expect(page).toContain(
      'const sequence = new Sequence<string>().at("title", 0, 120).append("body", 180);',
    );
    expect(page).toContain(`sequence.duration(); // ${sequence.duration()}`);
    expect(page).toContain("`sample`/`complete` read the clock the same way");
    expect(page).toContain("a clock before the sequence is its start");
  });

  it("teaches the rest a coast projects and the walls it stops at", () => {
    // Bug guarded: `inertia`, `project` and `sampleInertia` appeared only in the
    // module table, so a reader could not learn the rest a release settles on,
    // that a bound stops a coast only while it moves into it, or how a stored
    // declaration is repaired.
    const coast = inertia();

    expect(coast).toEqual({ tau: 0.35, min: null, max: null });
    expect(project(coast, 0, 600)).toBe(210);
    expect(sampleInertia(coast, 0, 600, 350).value.toFixed(1)).toBe("132.7");
    expect(project(inertia(350, { max: 100 }), 0, 600)).toBe(100);

    // Released on a wall, moving back into the range: a journey, not a rest.
    const inward = sampleInertia(inertia(350, { max: 100 }), 100, -200, 0);
    expect(inward.settled).toBe(false);
    expect(inward.velocity).toBe(-200);
    // Moving into it is the rest it stops at.
    expect(sampleInertia(inertia(350, { max: 100 }), 100, 200, 50).settled).toBe(
      true,
    );

    // A declaration a store wrote is read the way the samplers read it.
    expect(inertia(Number.NaN)).toEqual(coast);
    expect(inertia(350, { min: 100, max: 0 })).toEqual({
      tau: 0.35,
      min: 0,
      max: 100,
    });
    // A rest the arithmetic cannot represent lands on the release frame.
    expect(project(coast, 1.7e308, 1.7e308)).toBe(1.7e308);

    expect(page).toContain("## Inertia");
    expect(page).toContain(`project(coast, 0, 600); // ${project(coast, 0, 600)}`);
    expect(page).toContain(
      `sampleInertia(coast, 0, 600, 350).value; // ${sampleInertia(coast, 0, 600, 350).value.toFixed(1)}`,
    );
    expect(page).toContain(
      "a surface released *on* a wall with its velocity pointing back into the range",
    );
    expect(page).toContain("an inverted bound pair is swapped");
  });
});
