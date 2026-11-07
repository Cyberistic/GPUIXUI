import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  controlSizes,
  densityPresets,
  iconSize,
  targetInset,
  targetSize,
} from "./scale.js";

describe("the target floors", () => {
  it("carries the AA and AAA values, in order", () => {
    expect(targetSize.minimum).toBe(24);
    expect(targetSize.comfortable).toBe(44);
    expect(targetSize.comfortable).toBeGreaterThan(targetSize.minimum);
  });
});

describe("targetInset", () => {
  it("reserves the gap each side of a control below the floor", () => {
    expect(targetInset(iconSize.xs)).toBe(6);
    expect(targetInset(iconSize.sm)).toBe(5);
    expect(targetInset(iconSize.md)).toBe(4);
    expect(targetInset(iconSize.lg)).toBe(2);
    expect(targetInset(iconSize.xl)).toBe(0);
  });

  it("rounds a half-pixel gap up, so the target is never short", () => {
    expect(targetInset(13)).toBe(6);
    expect(13 + targetInset(13) * 2).toBeGreaterThanOrEqual(targetSize.minimum);
  });

  it("adds nothing to a control that already reaches the floor", () => {
    expect(targetInset(24)).toBe(0);
    expect(targetInset(32)).toBe(0);
  });

  it("takes an explicit floor, so a touch surface can ask for the comfortable one", () => {
    expect(targetInset(iconSize.md, targetSize.comfortable)).toBe(14);
    expect(targetInset(iconSize.md, 16)).toBe(0);
  });

  it("returns no inset for a size or floor that cannot describe a box", () => {
    expect(targetInset(Number.NaN)).toBe(0);
    expect(targetInset(Number.POSITIVE_INFINITY)).toBe(0);
    expect(targetInset(16, Number.NaN)).toBe(0);
  });
});

describe("the shipped scales against the floor", () => {
  it("keeps every control height at or above the AA floor in every density", () => {
    const short = Object.values(densityPresets).flatMap((preset) =>
      controlSizes.flatMap((size) => {
        const height = preset.controlHeight[size];
        return height < targetSize.minimum
          ? [`${preset.name} ${size}: ${height}`]
          : [];
      }),
    );

    expect(short).toEqual([]);
  });

  it("keeps every row height at or above the AA floor in every density", () => {
    const short = Object.values(densityPresets).flatMap((preset) =>
      preset.rowHeight < targetSize.minimum
        ? [`${preset.name}: ${preset.rowHeight}`]
        : [],
    );

    expect(short).toEqual([]);
  });

  it("reserves every icon step up to the floor, because an icon-only control draws at the step", () => {
    const boxes = Object.values(iconSize).map(
      (size) => size + targetInset(size) * 2,
    );

    expect(boxes).toEqual(
      Object.values(iconSize).map(() => targetSize.minimum),
    );
  });
});

const repository = new URL("../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repository), "utf8");

const section = (page: string, heading: string): string => {
  const start = page.indexOf(heading);
  if (start === -1) {
    return "";
  }
  const rest = page.slice(start + heading.length);
  const next = rest.search(/^#{2,3} /m);
  return next === -1 ? rest : rest.slice(0, next);
};

const catalogue = section(read("docs/tokens.md"), "### Target sizes");
const system = section(read("docs/design-system.md"), "### Target sizes");

const proofs = [
  "packages/components/src/behaviour/targets.test.tsx",
  "packages/primitives/runtime/selection-targets.runtime.test.tsx",
  "packages/primitives/runtime/groups.runtime.test.tsx",
  "packages/primitives/src/components/Rating.test.tsx",
] as const;

describe("the target sizes' adoption", () => {
  it("teaches the drawn sizes a painter draws, not a chevron that is a target", () => {
    (
      [
        ["docs/tokens.md", catalogue],
        ["docs/design-system.md", system],
      ] as const
    ).forEach(([label, page]) => {
      expect(page, label).not.toMatch(/tree chevron at `iconSize\.xs`/);
      expect(page, label).not.toContain("12px chevron");
      expect(page, label).not.toContain(".agents/slop/TODO.md");
    });
    expect(catalogue).toContain("rating star at 18px");
    expect(system).toContain("rating star's 18–20px glyph");
  });

  it("reads the tree's rule: the chevron is a drawing and the row is the target", () => {
    const row = read("packages/data/src/tree/row.tsx");

    expect(
      row.includes("height: height ?? theme.density.rowHeight") ||
        row.includes("height ?? rowHeightOf(theme)"),
    ).toBe(true);

    expect(
      row.includes("width: theme.iconSize.md") ||
        row.includes('width: iconSideOf(theme, "md")'),
    ).toBe(true);

    expect(read("packages/icons/src/icon.tsx")).toContain(
      'pointerEvents: "none"',
    );
    expect(catalogue).toContain('`pointerEvents: "none"`');
    expect(catalogue).toContain("`density.rowHeight`");
  });

  it("cites only proofs that measure the floor", () => {
    proofs.forEach((path) => {
      const name = path.split("/").at(-1) ?? "";
      expect(catalogue, name).toContain(name);
      expect(system, name).toContain(name);
      expect(read(path), name).toContain("targetSize.minimum");
    });
  });

  it("cannot call a landed tree remaining", () => {
    const row =
      read(".agents/slop/COMPONENTS.md")
        .split("\n")
        .find((line) => line.startsWith("| Target sizes ")) ?? "";

    expect(row).not.toContain("Remaining:");
    expect(row).toContain("press-routing-lifecycle");
    expect(row).toContain("rowHeight");
  });
});
