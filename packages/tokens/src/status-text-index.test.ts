/**
 * Guards the defect plan 549 fixes: the status families' plain-surface text
 * roles (`xText`) were retyped by hand — a separate four-name `statusTextTones`
 * plus twelve literal pairs for `background`/`card`/`popover` — while every
 * other status list already derived from `statusTones`. A fifth tone therefore
 * joined the solid, soft and chip pairs but shipped its label on the canvas, a
 * card, a popover, the quiet panel and the four row washes unmeasured. The
 * cases below derive their expectation from the index, so a tone added without
 * its text pairs fails them.
 */
import { describe, expect, it } from "vitest";
import {
  contrastPairs,
  statusTextSurfaces,
  statusTones,
  type ContrastPair,
} from "./index.js";

/** The ordered surfaces a status label paints on, derived from the export. */
const surfaces = [...statusTextSurfaces];

/** True when the contract holds the exact pair. */
const holds = (
  pairs: ReadonlyArray<ContrastPair>,
  foreground: string,
  background: string,
  pairClass: string,
): boolean =>
  pairs.some(
    ([pairForeground, pairBackground, pairClass_]) =>
      pairForeground === foreground &&
      pairBackground === background &&
      pairClass_ === pairClass,
  );

describe("the status text pairs derive from the tone index", () => {
  it("names each surface a status label paints on once, in documentation order", () => {
    expect(surfaces).toEqual([
      "background",
      "card",
      "popover",
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
    ]);
    expect(new Set(surfaces).size).toBe(surfaces.length);
  });

  it("measures every tone's label on every surface", () => {
    statusTones.forEach((tone) => {
      surfaces.forEach((surface) => {
        expect(
          holds(contrastPairs, `${tone}Text`, surface, "secondary"),
          `${tone}Text on ${surface}`,
        ).toBe(true);
      });
    });
  });

  it("publishes no status label pair outside the tone index", () => {
    const statusTextPairs = contrastPairs.filter(([foreground]) =>
      statusTones.some((tone) => foreground === `${tone}Text`),
    );

    expect(statusTextPairs.length).toBe(
      statusTones.length * statusTextSurfaces.length,
    );
  });
});
