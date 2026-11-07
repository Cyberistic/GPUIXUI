import { describe, expect, it } from "vitest";
import { toDomKey } from "./key-names.js";

describe("toDomKey", () => {
  it("gives the DOM value for every named key GPUix reports", () => {
    const gpuix = [
      "backspace",
      "delete",
      "down",
      "end",
      "enter",
      "escape",
      "home",
      "insert",
      "left",
      "pagedown",
      "pageup",
      "right",
      "space",
      "tab",
      "up",
    ];
    expect(gpuix.map(toDomKey)).toEqual([
      "Backspace",
      "Delete",
      "ArrowDown",
      "End",
      "Enter",
      "Escape",
      "Home",
      "Insert",
      "ArrowLeft",
      "PageDown",
      "PageUp",
      "ArrowRight",
      " ",
      "Tab",
      "ArrowUp",
    ]);
    expect(["f1", "f12", "f35"].map(toDomKey)).toEqual(["F1", "F12", "F35"]);
  });

  it("reads a binding's key token in any case or common alias", () => {
    for (const written of ["Enter", "ENTER", "enter", "return"])
      expect(toDomKey(written)).toBe("Enter");
    for (const written of ["ArrowDown", "arrowdown", "down"])
      expect(toDomKey(written)).toBe("ArrowDown");
    expect(toDomKey("esc")).toBe("Escape");
  });

  it("passes printable characters through as their own DOM value", () => {
    expect(["a", "/", "ß", "1"].map(toDomKey)).toEqual(["a", "/", "ß", "1"]);
    // Negative control: a letter that spells a function key only when followed by a number.
    expect(toDomKey("f")).toBe("f");
  });
});
