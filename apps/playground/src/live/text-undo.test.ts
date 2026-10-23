/**
 * Holds the `text-undo-lifecycle` fixture, the probe that drives it and the
 * section a reader plans from.
 *
 * The bug this guards: MISSION lists **input editing** among the interactions a
 * real runtime has to verify, and a field's own undo had never been driven — the
 * binding keeps the history (`cmd-z`/`shift-cmd-z`) and restores a snapshot
 * through the same `change` event a keystroke uses, so a controlled component
 * either hears the undo or paints one value while the field holds another. The
 * probe settles it in a window; this suite keeps the fixture, the chords and the
 * words the README prints pointing at one another.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  TEXT_UNDO_CHECKS,
  TEXT_UNDO_GROUP_MS,
  TEXT_UNDO_IDS,
  TEXT_UNDO_KEYS,
  TEXT_UNDO_TEXT,
  textUndoAreaReadout,
  textUndoKeyLog,
  textUndoReadout,
} from "./text-undo.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./text-undo-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

/** This probe's own README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `text-undo-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the readout", () => {
  it("prints the value, the edits and the renders one line", () => {
    expect(textUndoReadout("", 0, 0)).toBe("input= changes=0 renders=0");
    expect(textUndoReadout("loadedb", 5, 1)).toBe(
      "input=loadedb changes=5 renders=1",
    );
    expect(textUndoAreaReadout("x", 1)).toBe("area=x changes=1");
    expect(textUndoAreaReadout("", 2)).toBe("area= changes=2");
    expect(textUndoKeyLog([])).toBe("keys=");
    expect(textUndoKeyLog(["k"])).toBe("keys=k");
  });

  it("addresses every element with its own id", () => {
    const ids = Object.values(TEXT_UNDO_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    // The readouts are separate elements: one counter cannot stand for both
    // hosts, or a text-area undo would be read off the single-line field.
    expect(TEXT_UNDO_IDS.readout).not.toBe(TEXT_UNDO_IDS.areaReadout);
    expect(TEXT_UNDO_IDS.field).not.toBe(TEXT_UNDO_IDS.area);
  });

  it("tells the pushed value apart from the typed ones", () => {
    const words = [
      TEXT_UNDO_TEXT.typed,
      TEXT_UNDO_TEXT.later,
      TEXT_UNDO_TEXT.loaded,
      TEXT_UNDO_TEXT.areaTyped,
    ];
    expect(new Set(words).size).toBe(words.length);
    expect(TEXT_UNDO_TEXT.loaded.length).toBeGreaterThan(1);
  });

  it("keeps the three chords apart, with the control unbound by any field", () => {
    const chords = Object.values(TEXT_UNDO_KEYS);
    expect(new Set(chords).size).toBe(chords.length);
    // The positive control is only a control because no field binds it: the
    // binding owns cmd-z and shift-cmd-z, not cmd-k.
    expect(chords).toContain("cmd-z");
    expect(chords).toContain("shift-cmd-z");
    expect(TEXT_UNDO_KEYS.control).toBe("cmd-k");
  });

  it("waits longer than the window the binding coalesces edits in", () => {
    // `UNDO_COALESCE` is 700 ms in the pinned binding's `input.rs`: two inserts
    // inside it become one undo step, which would make "an edit after the push
    // is its own step" flaky rather than measured.
    expect(TEXT_UNDO_GROUP_MS).toBeGreaterThan(700);
  });
});

describe("the probe", () => {
  it("mounts the shipped field and text area under a primitives theme", () => {
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain("<Input");
    expect(probe).toContain("<TextArea");
    expect(probe).toContain("<PrimitiveThemeProvider");
    // Both hosts are controlled, or the app never has a value to be told about.
    expect(probe.match(/value=\{/g)?.length).toBe(2);
    expect(probe).toContain("onChange={edited}");
    expect(probe).toContain("onChange={(next: string) => {");
  });

  it("pushes the loaded value in without counting it as an edit", () => {
    expect(probe).toContain("setValue(TEXT_UNDO_TEXT.loaded)");
    // The edit path is the other setter: the push must not go through it.
    expect(probe).toContain("setValue(next);");
    expect(probe).toContain("setChanges((count) => count + 1);");
  });

  it("asserts undo, the cleared history and the chord's owner", () => {
    expect(probe).toContain(
      "cmd-z restores the empty value and reaches the controlled onChange",
    );
    expect(probe).toContain(
      "cmd-z after a value pushed in from outside changes nothing",
    );
    expect(probe).toContain("the field's undo reaches no window handler");
    expect(probe).toContain(
      "a chord no field binds reaches the window handler",
    );
    // The count is the floor a planted assertion is held to: an assertion added
    // without raising it fails here.
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(TEXT_UNDO_CHECKS).toBe(sites);
  });

  it("drives every chord through the window's own key path", () => {
    expect(probe).toContain("ctx.host.key(chord)");
    // Each chord is named through the fixture, so a step cannot type a literal
    // the fixture does not own.
    expect(probe).toContain("TEXT_UNDO_KEYS.undo");
    expect(probe).toContain("TEXT_UNDO_KEYS.redo");
    expect(probe).toContain("TEXT_UNDO_KEYS.control");
    // The pause between the push and the next edit is the coalesce window.
    expect(probe).toContain("Effect.sleep(GROUP)");
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the input capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "text-undo-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("input");
    expect(declared[0]?.title).toContain("cmd-z");
    expect(scenarios).toContain("TextUndoProbe");
    expect(scenarios).toContain("textUndoSteps");
    expect(scenarios).toContain('"text-undo-lifecycle"');
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).toContain(`${TEXT_UNDO_CHECKS} checks`);
    expect(section).toContain("`src/live/text-undo.ts`");
    expect(section).toContain("text-undo.test.ts");
    // Both halves of the contract a consumer plans from.
    expect(section.replace(/\s+/g, " ")).toContain(
      "A value pushed in from outside the field clears the history",
    );
    expect(section.replace(/\s+/g, " ")).toContain(
      "The chord stays in the field",
    );
  });

  it("names the probe in the input interaction row it belongs to", () => {
    // The row's probe list grows as input probes land, so this holds the
    // membership and the row, not a snapshot of every sibling.
    const row = readme
      .split("\n")
      .find((line) => line.startsWith("| input update/validation |"));
    expect(row).toBeDefined();
    expect(row).toContain("`text-undo-lifecycle`");
  });
});
