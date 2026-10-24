/**
 * Holds the `typing-text-lifecycle` fixture, the probe that paints it and the
 * section a plan reads.
 *
 * The gap this guards: the catalogue's *Typing text* row claims the reveal is a
 * timer over the string's **code points**, that a zero pace and the reduced
 * preference paint the whole string on the first frame, and that the caret
 * belongs to the journey — while the component's renderer suite reads its text
 * nodes only. This suite keeps the prefix algebra, the sample rule, the probe's
 * polling discipline and the printed count pointing at one another, so a probe
 * that stopped measuring the shaped run would fail here rather than pass there.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  allPrefixes,
  codePointCount,
  codePointPrefixes,
  isCodePointPrefix,
  isPartialReveal,
  partialLines,
  sawPartial,
  TYPING_CHECKS,
  TYPING_IDS,
  TYPING_TEXT,
  wholeLines,
} from "./typing-text.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./typing-text-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

/** The frames the probe sampled on 0.11.0 here. */
const EMOJI_SAMPLES: ReadonlyArray<string> = ["🦊", "🦊🦊", "🦊🦊🦊", "🦊🦊🦊"];

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const typingTextSteps");
  return probe.slice(start);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `typing-text-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the fixture", () => {
  it("counts characters as code points, not UTF-16 units", () => {
    // Three foxes are six UTF-16 units and three characters: the reveal counts
    // the second number.
    expect(codePointCount(TYPING_TEXT.emoji)).toBe(3);
    expect(TYPING_TEXT.emoji.length).toBe(6);
    expect(codePointPrefixes(TYPING_TEXT.emoji)).toEqual([
      "",
      "🦊",
      "🦊🦊",
      "🦊🦊🦊",
    ]);
    expect(isCodePointPrefix("", TYPING_TEXT.emoji)).toBe(true);
    expect(isCodePointPrefix("🦊\uD83E", TYPING_TEXT.emoji)).toBe(false);
  });

  it("keeps the strings long enough to be seen part way", () => {
    // A reveal shorter than the mount's own settle could only be sampled whole.
    expect(codePointCount(TYPING_TEXT.slow)).toBeGreaterThan(20);
    expect(codePointCount(TYPING_TEXT.instant)).toBeGreaterThan(0);
    expect(codePointCount(TYPING_TEXT.reduced)).toBeGreaterThan(0);
    expect(codePointCount(TYPING_TEXT.emoji)).toBeGreaterThan(1);
  });

  it("reads a painted line as the reveal it is", () => {
    expect(isPartialReveal("A window", TYPING_TEXT.slow)).toBe(true);
    expect(isPartialReveal(TYPING_TEXT.slow, TYPING_TEXT.slow)).toBe(false);
    expect(isPartialReveal("", TYPING_TEXT.slow)).toBe(false);
    expect(wholeLines([TYPING_TEXT.slow, "other"], TYPING_TEXT.slow)).toBe(1);
    expect(
      partialLines([TYPING_TEXT.slow, "A window", "A win"], TYPING_TEXT.slow),
    ).toBe(2);
  });

  it("accepts exactly the frames the window sampled", () => {
    // The lone fox is the measurement: a reveal cut by UTF-16 units would show
    // half a surrogate pair, which is neither a prefix nor a glyph.
    expect(allPrefixes(EMOJI_SAMPLES, TYPING_TEXT.emoji)).toBe(true);
    expect(sawPartial(EMOJI_SAMPLES, TYPING_TEXT.emoji)).toBe(true);
    expect(sawPartial([TYPING_TEXT.emoji], TYPING_TEXT.emoji)).toBe(false);
    expect(allPrefixes(["A window", "A window shapez"], TYPING_TEXT.slow)).toBe(
      false,
    );
  });

  it("keeps every id and string distinct", () => {
    const ids = Object.values(TYPING_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    const strings = Object.values(TYPING_TEXT);
    expect(new Set(strings).size).toBe(strings.length);
  });
});

describe("the probe", () => {
  it("is registered under the text capability", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "typing-text-lifecycle",
    );
    expect(entry?.capability).toBe("text");
  });

  it("is mounted by the live runner", () => {
    expect(scenarios).toContain('"typing-text-lifecycle": {');
    expect(scenarios).toContain("view: () => <TypingTextProbe />");
    expect(scenarios).toContain("steps: typingTextSteps");
    expect(scenarios).toContain(
      'import { TypingTextProbe, typingTextSteps } from "./typing-text-probe.js";',
    );
  });

  it("mounts all four frames the record prints", () => {
    expect(probe).toContain("testId={TYPING_IDS.slow}");
    expect(probe).toContain("testId={TYPING_IDS.instant}");
    expect(probe).toContain("testId={TYPING_IDS.emoji}");
    expect(probe).toContain("testId={TYPING_IDS.reduced}");
    expect(probe).toContain("text={TYPING_TEXT.slow}");
    expect(probe).toContain('<MotionProvider preference="reduced">');
    // The instant frame is the pace, not a reduced provider.
    expect(probe).toContain("speed={0}");
  });

  it("polls the real-time reveal rather than freezing a clock", () => {
    const steps = stepsOf();
    // The reveal is a timer, so a frozen renderer clock would not hold it.
    expect(steps).not.toContain("clockPause");
    expect(steps).not.toContain("clockFastForward");
    expect(probe).toContain("real-time timer");
    expect(steps).toContain("Effect.sleep(Duration.millis(TYPING_POLL_MS))");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    // The printed count is the run's own (the closures assert per call), so it
    // can only floor a probe: a site added without a count fails here.
    expect(TYPING_CHECKS).toBe(23);
    expect(TYPING_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${TYPING_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only typing-text-lifecycle`");
  });

  it("prints the frames the probe measured", () => {
    const section = sectionOf();
    expect(section).toContain("🦊");
    expect(section).toContain(
      "one character at the first read, two at the next",
    );
    expect(section).toContain("**148**");
    expect(section).toContain("**0**");
    expect(section).toContain("`Instant`");
  });

  it("names the probe among those measured alone", () => {
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`typing-text-lifecycle`");
  });

  it("states the half it does not claim", () => {
    // A window exposes no accessibility tree on this host, so the name is the
    // renderer suite's measurement — a section that dropped the caveat would be
    // claiming a tree it never read.
    expect(sectionOf()).toContain("automation tree");
    expect(sectionOf()).toContain("`typing-text.test.tsx`");
  });
});
