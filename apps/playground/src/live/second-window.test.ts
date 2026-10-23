/**
 * Holds the `second-window-lifecycle` fixture, the probe that drives it and the
 * claim five documents make without a measurement.
 *
 * The claim is "the binding opens one window per process". Two Tier 4
 * interactions rest on it — detaching a tab into its own window, and dragging
 * one between windows — and it had only ever been inferred from the typings.
 * The probe asks the binding directly, and this file guards three things: the
 * classification of the answer, the typings half (there is no other window
 * verb to try), and the record that a reader follows to the evidence.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, registry, the installed typings and the prose, never
 * a runtime path.
 */
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  NO_SECOND_WINDOW,
  SECOND_WINDOW_CHECKS,
  SECOND_WINDOW_IDS,
  SECOND_WINDOW_MARKER,
  SECOND_WINDOW_REFUSAL,
  SECOND_WINDOW_SIZE,
  recordMarkerPress,
  recordSecondWindowAttempt,
  secondWindowOutcome,
  secondWindowReadout,
  type SecondWindowRenderer,
} from "./second-window.js";
import { liveRegistry } from "./registry.js";
import { liveProbeBodies } from "./scenarios.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const fixture = read("./second-window.ts");
const probe = read("./second-window-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const binding = read("../../node_modules/@gpuix/native/index.d.ts");

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const secondWindowSteps");
  const next = probe.indexOf("\nexport ", start + 1);
  return probe.slice(start, next === -1 ? undefined : next);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `second-window-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

/** One block of the installed typings, from its opening line to column zero. */
const blockOf = (source: string, opening: string): string => {
  const start = source.indexOf(opening);
  if (start === -1) return "";
  const end = source.indexOf("\n}", start);
  return source.slice(start, end === -1 ? undefined : end);
};

/** A renderer stub: `init` does what the case needs, `started` is what it says. */
const stub = (init: () => void, started: boolean): SecondWindowRenderer => ({
  init,
  isInitialized: () => started,
});

const outcomeOf = (
  second: SecondWindowRenderer,
): ReturnType<typeof secondWindowOutcome> => secondWindowOutcome(second);

describe("the fixture", () => {
  it("gives every locator its own id and mounts each one", () => {
    const entries = Object.entries(SECOND_WINDOW_IDS);
    expect(new Set(Arr.map(entries, ([, id]) => id)).size).toBe(entries.length);
    // The view names each id through the fixture, never as a literal.
    expect(
      Arr.filter(
        entries,
        ([key, id]) =>
          !probe.includes(`SECOND_WINDOW_IDS.${key}`) ||
          probe.includes(`"${id}"`),
      ),
    ).toEqual([]);
  });

  it("asks for a window the running one cannot be confused with", () => {
    // The attempted window is smaller than the runner's 900×520 and titled, so
    // a run that opened one would be visible rather than silent.
    expect(SECOND_WINDOW_SIZE.width).toBeLessThan(900);
    expect(SECOND_WINDOW_SIZE.height).toBeLessThan(520);
    expect(SECOND_WINDOW_REFUSAL).toContain("already exists");
  });

  it("paints a marker a frame can carry, in a literal", () => {
    // The paint check counts this exact colour, so it has to be a six-digit hex
    // rather than a role name or a translucent value.
    expect(SECOND_WINDOW_MARKER).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("classifies a refusal by the message it threw and the flag it left", () => {
    const refused = Effect.runSync(
      outcomeOf(
        stub(() => {
          throw new Error(SECOND_WINDOW_REFUSAL);
        }, false),
      ),
    );
    expect(refused).toEqual({
      _tag: "refused",
      message: SECOND_WINDOW_REFUSAL,
      started: false,
    });
  });

  it("reads started from the renderer rather than from the tag", () => {
    // Both directions: a window that opened but reports itself uninitialised is
    // not the same fact as one that opened, and the tally must not invent it.
    const opened = Effect.runSync(outcomeOf(stub(() => {}, true)));
    expect(opened).toEqual({ _tag: "opened", started: true });
    const half = Effect.runSync(outcomeOf(stub(() => {}, false)));
    expect(half).toEqual({ _tag: "opened", started: false });
    const refusedButRunning = Effect.runSync(
      outcomeOf(
        stub(() => {
          throw new Error("a renderer that kept running");
        }, true),
      ),
    );
    expect(refusedButRunning).toEqual({
      _tag: "refused",
      message: "a renderer that kept running",
      started: true,
    });
  });

  it("names a throw that carries no message instead of printing nothing", () => {
    const silent = Effect.runSync(
      outcomeOf(
        stub(() => {
          // A non-Error throw is what a binding wrapper can produce.
          throw { code: 7 };
        }, false),
      ),
    );
    expect(silent).toEqual({
      _tag: "refused",
      message: "the attempt threw without a message",
      started: false,
    });
  });

  it("tallies each attempt and keeps the last answer", () => {
    const once = recordSecondWindowAttempt(NO_SECOND_WINDOW, {
      _tag: "refused",
      message: SECOND_WINDOW_REFUSAL,
      started: false,
    });
    expect(once).toEqual({
      ...NO_SECOND_WINDOW,
      attempts: 1,
      refused: 1,
      started: false,
      last: SECOND_WINDOW_REFUSAL,
    });
    const twice = recordSecondWindowAttempt(once, {
      _tag: "opened",
      started: true,
    });
    expect(twice).toEqual({
      ...once,
      attempts: 2,
      opened: 1,
      started: true,
      last: "opened",
    });
    expect(recordMarkerPress(twice).after).toBe(1);
    // The marker count is the running window's, not the attempt's.
    expect(recordMarkerPress(twice).attempts).toBe(2);
  });

  it("prints one readout shape", () => {
    expect(secondWindowReadout(NO_SECOND_WINDOW)).toBe(
      "attempts=0 refused=0 opened=0 started=false after=0 last=none",
    );
  });

  it("counts the checks the steps assert", () => {
    const assertions = stepsOf().match(/ctx\.expect/g) ?? [];
    expect(assertions.length).toBe(SECOND_WINDOW_CHECKS);
  });
});

describe("the probe", () => {
  it("is registered under the workspace capability and mounted by the runner", () => {
    const entry = liveRegistry.find(
      (probe) => probe.id === "second-window-lifecycle",
    );
    expect(entry?.capability).toBe("workspace");
    expect(entry?.title).toContain("second window");
    expect(entry?.title).toContain("second process");
    expect(scenarios).toContain('"second-window-lifecycle": {');
    expect(scenarios).toContain("view: () => <SecondWindowProbe />");
    expect(scenarios).toContain("steps: secondWindowSteps");
    expect(liveProbeBodies["second-window-lifecycle"]).toBeDefined();
  });

  it("attempts the one window verb the binding publishes", () => {
    // The attempt is an application's attempt: a new renderer's `init`, with
    // the flag read afterwards. A probe that opened a window some other way
    // would not be measuring what a consumer can do.
    expect(probe).toContain("new GpuixRenderer()");
    expect(probe).toContain("second.init(");
    expect(probe).toContain("second.isInitialized()");
    expect(fixture).toContain("the only route to a window");
  });

  it("proves the running window survived, in the paint and in the press", () => {
    expect(probe).toContain("ctx.host.capture(CAPTURE)");
    expect(probe).toContain("Pixels.countColour(frame, marker) > 0");
    expect(probe).toContain("ctx.host.click(SECOND_WINDOW_IDS.marker)");
    expect(probe).toContain("after=1");
    expect(probe).toContain("backgroundColor: SECOND_WINDOW_MARKER");
  });

  it("asserts the measured refusal, not a prefix of it", () => {
    expect(stepsOf()).toContain("SECOND_WINDOW_REFUSAL");
    expect(stepsOf()).toContain("attempts=2 refused=2 opened=0 started=false");
  });
});

describe("the binding", () => {
  it("publishes no other window-opening verb", () => {
    // The other half of the claim: an app cannot side-step the refusal, because
    // `init` is the only verb that opens a window and `WindowOptions` names no
    // parent or child window.
    expect(/\b(open|create|new|add|spawn)Window/.test(binding)).toBe(false);
    const renderer = blockOf(binding, "export declare class GpuixRenderer {");
    expect(renderer).toContain("init(");
    expect(renderer).toContain("isInitialized(");
    const methods = [
      ...renderer.matchAll(/^\s{2}(?:get\s+)?([a-zA-Z]\w*)\s*[(:]/gm),
    ];
    const names = Arr.map(methods, (match) => match[1] ?? "");
    expect(names).toContain("init");
    expect(names).toContain("isInitialized");
    expect(Arr.filter(names, (name) => /window/i.test(name))).toEqual([
      "getWindowSize",
      "getWindowInsets",
      "activateWindow",
      "minimizeWindow",
      "zoomWindow",
      "setWindowTitle",
      "setWindowKeyEvents",
      "setWindowSelectionChange",
    ]);

    const options = blockOf(binding, "export interface WindowOptions {");
    expect(
      Arr.filter(
        ["parentWindow", "parentId", "childWindow", "windowId"],
        (field) => options.includes(field),
      ),
    ).toEqual([]);
  });
});

describe("the record", () => {
  it("documents the probe in registry order, with its count", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${SECOND_WINDOW_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only second-window-lifecycle`");
  });

  it("prints the measured refusal and the window that survived it", () => {
    const section = sectionOf();
    expect(section).toContain(SECOND_WINDOW_REFUSAL);
    expect(section).toContain("attempts=2 refused=2 opened=0 started=false");
    expect(section).toContain("after=1");
    expect(section).toContain("`.artifacts/live/second-window.png`");
  });

  it("names the probe among those measured alone, and the registry's size", () => {
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`second-window-lifecycle`");
  });

  it("retires the unmeasured sentence that closed the README", () => {
    // The document ended by asserting the gap; it now cites the probe.
    expect(readme).not.toContain(
      "detaching a tab into a new window is impossible (no multiple windows)",
    );
    expect(readme).toContain("`second-window-lifecycle`");
  });
});
