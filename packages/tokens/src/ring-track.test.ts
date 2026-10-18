/**
 * Guards the defect fixed in plan 516: a focused slider's ring is painted
 * around a thumb centred on the rail, so its left and right arcs land on the
 * value groove (`track`), but the ring contract stopped at the plain surfaces,
 * the washes and the soft status fills. Identity light `#7567F2` measured
 * **2.983:1** on the light groove, under the 3:1 boundary floor, while every
 * other shipped set passed. The identity light ring moves one ramp step to
 * `iris[700]` and `ringTrackPairs` publishes the pair; an invalid slider keeps
 * the accent ring, so the groove is deliberately not an invalid-ring surface.
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  invalidRingPairs,
  markPairs,
  ringTrackPairs,
  shippedThemes,
  themeContrastFailures,
  themeFailures,
} from "./index.js";

describe("the focus ring on the value groove", () => {
  it("publishes the ring on the groove once", () => {
    expect(ringTrackPairs).toEqual([["ring", "track", "boundary"]]);

    const groovePairs = contrastPairs.filter(
      ([foreground, background]) =>
        foreground === "ring" && background === "track",
    );
    expect(groovePairs).toEqual([["ring", "track", "boundary"]]);
  });

  it("keeps the ring visible on every shipped groove", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const ratio = contrastRatio(theme.colors.ring, theme.colors.track);
      const floor = contrastFloors[theme.contrast].boundary;
      return ratio >= floor
        ? []
        : [`${theme.name} (${theme.contrast}): ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
    expect(
      contrastRatio(
        getTheme("light").colors.ring,
        getTheme("light").colors.track,
      ),
    ).toBeGreaterThanOrEqual(4);
  });

  it("reports an edited theme whose ring meets the groove", () => {
    const base = getTheme("light");
    const invisible = extendTheme(base, {
      colors: { ring: base.colors.track },
    });

    expect(
      themeContrastFailures(invisible).filter(
        ({ foreground, background }) =>
          foreground === "ring" && background === "track",
      ),
    ).toEqual([
      {
        foreground: "ring",
        background: "track",
        pairClass: "boundary",
        floor: contrastFloors.default.boundary,
        ratio: 1,
      },
    ]);
    expect(
      themeFailures(invisible).some(
        (failure) =>
          failure.kind === "contrast" &&
          failure.foreground === "ring" &&
          failure.background === "track",
      ),
    ).toBe(true);
  });

  it("rejects the pre-516 ring on the groove", () => {
    const preFix = extendTheme(getTheme("light"), {
      colors: { ring: "#7567F2" },
    });
    const failure = themeContrastFailures(preFix).find(
      ({ foreground, background }) =>
        foreground === "ring" && background === "track",
    );

    expect(failure?.pairClass).toBe("boundary");
    expect(failure?.ratio).toBeLessThan(contrastFloors.default.boundary);
    expect(getTheme("light").colors.ring).not.toBe("#7567F2");
  });

  it("does not measure an invalid ring on the groove", () => {
    expect(
      invalidRingPairs.some(([, background]) => background === "track"),
    ).toBe(false);
    expect(markPairs).toContainEqual(["destructive", "input", "mark"]);
  });
});
