/**
 * Guards the routing table `press-routing-lifecycle` holds the window to.
 *
 * The probe presses a row's inner element and compares the log against
 * `PRESS_CASES`. A case whose expectation was edited without a run, or a
 * nesting added without its route, would leave the probe asserting a route no
 * window measured, so the table is checked here as well: every nesting has
 * exactly one case, every case names handlers the fixture can log (an unknown
 * name could never appear in a readout and would pass by never being compared),
 * and the README prints the same route the probe asserts.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  NESTINGS,
  PRESS_CASES,
  PRESS_CLEAR,
  PRESS_DRAFT,
  PRESS_HANDLERS,
  PRESS_READOUT,
  formatHits,
  pressCase,
  pressCellId,
  pressRowId,
} from "./press-routing.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The `press-routing-lifecycle` section, without the headings after it. */
const section = (): string => {
  const start = readme.indexOf("### `press-routing-lifecycle`");
  const end = readme.indexOf("\n### ", start + 1);
  return start === -1 ? "" : readme.slice(start, end === -1 ? undefined : end);
};

describe("the press-routing fixture", () => {
  it("carries one case per nesting, in the order the frame paints them", () => {
    expect(Arr.map(PRESS_CASES, (entry) => entry.id)).toEqual([...NESTINGS]);
    expect(Arr.map(NESTINGS, pressCase)).toEqual(PRESS_CASES);
  });

  it("expects only handlers the fixture can log", () => {
    const unknown = Arr.filter(
      Arr.flatMap(PRESS_CASES, (entry) => entry.hits),
      (hit) => !Arr.contains(PRESS_HANDLERS, hit),
    );
    expect(unknown).toEqual([]);
    // A route that ran nothing is a measured answer, not a missing one: the
    // three cases where a press stops at a fill the row does not handle.
    expect(
      Arr.map(
        Arr.filter(PRESS_CASES, (entry) => entry.hits.length === 0),
        (entry) => entry.id,
      ),
    ).toEqual(["text-filled", "div-filled", "aux-row"]);
  });

  it("prints a route, so a press that ran nothing says so", () => {
    expect(formatHits([])).toBe("hits=none");
    expect(formatHits(["row-click"])).toBe("hits=row-click");
    expect(formatHits(["cell-click", "row-click"])).toBe(
      "hits=cell-click,row-click",
    );
  });

  it("addresses each case's row and inner element apart", () => {
    const ids = Arr.flatMap(NESTINGS, (id) => [
      pressRowId(id),
      pressCellId(id),
    ]);
    expect(Arr.dedupe(ids)).toEqual(ids);
    expect(ids).not.toContain(PRESS_READOUT);
    expect(ids).not.toContain(PRESS_CLEAR);
    expect(ids).not.toContain(PRESS_DRAFT);
  });

  it("prints the route the probe asserts, for every case", () => {
    const text = section().replace(/\s+/g, " ");
    expect(text).not.toBe("");
    Arr.forEach(PRESS_CASES, (entry) => {
      expect(text).toContain(`| \`${entry.id}\` | ${entry.caption} |`);
      expect(text).toContain(
        `\`${formatHits(entry.hits).replace("hits=", "")}\``,
      );
    });
  });
});
