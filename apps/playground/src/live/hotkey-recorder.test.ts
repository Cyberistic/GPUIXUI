/**
 * Holds the `hotkey-recorder-lifecycle` fixture, the probe that drives it and
 * the section a reader plans from.
 *
 * The bug this guards: the shipped `HotkeyRecorder`'s page promises that a
 * recorded key is swallowed, so "the app's own binding does not fire". That
 * claim had only ever been read off the component's tree, where
 * `preventDefault` is a declaration. A window's app-level handler is installed
 * on the root and runs after the focused element, so whether a recorded key
 * reaches it is a separate measurement — and the probe must keep asserting the
 * answer it measured rather than the sentence the page prints.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, component suite and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  capturedChord,
  HOTKEY_CAPTURES,
  HOTKEY_CHECKS,
  HOTKEY_IDS,
  HOTKEY_KEYCAPS,
  HOTKEY_KEYS,
  HOTKEY_NONE,
  HOTKEY_PLACEHOLDER,
  HOTKEY_RECORDING,
  hotkeyClearId,
  hotkeyOffReadout,
  hotkeyReadout,
  paintsKeycaps,
  SPACE_CHORD,
  windowKeyLog,
  windowSaw,
} from "./hotkey-recorder.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./hotkey-recorder-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const componentSuite = read(
  "../../../../packages/components/src/behaviour/hotkey-recorder.test.tsx",
);

/** This probe's own README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `hotkey-recorder-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the fixture", () => {
  it("prints the chord a recorder stored, and the same readout when empty", () => {
    expect(hotkeyReadout(null, 0)).toBe(`value=${HOTKEY_NONE} reports=0`);
    expect(hotkeyReadout("Mod+Shift+K", 1)).toBe("value=Mod+Shift+K reports=1");
    expect(hotkeyOffReadout(0)).toBe("reports=0");
  });

  it("reads the app-level log by membership, not by arrival order", () => {
    expect(windowKeyLog([])).toBe("window=none");
    expect(windowKeyLog(["k"])).toBe("window=k");
    expect(windowKeyLog(["shift", "k"])).toBe("window=shift,k");
    expect(windowSaw(windowKeyLog([]), "k")).toBe(false);
    expect(windowSaw(windowKeyLog(["shift", "k"]), "k")).toBe(true);
    expect(windowSaw(windowKeyLog(["shift", "j"]), "k")).toBe(false);
  });

  it("names the canonical chord each platform's normalizer writes", () => {
    // The runtime's `cmd` flag decodes to `meta`, which the normalizer writes
    // as `Mod` where the platform allows it and as the literal modifier
    // otherwise — the rule the components' own suite pins for `ctrl`.
    expect(capturedChord("darwin")).toBe("Mod+Shift+K");
    expect(capturedChord("win32")).toBe("Meta+Shift+K");
    expect(capturedChord("linux")).toBe("Meta+Shift+K");
    expect(capturedChord("default")).toBe("Meta+Shift+K");
    expect(componentSuite).toContain(
      '.toHaveBeenCalledWith("Control+Shift+K")',
    );
    expect(SPACE_CHORD).toBe("Space");
  });

  it("tells a keycap paint from the raw value and the two states", () => {
    expect(paintsKeycaps("⇧⌘K", HOTKEY_KEYCAPS.base)).toBe(true);
    expect(paintsKeycaps("Win Shift K", HOTKEY_KEYCAPS.base)).toBe(true);
    expect(paintsKeycaps(capturedChord("darwin"), HOTKEY_KEYCAPS.base)).toBe(
      false,
    );
    expect(paintsKeycaps(HOTKEY_PLACEHOLDER, HOTKEY_KEYCAPS.base)).toBe(false);
    expect(paintsKeycaps(HOTKEY_RECORDING, HOTKEY_KEYCAPS.base)).toBe(false);
    expect(paintsKeycaps("␣", HOTKEY_KEYCAPS.space)).toBe(true);
    expect(paintsKeycaps(capturedChord("darwin"), HOTKEY_KEYCAPS.space)).toBe(
      false,
    );
  });

  it("addresses every element with its own id", () => {
    const ids = Object.values(HOTKEY_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(hotkeyClearId(HOTKEY_IDS.recorder)).toBe("hotkey-recorder-clear");
    expect(hotkeyClearId(HOTKEY_IDS.off)).not.toBe(HOTKEY_IDS.plain);
    expect(new Set(Object.values(HOTKEY_CAPTURES)).size).toBe(2);
  });

  it("keeps the chord's base key apart from its modifiers", () => {
    expect(HOTKEY_KEYS.chord.endsWith(HOTKEY_KEYS.chordKey)).toBe(true);
    expect(HOTKEY_KEYS.chord).not.toBe(HOTKEY_KEYS.chordKey);
    expect(HOTKEY_KEYS.space).toBe("space");
  });
});

describe("the probe", () => {
  it("mounts the shipped recorder and the app-level key channel", () => {
    expect(probe).toContain('from "@gpuixui/components"');
    expect(probe).toContain("<HotkeyRecorder");
    expect(probe).toContain("useWindowKey(");
    expect(probe).toContain("windowKeyLog(keys)");
  });

  it("drives every route the recorder owns", () => {
    expect(probe).toContain("Option.fromNullishOr(ctx.host.keyDown)");
    expect(probe).toContain("down(HOTKEY_KEYS.chord)");
    expect(probe).toContain("down(HOTKEY_KEYS.modifier)");
    expect(probe).toContain("down(HOTKEY_KEYS.cancel)");
    expect(probe).toContain("down(HOTKEY_KEYS.space)");
    expect(probe).toContain("down(HOTKEY_KEYS.refused)");
    expect(probe).toContain("hotkeyClearId(HOTKEY_IDS.recorder)");
    expect(probe).toContain("focusNext()");
  });

  it("asserts the swallowing claim and the keycap paint, at one count", () => {
    expect(probe).toContain(
      "the application's window handler still hears the swallowed key",
    );
    expect(probe).toContain("paintsKeycaps(yield* recorderText()");
    expect(probe).toContain("the tab walk skips the disabled recorder");
    // The count is the floor a planted assertion is held to.
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(HOTKEY_CHECKS).toBe(sites);
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the input capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "hotkey-recorder-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("input");
    expect(declared[0]?.title).toContain("HotkeyRecorder");
    expect(scenarios).toContain("HotkeyRecorderProbe");
    expect(scenarios).toContain("hotkeyRecorderSteps");
    expect(scenarios).toContain('"hotkey-recorder-lifecycle"');
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).toContain(`${HOTKEY_CHECKS} checks`);
    expect(section).toContain("`src/live/hotkey-recorder.ts`");
    expect(section).toContain("hotkey-recorder.test.ts");
    expect(section.replace(/\s+/g, " ")).toContain(
      "the swallowed key still reaches the app-level handler",
    );
    expect(section.replace(/\s+/g, " ")).toContain("`Mod+Shift+K`");
  });

  it("names the probe in the input interaction row it belongs to", () => {
    const row = readme
      .split("\n")
      .find((line) => line.startsWith("| input update/validation |"));
    expect(row).toBeDefined();
    expect(row).toContain("`hotkey-recorder-lifecycle`");
  });
});
