/**
 * Holds the premises the `inspector-lifecycle` probe is read against.
 *
 * The bugs these catch: an area that adds the sides instead of multiplying them
 * (the metric card could agree with a wrong readout), a reset that throws the
 * reader's edit away, a "missing" tag printed as an empty string (the readout
 * would read `tag= width=…`, which no assertion can distinguish from a lost
 * value), an inspector whose rows fit its viewport (the scroll step would then
 * pass on a box that never scrolls), and a README check count that disagrees
 * with the probe.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own Markdown, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  INITIAL_OBJECT,
  INSPECTOR_ROW_HEIGHT,
  INSPECTOR_SCROLL_HEIGHT,
  areaOf,
  inspectorReadout,
  metricReadout,
  overflowsInspector,
  previewCaption,
  propertyRows,
  renameTag,
  resetSize,
  sizeValue,
  tagValue,
  widen,
} from "./inspector.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `inspectorSteps` effect, bounded by the declaration that follows it. */
const inspectorSteps = (() => {
  const start = scenarios.indexOf("const inspectorSteps");
  const end = scenarios.indexOf("/** The bodies", start);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The count the README prints for this probe, if any. */
const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only inspector-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

describe("the object an inspector edits", () => {
  it("multiplies the sides for the area, and the metric reads the same number", () => {
    expect(areaOf(INITIAL_OBJECT)).toBe(9600);
    expect(metricReadout(INITIAL_OBJECT)).toBe("area=9600");
    expect(inspectorReadout(INITIAL_OBJECT)).toContain("area=9600");
  });

  it("prints the size once, so the row and the preview cannot disagree", () => {
    expect(previewCaption(INITIAL_OBJECT)).toContain(sizeValue(INITIAL_OBJECT));
    const widened = widen(INITIAL_OBJECT);
    expect(previewCaption(widened)).toContain(sizeValue(widened));
    expect(sizeValue(widened)).toBe("240 x 80");
  });

  it("widens the width and leaves the height, name and tag alone", () => {
    const widened = widen(renameTag(INITIAL_OBJECT, "ab"));
    expect(widened).toEqual({
      name: "Alpha",
      tag: "ab",
      width: 240,
      height: 80,
    });
  });

  it("restores the size on reset but keeps the reader's edit", () => {
    const restored = resetSize(widen(renameTag(INITIAL_OBJECT, "ab")));
    expect(restored).toEqual({ ...INITIAL_OBJECT, tag: "ab" });
  });

  it("prints an absent tag as none and a typed one as itself", () => {
    expect(tagValue("")).toBe("none");
    expect(tagValue("ab")).toBe("ab");
    expect(inspectorReadout(INITIAL_OBJECT)).toContain("tag=none");
    expect(inspectorReadout(renameTag(INITIAL_OBJECT, "ab"))).toContain(
      "tag=ab",
    );
  });
});

describe("the property rows the inspector paints", () => {
  it("leads with the four rows the probe reads by name", () => {
    expect(
      Arr.map(Arr.take(propertyRows(INITIAL_OBJECT), 4), (row) => row.key),
    ).toEqual(["name", "tag", "size", "area"]);
  });

  it("prints a unique test id for every row", () => {
    const keys = Arr.map(propertyRows(INITIAL_OBJECT), (row) => row.key);
    expect(Arr.dedupe(keys)).toEqual(keys);
  });

  it("overflows the viewport the probe scrolls", () => {
    // The scroll step only measures a scroll if the content is taller than the
    // box; a shrunken row set would turn `-200` into a clamped read or a no-op.
    const rows = Arr.length(propertyRows(INITIAL_OBJECT));
    expect(rows * INSPECTOR_ROW_HEIGHT).toBeGreaterThan(
      INSPECTOR_SCROLL_HEIGHT,
    );
    expect(overflowsInspector(INITIAL_OBJECT)).toBe(true);
  });
});

describe("the probe's documentation", () => {
  it("prints the check count the probe actually asserts", () => {
    // A `paintedBox` call is one `the runtime paints <id>` check as well as the
    // box it returns, so both sites count.
    const sites =
      Arr.length(Arr.fromIterable(inspectorSteps.matchAll(/ctx\.expect/g))) +
      Arr.length(Arr.fromIterable(inspectorSteps.matchAll(/paintedBox\(/g)));
    expect(sites).toBeGreaterThan(0);
    expect(printedCheckCount()).toBe(sites);
  });
});
