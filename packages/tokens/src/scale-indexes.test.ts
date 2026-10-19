/**
 * Guards the gap plan 668 fixes: the numeric scales exposed only their values,
 * so a generated table had to cast `Object.keys(spacing)` back to a key type —
 * the unsafe cast `textRoles`' JSDoc says an index exists to avoid — and
 * `metricMembers` kept six of the same domains as a second, independently typed
 * list. `docs/design-system.md` promises a docs site can build every table from
 * the package, and the `avatarSize` and `dimensions` scales were not even named
 * in that promise.
 *
 * The indexes are authored, not derived: a scale that gains a member must gain
 * it here too, and the first case fails until it does.
 */

import { describe, expect, it } from "vitest";
import { palette, paletteRamps } from "./color.js";
import { metricMembers } from "./metrics.js";
import { scaleTables } from "./scale-indexes.example.js";
import {
  avatarSize,
  avatarSizeSteps,
  borderWidth,
  borderWidthSteps,
  dimensionNames,
  dimensions,
  iconSize,
  iconSizeSteps,
  radius,
  radiusSteps,
  spacing,
  spacingSteps,
} from "./scale.js";

type Rows<K extends string> = ReadonlyArray<{
  readonly token: K;
  readonly value: number;
}>;

/** Each example table names its index, in order, and reads the scale. */
const holds = <K extends string>(
  index: ReadonlyArray<K>,
  scale: Readonly<Record<K, number>>,
  rows: Rows<K>,
) => {
  expect(rows.map((row) => row.token)).toEqual([...index]);
  rows.forEach((row) => expect(row.value).toBe(scale[row.token]));
};

describe("scale indexes", () => {
  it("lists every member of its scale, in documentation order", () => {
    expect([...spacingSteps]).toEqual(Object.keys(spacing));
    expect([...radiusSteps]).toEqual(Object.keys(radius));
    expect([...borderWidthSteps]).toEqual(Object.keys(borderWidth));
    expect([...iconSizeSteps]).toEqual(Object.keys(iconSize));
    expect([...avatarSizeSteps]).toEqual(Object.keys(avatarSize));
    expect([...dimensionNames]).toEqual(Object.keys(dimensions));
    expect([...paletteRamps]).toEqual(Object.keys(palette));
  });

  it("starts where the catalogue starts", () => {
    expect(spacingSteps[0]).toBe("2xs");
    expect(radiusSteps[0]).toBe("none");
    expect(borderWidthSteps).toEqual(["thin", "strong"]);
    expect(iconSizeSteps[0]).toBe("xs");
    expect(avatarSizeSteps[0]).toBe("xs");
    expect(dimensionNames[0]).toBe("overlayMinWidth");
  });

  it("gives the metric domain one owner per scale", () => {
    expect(metricMembers.spacing).toBe(spacingSteps);
    expect(metricMembers.radius).toBe(radiusSteps);
    expect(metricMembers.borderWidth).toBe(borderWidthSteps);
    expect(metricMembers.iconSize).toBe(iconSizeSteps);
    expect(metricMembers.avatarSize).toBe(avatarSizeSteps);
    expect(metricMembers.dimensions).toBe(dimensionNames);
  });

  it("builds each example table from its index", () => {
    const tables = scaleTables();
    expect(Object.values(tables).flat()).toHaveLength(
      spacingSteps.length +
        radiusSteps.length +
        borderWidthSteps.length +
        iconSizeSteps.length +
        avatarSizeSteps.length +
        dimensionNames.length,
    );
    holds(spacingSteps, spacing, tables.spacing);
    holds(radiusSteps, radius, tables.radius);
    holds(borderWidthSteps, borderWidth, tables.borderWidth);
    holds(iconSizeSteps, iconSize, tables.iconSize);
    holds(avatarSizeSteps, avatarSize, tables.avatarSize);
    holds(dimensionNames, dimensions, tables.dimensions);
  });
});
