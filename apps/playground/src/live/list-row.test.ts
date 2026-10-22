/**
 * Guards the fixture `list-row-press` measures the shipped `List` with.
 *
 * The probe compares each press's selection against `LIST_ROW_PRESSES`; a case
 * that names a row the frame does not mount, two presses on one target, or a
 * README table that stopped printing the measured selection would all leave the
 * probe green against a fixture that no longer describes a list. The rule the
 * probe teaches lives in `press-routing-lifecycle`: a filled child is the
 * boundary a press stops at, so the shipped badge declares `pointerEvents:
 * "none"` to let the row hear the press, and the same badge with the pointer
 * handed back still swallows it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  LIST_ROW_PRESSES,
  LIST_ROW_PRESS_IDS,
  LIST_ROW_ROWS,
  formatSelection,
  listRowId,
  listRowPress,
  listRowTrailingId,
} from "./list-row.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The `list-row-press` section, without the headings after it. */
const section = (): string => {
  const start = readme.indexOf("### `list-row-press`");
  const end = readme.indexOf("\n### ", start + 1);
  return start === -1 ? "" : readme.slice(start, end === -1 ? undefined : end);
};

describe("the list-row fixture", () => {
  it("carries one press per named case, in order", () => {
    expect(Arr.map(LIST_ROW_PRESSES, (press) => press.id)).toEqual([
      ...LIST_ROW_PRESS_IDS,
    ]);
    expect(Arr.map(LIST_ROW_PRESS_IDS, listRowPress)).toEqual(LIST_ROW_PRESSES);
  });

  it("targets a row the frame mounts, once per target", () => {
    const rows = Arr.map(LIST_ROW_ROWS, listRowId);
    const trailing = Arr.map(LIST_ROW_ROWS, listRowTrailingId);
    const targets = Arr.map(LIST_ROW_PRESSES, (press) => press.target);
    expect(Arr.dedupe(targets)).toEqual(targets);
    expect(
      Arr.filter(
        targets,
        (target) => !Arr.contains([...rows, ...trailing], target),
      ),
    ).toEqual([]);
  });

  it("prints a selection, with none as a word", () => {
    expect(formatSelection("")).toBe("selected=none");
    expect(formatSelection("text")).toBe("selected=text");
  });

  it("prints every measured press in its section", () => {
    const text = section().replace(/\s+/g, " ");
    expect(text).not.toBe("");
    Arr.forEach(LIST_ROW_PRESSES, (press) => {
      expect(text).toContain(`| \`${press.id}\` | ${press.caption} |`);
      expect(text).toContain(`\`${formatSelection(press.selects)}\``);
    });
  });
});
