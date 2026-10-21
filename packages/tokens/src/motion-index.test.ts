/**
 * Guards the defect plan 519 fixes: `MotionLevel` and `MotionPhase` were
 * key-only types, so nothing owned the motion scale at runtime. `docs.test.ts`
 * and `inventory.test.ts` derived the levels with
 * `Object.keys(motion).filter((key) => key !== "ease")` — a `string[]` that
 * would adopt a new field before the documents did — and
 * `motion-contract.test.ts` retyped five of the six levels by hand.
 *
 * The completeness cases below fail when a timing or easing phase is added to
 * the record without joining `motionLevels`/`motionPhases`; the document cases
 * fail when the public prose stops naming the indexes. `node:fs` is deliberate,
 * as in `docs.test.ts`: a policy check over the tree's own files, and the
 * package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isMotionEasingName,
  motion,
  motionEasings,
  motionLevels,
  motionPhases,
  motionTransition,
} from "./motion.js";
import { motionScale } from "./motion-levels.example.js";
import { extendTheme, lightTheme } from "./theme.js";
import { themeMetricFailures } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";

const source = (url: URL): string => readFileSync(url, "utf8");

const catalogue = source(new URL("../../../docs/tokens.md", import.meta.url));
const readme = source(new URL("../README.md", import.meta.url));
const ledger = source(new URL("../../../COMPONENTS.md", import.meta.url));

const recordLevels = Object.keys(motion).filter((key) => key !== "ease");
const recordPhases = Object.keys(motion.ease);

const countWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const countWord = (count: number): string => countWords[count] ?? String(count);

describe("the motion scale's ordered indexes", () => {
  it("covers every timing in the record, in documentation order", () => {
    expect([...motionLevels]).toEqual(recordLevels);
    expect([...motionLevels]).toEqual([
      "none",
      "step",
      "fast",
      "normal",
      "slow",
      "pulse",
    ]);
  });

  it("covers every easing phase in the record, in documentation order", () => {
    expect([...motionPhases]).toEqual(recordPhases);
    expect([...motionPhases]).toEqual(["standard", "enter", "exit", "linear"]);
  });

  it("resolves every index member through the public helper", () => {
    motionLevels.forEach((level) => {
      expect(motionTransition(lightTheme, level).duration).toBe(
        motion[level] / 1000,
      );
    });
    motionPhases.forEach((phase) => {
      expect(motionTransition(lightTheme, "normal", phase).ease).toBe(
        motion.ease[phase],
      );
    });
  });

  it("names both indexes in the catalogue, README and ledger", () => {
    const sentence =
      `\`motionLevels\` lists the ${countWord(motionLevels.length)} levels ` +
      `in this order and \`motionPhases\` the ` +
      `${countWord(motionPhases.length)} easing phases`;
    expect(catalogue.replace(/\s+/g, " ")).toContain(sentence);
    [readme, ledger].forEach((document) => {
      expect(document).toContain("`motionLevels`");
      expect(document).toContain("`motionPhases`");
    });
  });

  it("runs the motion table against the indexes", () => {
    const table = motionScale();
    expect(table.levels.map(({ level }) => level)).toEqual([...motionLevels]);
    table.levels.forEach(({ level, milliseconds }) => {
      expect(milliseconds).toBe(motion[level]);
    });
    expect(table.phases.map(({ phase }) => phase)).toEqual([...motionPhases]);
    table.phases.forEach(({ phase, ease }) => {
      expect(ease).toBe(motion.ease[phase]);
    });
  });
});

/**
 * Guards the gap plan 836 closes: the motion scale owned its six levels and four
 * phases, but `MotionEasing`'s five names were a bare union — no ordered index
 * and no boundary guard — so a settings row that persisted a curve had to retype
 * the names, which is what plans 067, 068, 096 and 305 removed for every other
 * persisted union. Plan 834 made an edited easing storable; this is the other
 * half, narrowing the stored name back.
 */
describe("the easing names", () => {
  it("indexes the names the runtime accepts, in documentation order", () => {
    expect([...motionEasings]).toEqual([
      "linear",
      "ease",
      "easeIn",
      "easeOut",
      "easeInOut",
    ]);
  });

  it("covers every shipped phase value", () => {
    expect(shippedThemes.length).toBeGreaterThan(0);
    shippedThemes.forEach(({ theme }) => {
      motionPhases.forEach((phase) => {
        expect(motionEasings, `${theme.name} ${phase}`).toContain(
          theme.motion.ease[phase],
        );
      });
    });
  });

  it("narrows every member and rejects anything that is not a name", () => {
    motionEasings.forEach((easing) => {
      expect(isMotionEasingName(easing), easing).toBe(true);
    });

    const notNames: ReadonlyArray<unknown> = [
      "ease-out",
      "EaseInOut",
      "easein",
      42,
      null,
      undefined,
      [],
      {},
      [0.4, 0, 0.2, 1],
    ];
    notNames.forEach((value) => {
      expect(isMotionEasingName(value), JSON.stringify(value)).toBe(false);
    });
  });

  it("keeps a bezier tuple a value the metric contract governs", () => {
    const themed = extendTheme(lightTheme, {
      motion: { ease: { enter: [0.4, 0, 0.2, 1] } },
    });

    expect(themed.motion.ease.enter).toEqual([0.4, 0, 0.2, 1]);
    expect(themeMetricFailures(themed)).toEqual([]);
    // A tuple is an easing but not a name, and the guard says so.
    expect(isMotionEasingName(themed.motion.ease.enter)).toBe(false);
  });

  it("names the index and the guard in the catalogue, README and ledger", () => {
    const sentence =
      `\`motionEasings\` lists the ${countWord(motionEasings.length)} names ` +
      "the runtime accepts";
    expect(catalogue.replace(/\s+/g, " ")).toContain(sentence);
    [catalogue, readme, ledger].forEach((document) => {
      expect(document).toContain("`isMotionEasingName`");
      expect(document).toContain("`motionEasings`");
    });
  });
});
