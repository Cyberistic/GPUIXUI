import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  acceleratorOf,
  chordOf,
  glyphsOf,
  type BrowserChord,
} from "./hotkey-chord";

/**
 * The recorder reads the physical key and every modifier around it.
 *
 * Guarded bug: the Hotkey recorder page built its chord from `event.key` alone
 * and dropped anything longer than one character, so ⌘⇧P bound the letter `p`,
 * `F5` and the arrows bound nothing, and a press of Shift alone silently
 * recorded "shift". The drawing now goes through the same `parseHotkey →
 * hasNonModifierKey → normalizeHotkey` path the runtime uses, and paints the
 * component's own glyphs.
 */

const press = (
  code: string,
  key: string,
  held: { alt?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
): BrowserChord => ({
  code,
  key,
  altKey: held.alt === true,
  ctrlKey: held.ctrl === true,
  metaKey: held.meta === true,
  shiftKey: held.shift === true,
});

const chord = (event: BrowserChord): string =>
  Option.getOrElse(chordOf(event), () => "");

describe("the accelerator of a physical key", () => {
  it("reads a letter, a digit and the numpad by name", () => {
    expect(acceleratorOf("KeyP")).toBe("p");
    expect(acceleratorOf("Digit1")).toBe("1");
    expect(acceleratorOf("Numpad1")).toBe("numpad1");
  });

  it("keeps a named key's own name", () => {
    expect(acceleratorOf("ArrowUp")).toBe("arrowup");
    expect(acceleratorOf("Space")).toBe("space");
    expect(acceleratorOf("F5")).toBe("f5");
  });
});

describe("the chord a press binds", () => {
  it("keeps every modifier, in the grammar's order", () => {
    // `normalizeHotkey` is the grammar's own canonical form, which is also what
    // the recorder stores; `formatSymbols` derives the same keycaps from either.
    expect(chord(press("KeyP", "P", { meta: true, shift: true }))).toBe(
      "Mod+Shift+P",
    );
  });

  it("binds a key that is not a character", () => {
    expect(chord(press("ArrowUp", "ArrowUp", { ctrl: true }))).toBe(
      "Control+ArrowUp",
    );
    expect(chord(press("F5", "F5"))).toBe("F5");
  });

  it("reads the physical key, not the character a modified press produced", () => {
    // Shift+1 is "!" on a US layout; the binding is still the 1 key.
    expect(chord(press("Digit1", "!", { shift: true }))).toBe("Shift+1");
  });

  it("waits while only modifiers are held", () => {
    expect(chordOf(press("MetaLeft", "Meta", { meta: true }))).toStrictEqual(
      Option.none(),
    );
    expect(chordOf(press("ShiftLeft", "Shift", { shift: true }))).toStrictEqual(
      Option.none(),
    );
  });
});

describe("the keycaps", () => {
  it("are the component's own glyphs", () => {
    expect(glyphsOf("mod+shift+p")).toStrictEqual(["⇧", "⌘", "P"]);
  });
});

describe("the recorder drawing", () => {
  const source = readFileSync(
    new URL("./hotkey-recorder-demo.tsx", import.meta.url),
    "utf8",
  );

  it("records through the grammar instead of the produced character", () => {
    expect(source).toContain("chordOf");
    expect(source).toContain("glyphsOf");
    // `event.key.length !== 1` is what dropped F-keys and the arrows.
    expect(source).not.toContain("length !== 1");
  });
});
