/**
 * The pointer-effect pages' window claim, held to the probe that measured it.
 *
 * The bug this guards: `Magnetic` and `ImageZoom` cite only the offscreen
 * renderer suite for a rule the renderer cannot measure — `onLayout` reports a
 * size change, not the move a layout above the surface makes — while the
 * playground's `surface-origin` probe had already measured it in a window on
 * 0.11.0. A reader could not tell a renderer fact from a window fact, and the
 * same gap sat in both `COMPONENTS.md` rows.
 *
 * `node:fs` is a test-time repository read, the boundary the other page guards
 * in this package use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const magnetic = read("../docs/magnetic.mdx");
const imageZoom = read("../docs/image-zoom.mdx");
const readme = read("../../../apps/playground/README.md");
const inventory = read("../../../COMPONENTS.md");

/** One page section, without the heading that follows it. */
const section = (page: string, heading: string): string => {
  const start = page.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = page.slice(start + heading.length + 1);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ");
};

/** The `COMPONENTS.md` row whose first cell is `name`. */
const row = (name: string): string =>
  Option.getOrElse(
    Arr.findFirst(
      inventory.split("\n"),
      (line) => line.startsWith(`| ${name} |`),
    ),
    () => {
      throw new Error(`COMPONENTS.md has no row named ${name}`);
    },
  );

describe("the pointer-effect pages cite the window measurement", () => {
  it("names the probe and its measured origins", () => {
    // The probe's section is the evidence a page points at.
    expect(readme).toContain("### `surface-origin` — measured on 0.11.0 here");
    expect(readme).toContain("15 checks, `--only surface-origin`");

    Arr.forEach(
      [
        ["Magnetic", section(magnetic, "## Verification")],
        ["Image zoom", section(imageZoom, "## Verification")],
      ] as const,
      ([name, verification]) => {
        expect(verification, name).toContain("`surface-origin`");
        expect(verification, name).toContain("15 checks");
        expect(verification, name).toContain("88 →");
        expect(verification, name).toContain("208");
        // The local point is the consequence: the same point, two readings.
        expect(verification, name).toContain("`120,30`");
        expect(verification, name).toContain("`120,150`");
      },
    );
  });

  it("carries the measurement in both inventory rows", () => {
    Arr.forEach(["Magnetic", "Image zoom"], (name) => {
      const notes = row(name);
      expect(notes, name).toContain("`surface-origin`");
      expect(notes, name).toContain("15 checks");
      expect(notes, name).toContain("88 → 208");
    });
  });
});
