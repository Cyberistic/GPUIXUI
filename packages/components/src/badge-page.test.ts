/**
 * The route a press takes through a status `Badge`, held to the window that
 * measured it.
 *
 * The bug these guard: `docs/badge.mdx` §Limitations and `COMPONENTS.md`'s
 * `Badges` row both said the live `list-row-press` probe measured
 * `selected=none` with the shipped pill, so a reader following either document
 * concluded the shipped badge still swallows the press a selectable row is
 * waiting for. The probe measures the opposite now that `Badge` declares
 * `pointerEvents: "none"`: a press on it reaches its row (`selected=badge`), and
 * the `selected=none` reading belongs to the `badge-eager` control — the same
 * pill whose caller's `style` hands the pointer back.
 *
 * The measurement is read out of the probe's own fixture rather than retyped, so
 * a changed route moves the page with it; `src/behaviour/badge.test.tsx` holds
 * the painted declaration the route depends on.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const page = read("../docs/badge.mdx");
const source = read("./badge.tsx");
const fixture = read("../../../apps/playground/src/live/list-row.ts");
const inventory = read("../../../COMPONENTS.md");

/** One press's entry in the probe's table, without the press after it. */
const pressBlock = (marker: string): string => {
  const at = fixture.indexOf(marker);
  if (at === -1) return "";
  const end = fixture.indexOf("\n  },", at);
  return end === -1 ? "" : fixture.slice(at, end);
};

/** The row a press leaves selected, as the fixture declares it. */
const selectsOf = (marker: string): string | undefined =>
  /selects: "([^"]*)"/.exec(pressBlock(marker))?.[1];

/** The probe's reading for the shipped pill and the control beside it. */
const shipped = selectsOf("\n  badge: {");
const eager = selectsOf('\n  "badge-eager": {');

/** The page's prose with its line wrapping flattened. */
const prose = page.replace(/\s+/g, " ");

/** A `COMPONENTS.md` row by the name in its first cell. */
const row = (name: string): string =>
  inventory.split("\n").find((line) => line.startsWith(`| ${name} |`)) ?? "";

/** The retracted claim: the shipped pill measuring no selection. */
const RETRACTED = "measured `selected=none`";

describe("the Badge page's press route", () => {
  it("reads the route the probe measured, not the one it replaced", () => {
    // The premise: the two shapes select different rows. A fixture that lost
    // either case would let the page say anything.
    expect(shipped).toBe("badge");
    expect(eager).toBe("");

    // The pill's declaration is what makes the route: a filled child is the
    // boundary GPUI's hit test stops counting at until it leaves the pointer.
    expect(source).toContain('pointerEvents: "none"');
  });

  it("teaches that press on the shipped pill selects its row", () => {
    expect(prose).toContain("selected=badge");
    expect(prose).toContain("badge-eager");
    expect(prose).toContain("selected=none");
    expect(prose).toContain("`list-row-press`");
    expect(prose).not.toContain(RETRACTED);
  });

  it("carries the fixed route in the inventory row", () => {
    const badges = row("Badges");

    expect(badges).toContain("selected=badge");
    expect(badges).toContain("badge-eager");
    expect(badges).toContain("selected=none");
    expect(badges).not.toContain(RETRACTED);
  });
});
