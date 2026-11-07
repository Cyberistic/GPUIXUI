import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  getTheme,
  retroNames,
  retroStyles,
  retroTheme,
  type Theme,
} from "@gpuixui/tokens";

const base = getTheme("dark");
const looks = Arr.map(retroNames, (look) => ({
  look,
  theme: retroTheme(base, look),
}));

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const row = Option.getOrElse(
  Arr.findFirst(Str.split(readme, "\n"), Str.includes("| `theme-look` |")),
  () => "",
);

const listOf = (pick: (theme: Theme) => number): string =>
  Arr.join(
    Arr.map(looks, ({ theme }) => `${pick(theme)}`),
    " / ",
  );

describe("the theme-look probe's samples", () => {
  it("paints as many distinct lg steps as the looks author", () => {
    const radii = Arr.map(looks, ({ theme }) => theme.radius.lg);
    expect(radii).not.toContain(base.radius.lg);

    const authored = Arr.map(retroNames, (look) => retroStyles[look].radius.lg);
    expect(Arr.dedupe(authored).length).toBeGreaterThan(1);
    expect(Arr.dedupe(radii)).toHaveLength(Arr.dedupe(authored).length);
  });

  it("gives every look a primary fill the base and its sibling do not paint", () => {
    const fills = Arr.map(looks, ({ theme }) => theme.colors.primary);
    expect(fills).not.toContain(base.colors.primary);
    expect(Arr.dedupe(fills)).toHaveLength(looks.length);
  });

  it("gives every look a mono family of its own", () => {
    const families = Arr.map(looks, ({ theme }) => theme.typography.mono);
    expect(Arr.dedupe(families)).toHaveLength(looks.length);
  });

  it("gives at least one look a control height the base density does not", () => {
    const heights = Arr.map(
      looks,
      ({ theme }) => theme.density.controlHeight.md,
    );
    expect(heights).not.toEqual(
      Arr.map(looks, () => base.density.controlHeight.md),
    );
  });

  it("names every look, its mono family and its own samples in the README", () => {
    expect(row).not.toBe("");
    Arr.forEach(looks, ({ theme }) =>
      expect(row).toContain(theme.typography.mono),
    );
    expect(row).toContain(listOf((theme) => theme.radius.lg));
    expect(row).toContain(listOf((theme) => theme.density.controlHeight.md));
  });
});
