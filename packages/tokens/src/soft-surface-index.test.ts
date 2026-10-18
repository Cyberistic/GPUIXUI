/**
 * Guards the defect plan 548 fixes: the soft status fills were retyped by hand
 * in six lists while `statusTones` owns the families, so a fifth tone joined
 * the solid, text and chip lists automatically and skipped every soft list —
 * its Alert's tint, text, edge, ring, track, scrim and selection pairs. The
 * cases below derive each expectation from the tone index, so they fail when a
 * tone is added and a list is not derived from it.
 */
import { describe, expect, it } from "vitest";
import {
  contrastPairs,
  inactiveSoftPairs,
  overlaySurfaces,
  ringSoftPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  softActionPairs,
  statusTones,
  trackSurfacePairs,
  type ContrastPair,
} from "./index.js";

/** Every status family's soft fill, in the index's order. */
const softFills = statusTones.map((tone) => `${tone}Soft` as const);

/** Every soft fill a pair list names as its background. */
const backgrounds = (pairs: ReadonlyArray<ContrastPair>): ReadonlySet<string> =>
  new Set(pairs.map(([, background]) => background));

/** True when the list holds the exact pair. */
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

describe("the soft status fills derive from the tone index", () => {
  it("measures every tone's fill on the panels, its text and its edge", () => {
    softFills.forEach((fill) => {
      expect(holds(contrastPairs, fill, "background", "surface"), fill).toBe(
        true,
      );
      expect(
        holds(contrastPairs, `${fill}Foreground`, fill, "body"),
        fill,
      ).toBe(true);
      expect(holds(contrastPairs, `${fill}Border`, fill, "divider"), fill).toBe(
        true,
      );
    });
  });

  it("measures the value groove on every tone's fill", () => {
    const surfaces = backgrounds(trackSurfacePairs);
    softFills.forEach((fill) => expect(surfaces, fill).toContain(fill));
  });

  it("measures the selection wash on every tone's fill", () => {
    const washes = backgrounds(selectionSoftWashPairs);
    softFills.forEach((fill) => expect(washes, fill).toContain(fill));
  });

  it("measures the scrim and the dialog face over every tone's fill", () => {
    softFills.forEach((fill) => expect(overlaySurfaces).toContain(fill));
  });

  it("measures the panel action on every tone's fill", () => {
    const fills = backgrounds(softActionPairs);
    softFills.forEach((fill) => expect(fills, fill).toContain(fill));
  });

  it("measures every text role through the selection wash on a tint", () => {
    const pairs = backgrounds(selectionSoftPairs);
    softFills.forEach((fill) => expect(pairs, fill).toContain(fill));
  });

  it("measures an unavailable label and the focus ring on every tint", () => {
    const inactive = backgrounds(inactiveSoftPairs);
    const rings = backgrounds(ringSoftPairs);
    softFills.forEach((fill) => {
      expect(inactive, fill).toContain(fill);
      expect(rings, fill).toContain(fill);
    });
  });
});
