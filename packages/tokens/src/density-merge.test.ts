/**
 * Guards the defect plan 089 fixed: the documented "partial metrics" density
 * override was not expressible. `controlHeight` required all three sizes, so a
 * consumer changing one control height had to retype the other two, and the
 * merge replaced the whole record — a forced partial override dropped the sizes
 * it omitted. The density docs called that "partial metrics"; it was neither
 * partial nor a merge.
 *
 * A size-keyed record now merges size by size, like typography merges field by
 * field, and the base preset's name is kept. Reverting `mergeDensity` to the
 * shallow spread makes the first test's omitted sizes `undefined`.
 */
import { describe, expect, it } from "vitest";
import {
  controlHeight,
  controlPaddingX,
  densityPresets,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "./index.js";

describe("density metric merge", () => {
  it("merges control heights size by size", () => {
    const base = getTheme("light");
    const themed = extendTheme(base, {
      density: { controlHeight: { md: 34 } },
    });

    expect(themed.density.controlHeight).toEqual({
      sm: base.density.controlHeight.sm,
      md: 34,
      lg: base.density.controlHeight.lg,
    });
    expect(themed.density.controlPaddingX).toEqual(
      base.density.controlPaddingX,
    );
    expect(themed.density.rowHeight).toBe(base.density.rowHeight);
    expect(themed.density.name).toBe(base.density.name);
    expect(controlHeight(themed, "md")).toBe(34);
    expect(controlHeight(themed, "sm")).toBe(base.density.controlHeight.sm);
  });

  it("merges padding and row height without touching heights", () => {
    const base = getTheme("dark");
    const themed = extendTheme(base, {
      density: { controlPaddingX: { lg: 14 }, rowHeight: 36 },
    });

    expect(themed.density.controlPaddingX).toEqual({
      sm: base.density.controlPaddingX.sm,
      md: base.density.controlPaddingX.md,
      lg: 14,
    });
    expect(themed.density.controlHeight).toEqual(base.density.controlHeight);
    expect(themed.density.rowHeight).toBe(36);
    expect(controlPaddingX(themed, "lg")).toBe(14);
  });

  it("still selects a whole preset by name", () => {
    const themed = extendTheme(getTheme("light"), { density: "compact" });
    expect(themed.density).toBe(densityPresets.compact);
  });

  it("edits a platform style's preset without losing its other metrics", () => {
    const macos = getPlatformTheme("darwin", "light");
    const themed = extendTheme(macos, {
      density: { controlHeight: { sm: 22 } },
    });

    expect(macos.density.name).toBe("compact");
    expect(themed.density.name).toBe("compact");
    expect(themed.density.controlHeight.sm).toBe(22);
    expect(themed.density.controlHeight.md).toBe(
      macos.density.controlHeight.md,
    );
    expect(themed.density.controlPaddingX).toEqual(
      macos.density.controlPaddingX,
    );
  });

  it("does not mutate the base theme", () => {
    const base = getTheme("light");
    const before = base.density;
    extendTheme(base, { density: { controlHeight: { md: 34 } } });

    expect(base.density).toBe(before);
    expect(base.density.controlHeight).toEqual(
      densityPresets.comfortable.controlHeight,
    );
  });
});
