import { describe, expect, it } from "vitest";
import {
  firstRow,
  IDLE,
  lastRow,
  nextRow,
  press,
  range,
  sameValues,
  selectAll,
  toggle,
  typeaheadMatch,
  TYPEAHEAD_WINDOW_MS,
  type PreviewListRow,
} from "./list-preview";

/**
 * The list preview's navigation, type-ahead and selection rules.
 *
 * The preview repeats the shipped `List` because a browser cannot mount the
 * native one, and these are the rules a screenshot cannot show: a disabled row
 * is skipped (and an arrow that starts on one continues past it), the ends wrap,
 * a typed prefix searches **after** the current row so a repeated letter cycles,
 * and a range never picks up a disabled row. A preview that stopped on a
 * disabled row or searched from the top would teach a keyboard the component
 * does not have.
 */

const files: ReadonlyArray<PreviewListRow> = [
  { value: "readme", title: "README.md", searchText: "README.md" },
  {
    value: "locked",
    title: "secrets.env",
    searchText: "secrets.env",
    disabled: true,
  },
  { value: "design", title: "Design notes", searchText: "Design notes" },
  { value: "diagram", title: "diagram.svg", searchText: "diagram.svg" },
  { value: "unlabelled", title: "Scratch" },
];

describe("the list preview's arrow order", () => {
  it("skips a disabled row and wraps at both ends", () => {
    expect(nextRow(files, "readme", 1)).toBe("design");
    expect(nextRow(files, "design", -1)).toBe("readme");
    expect(nextRow(files, "unlabelled", 1)).toBe("readme");
    expect(nextRow(files, "readme", -1)).toBe("unlabelled");
  });

  it("continues past a disabled row the arrow starts on", () => {
    // A row can be disabled after it held the focus; the move must not stop.
    expect(nextRow(files, "locked", 1)).toBe("design");
    expect(nextRow(files, "locked", -1)).toBe("readme");
  });

  it("names the reachable ends, or nothing when every row is disabled", () => {
    expect(firstRow(files)).toBe("readme");
    expect(lastRow(files)).toBe("unlabelled");
    expect(
      firstRow([{ value: "only", title: "Only", disabled: true }]),
    ).toBeNull();
    expect(nextRow([], null, 1)).toBeNull();
  });
});

describe("the list preview's type-ahead", () => {
  it("searches after the current row and wraps", () => {
    // `d` from README.md finds Design notes, and the next `d` finds diagram.svg.
    expect(typeaheadMatch(files, "readme", "d")).toBe("design");
    expect(typeaheadMatch(files, "design", "d")).toBe("diagram");
    expect(typeaheadMatch(files, "diagram", "d")).toBe("design");
    expect(typeaheadMatch(files, "readme", "r")).toBe("readme");
  });

  it("skips a disabled row and a row with no search text", () => {
    expect(typeaheadMatch(files, "readme", "s")).toBeNull();
    expect(typeaheadMatch(files, null, "scr")).toBeNull();
    expect(typeaheadMatch(files, "diagram", "rea")).toBe("readme");
  });

  it("keeps a repeated letter's prefix, and starts over after the window", () => {
    // The component keeps `d` as `d` while the same letter repeats, which is
    // what lets the match advance; a second letter appends.
    const first = press(IDLE, "d", 1_000);
    expect(first.text).toBe("d");

    const repeated = press(first, "d", 1_200);
    expect(repeated.text).toBe("d");

    const typed = press(repeated, "i", 1_250);
    expect(typed.text).toBe("di");

    const late = press(typed, "a", 1_250 + TYPEAHEAD_WINDOW_MS + 1);
    expect(late.text).toBe("a");
  });
});

describe("the list preview's selection", () => {
  it("appends a pick in the chosen order and removes it on a second pick", () => {
    expect(toggle([], "design")).toEqual(["design"]);
    expect(toggle(["design"], "readme")).toEqual(["design", "readme"]);
    expect(toggle(["design", "readme"], "design")).toEqual(["readme"]);
  });

  it("selects every enabled row in declaration order", () => {
    expect(selectAll(files)).toEqual([
      "readme",
      "design",
      "diagram",
      "unlabelled",
    ]);
  });

  it("never lets a range include a disabled row", () => {
    // `locked` sits between the ends, so the range has to step over it.
    expect(range(files, "readme", "design")).toEqual(["readme", "design"]);
    expect(range(files, "design", "readme")).toEqual(["readme", "design"]);
    // A disabled target cannot enter a selection, and a lost anchor collapses
    // to the target alone rather than guessing the row above it.
    expect(range(files, "readme", "locked")).toEqual([]);
    expect(range(files, "locked", "design")).toEqual(["design"]);
  });

  it("compares two selections by their members, not their order", () => {
    expect(sameValues(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameValues(["a"], ["a", "b"])).toBe(false);
    expect(sameValues(["a", "b"], ["a", "a"])).toBe(false);
  });
});
