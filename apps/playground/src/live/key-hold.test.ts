/**
 * Holds the `key-hold-lifecycle` fixture, the probe that drives it and the
 * section a reader plans from.
 *
 * The bug this guards: every activating control in the library refuses a repeat
 * (`decideActivation` returns `false` for `isHeld`), a guard that had only ever
 * been proved with synthetic events. If the binding never set the flag the guard
 * would be dead code and a held Enter would fire an action repeatedly — with
 * every unit test still green. The probe settles it in a window; this suite keeps
 * the fixture, the flags and the words the README prints pointing at one another.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, host and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  heldKeyLog,
  KEY_HOLD_CHECKS,
  KEY_HOLD_IDS,
  KEY_HOLD_KEYS,
  keyHoldReadout,
  windowKeyLog,
} from "./key-hold.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./key-hold-probe.tsx");
const host = read("./host.ts");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const testingSmoke = read("../../../../packages/testing/src/smoke.ts");
const testingReadme = read("../../../../packages/testing/README.md");

/** This probe's own README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `key-hold-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the readouts", () => {
  it("prints each down with the flag it carried, and the ups apart", () => {
    expect(heldKeyLog([], 0)).toBe("down= up=0");
    expect(
      heldKeyLog(
        [
          { key: "j", held: false },
          { key: "j", held: true },
        ],
        1,
      ),
    ).toBe("down=j:false,j:true up=1");
    expect(
      windowKeyLog([
        { key: "j", held: false },
        { key: "j", held: true },
      ]),
    ).toBe("window=j:false,j:true");
  });

  it("keeps the activations and the pointer presses apart", () => {
    expect(keyHoldReadout(0, 0)).toBe("activations=0 presses=0");
    expect(keyHoldReadout(3, 1)).toBe("activations=3 presses=1");
  });

  it("addresses every element with its own id", () => {
    const ids = Object.values(KEY_HOLD_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(KEY_HOLD_IDS.raw).not.toBe(KEY_HOLD_IDS.button);
  });

  it("names the keys each half of the activation uses", () => {
    // Enter acts on the press, Space on the release; the raw key is neither, so
    // a repeat log cannot be read as an activation.
    expect(KEY_HOLD_KEYS.press).toBe("enter");
    expect(KEY_HOLD_KEYS.release).toBe("space");
    expect(KEY_HOLD_KEYS.raw).toBe("j");
  });
});

describe("the host verb the probe needs", () => {
  it("declares a key down with the repeat flag, and documents it", () => {
    expect(testingSmoke).toContain("readonly keyDown?: (");
    expect(testingSmoke).toContain("isHeld: boolean");
    // The window adapter is what makes the flag reachable: the automation
    // protocol's `keyDown` command is the only route that carries it.
    expect(host).toContain('app.call("keyDown"');
    expect(host).toContain("isHeld");
    expect(testingReadme.replace(/\s+/g, " ")).toContain(
      "`keyDown(keystroke, isHeld)`",
    );
  });
});

describe("the probe", () => {
  it("mounts the shipped Button and the activation props apart", () => {
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain("<Button");
    expect(probe).toContain("onActivate={");
    expect(probe).toContain("onClick={() => setPresses");
    // The unguarded control is the payload reader: it must not filter `isHeld`.
    expect(probe).toContain("event.isHeld === true");
    expect(probe).toContain("<RawControl");
  });

  it("drives both flags and both halves of the pair", () => {
    expect(probe).toContain("down(KEY_HOLD_KEYS.press, false)");
    expect(probe).toContain("down(KEY_HOLD_KEYS.press, true)");
    expect(probe).toContain("up(KEY_HOLD_KEYS.press)");
    expect(probe).toContain("down(KEY_HOLD_KEYS.release, true)");
    expect(probe).toContain("up(KEY_HOLD_KEYS.release)");
    expect(probe).toContain("down(KEY_HOLD_KEYS.raw, true)");
  });

  it("asserts the flag, the guard and the pointer Press's two props", () => {
    expect(probe).toContain("a repeat arrives with the flag set");
    expect(probe).toContain("a held Enter does not activate again");
    expect(probe).toContain("the Space release activates once");
    expect(probe).toContain("a pointer press runs onClick and onActivate");
    // The count is the floor a planted assertion is held to.
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(KEY_HOLD_CHECKS).toBe(sites);
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the input capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "key-hold-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("input");
    expect(declared[0]?.title).toContain("isHeld");
    expect(scenarios).toContain("KeyHoldProbe");
    expect(scenarios).toContain("keyHoldSteps");
    expect(scenarios).toContain('"key-hold-lifecycle"');
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).toContain(`${KEY_HOLD_CHECKS} checks`);
    expect(section).toContain("`src/live/key-hold.ts`");
    expect(section).toContain("key-hold.test.ts");
    expect(section.replace(/\s+/g, " ")).toContain(
      "A repeat is a key event, and the flag says so",
    );
    expect(section.replace(/\s+/g, " ")).toContain(
      "`onActivate` is the key route, `onClick` the pointer one",
    );
  });

  it("names the probe in the input interaction row it belongs to", () => {
    const row = readme
      .split("\n")
      .find((line) => line.startsWith("| input update/validation |"));
    expect(row).toBeDefined();
    expect(row).toContain("`key-hold-lifecycle`");
  });
});
