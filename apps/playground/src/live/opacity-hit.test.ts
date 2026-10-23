/**
 * Holds the arithmetic the `faded-hitbox-lifecycle` probe reads a window with,
 * and the claims its README section prints.
 *
 * The finding this file guards is that `opacity: 0` removes the ink and nothing
 * else: the box still lays out, keeps its Tab stop and stays in the pointer's
 * path, and a key reaches it while it holds focus. That is why a leaving surface
 * must write `pointerEvents: "none"` and why a dismissed shell that keeps its
 * controls mounted needs a shield — if the share removed the hitbox, both would
 * be ceremony and this file would be asserting a guard that does nothing.
 *
 * `node:fs` is deliberate, as in `hidden-subtree.test.ts`: this reads the
 * repository's own probe, view and Markdown, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  FADED_CHECKS,
  FADED_HEIGHT,
  FADED_IDS,
  FADED_KEY,
  FADED_OPACITY,
  FADED_PRESS_CASES,
  FADED_WIDTH,
  fadedReadout,
} from "./opacity-hit.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const probeSource = readFileSync(
  new URL("./opacity-hit-probe.tsx", import.meta.url),
  "utf8",
);

const section = (heading: string): string => {
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const after = readme.indexOf("\n### ", start + heading.length);
  return readme
    .slice(start, after === -1 ? readme.length : after)
    .replace(/\s+/g, " ");
};

describe("the faded hitbox", () => {
  it("mounts a faded control and two covered targets, with locators apart", () => {
    const ids = Object.values(FADED_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Arr.map(FADED_PRESS_CASES, (entry) => entry.aimedAt)).toEqual([
      FADED_IDS.control,
      FADED_IDS.coveredTarget,
      FADED_IDS.inertTarget,
    ]);
    // The rules are what the reader learns, not a restatement of the locator.
    expect(FADED_PRESS_CASES[0]?.rule).toContain("not the box");
    expect(FADED_PRESS_CASES[1]?.rule).toContain("pointer's path");
    expect(FADED_PRESS_CASES[2]?.rule).toContain("handler still runs");
  });

  it("paints the ghost at zero and keeps the box a control is built at", () => {
    expect(FADED_OPACITY).toBe(0);
    expect(FADED_WIDTH).toBe(200);
    expect(FADED_HEIGHT).toBe(32);
    expect(FADED_KEY).toBe("a");
  });

  it("prints the one readout shape every step is checked against", () => {
    expect(
      fadedReadout({
        faded: 0,
        keys: 0,
        cover: 0,
        target: 0,
        inertCover: 0,
        inertTarget: 0,
      }),
    ).toBe("faded=0 keys=0 cover=0 target=0 inertCover=0 inertTarget=0");
    expect(
      fadedReadout({
        faded: 1,
        keys: 1,
        cover: 1,
        target: 0,
        inertCover: 0,
        inertTarget: 1,
      }),
    ).toBe("faded=1 keys=1 cover=1 target=0 inertCover=0 inertTarget=1");
  });

  it("counts the checks the probe asserts", () => {
    expect(FADED_CHECKS).toBe(3 + 5 + 1 + 1 + 1 + 4 + 4);
    expect(FADED_CHECKS).toBe(19);
  });
});

describe("the faded-hitbox-lifecycle probe's record", () => {
  it("registers the probe with the input capability", () => {
    expect(
      Arr.filter(
        liveRegistry,
        (probe) => probe.id === "faded-hitbox-lifecycle",
      ),
    ).toEqual([
      {
        id: "faded-hitbox-lifecycle",
        title: expect.stringContaining("opacity zero"),
        capability: "input",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    const printed = Number(
      /(\d+) checks, `--only faded-hitbox-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(FADED_CHECKS);
  });

  it("prints the reads the window made, not only the constants", () => {
    const measured = section("### `faded-hitbox-lifecycle`");
    expect(measured.length).toBeGreaterThan(0);
    expect(measured).toContain("**200×32**");
    expect(measured).toContain("`faded=1`");
    expect(measured).toContain("`keys=1`");
    expect(measured).toContain("`cover=1 target=0`");
    expect(measured).toContain("`inertTarget=1`");
    expect(measured).toContain("`inertCover=1`");
  });

  it("states the rule the guards rest on", () => {
    const measured = section("### `faded-hitbox-lifecycle`");
    expect(measured).toContain("Opacity hides paint, not interaction");
    expect(measured).toContain("The guard is the opt-out");
    expect(measured).toContain("A key follows the focus, not the fade");
  });

  it("states the negative control it measured", () => {
    const measured = section("### `faded-hitbox-lifecycle`");
    expect(measured).toContain(
      "fails `the inert cover lets the press through to its target` with `inertCover=1 inertTarget=0`",
    );
  });
});

describe("the probe asks the question the section answers", () => {
  it("mounts a zero-share box and an inert cover", () => {
    expect(probeSource).toContain("opacity: FADED_OPACITY");
    expect(probeSource).toContain('pointerEvents: "none" as const');
    expect(probeSource).toContain("tabIndex={0}");
    expect(probeSource).toContain("ctx.host.click(FADED_IDS.control)");
    expect(probeSource).toContain("ctx.host.key(FADED_KEY)");
    expect(probeSource).toContain("ctx.host.click(FADED_IDS.inertTarget)");
  });
});
