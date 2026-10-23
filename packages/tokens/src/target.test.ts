/**
 * The bug this guards: a control that paints below the pressable-target floor.
 *
 * A checkbox draws at `iconSize[md]` (16px), a switch thumb at the same step,
 * a rating star at 18–20px, a clear control's glyph at 14–16px. Those are the
 * *drawn* sizes, so the click area was the drawing — under WCAG 2.2 SC 2.5.8's
 * 24px minimum. The fix is a rule, not a bigger drawing: keep the control's look
 * and reserve the difference as padding. `targetInset` is that arithmetic, and
 * these tests hold it, the floors, and the shipped scales that sit under them to
 * one another — a control height or icon step that drops below the floor fails
 * here by name.
 *
 * The adoption describe block below guards the other half: the pages taught a
 * **12px tree chevron** that no painter draws (the tree's chevron is a 16px
 * `Icon`, and its `pointerEvents: "none"` makes the *row* the target) and sent a
 * reader to a `TODO.md` row that no longer exists, while the inventory called a
 * tree view "remaining" after one had shipped. Each page is read against the
 * painter, and every proof a page cites must measure the floor.
 *
 * `node:fs` is deliberate, as in this package's `docs.test.ts` and
 * `inventory.test.ts`: the subject is the repository's own Markdown and source,
 * so there is no runtime read to model and the package keeps no dependencies.
 * For the same reason the iteration below is `forEach`/`map` rather than
 * `effect/Array` — this package has no dependency on `effect` and its sibling
 * suites read pages the same way.
 */
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
    // 12 + 2*6, 14 + 2*5, 16 + 2*4, 20 + 2*2 — each lands exactly on 24.
    expect(targetInset(iconSize.xs)).toBe(6);
    expect(targetInset(iconSize.sm)).toBe(5);
    expect(targetInset(iconSize.md)).toBe(4);
    expect(targetInset(iconSize.lg)).toBe(2);
    expect(targetInset(iconSize.xl)).toBe(0);
  });

  it("rounds a half-pixel gap up, so the target is never short", () => {
    // (24 - 13) / 2 = 5.5: 5 would leave 23px, so the inset is 6 and the box 25.
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
    // A caller's own arithmetic produced these; an inset would invent a box.
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
    // A `dense` list row is built at exactly this height, and it is a press
    // target — so the shipped presets, like a brand's, clear the floor.
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

/** The repository root, two levels above `packages/tokens/src`. */
const repository = new URL("../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repository), "utf8");

/** One `###` section's text, from its heading to the next heading. */
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

/** The test files the pages cite as proof of adoption. */
const proofs = [
  "packages/components/src/behaviour/targets.test.tsx",
  "packages/primitives/runtime/selection-targets.runtime.test.tsx",
  "packages/primitives/runtime/groups.runtime.test.tsx",
  "packages/primitives/src/components/Rating.test.tsx",
] as const;

describe("the target sizes' adoption", () => {
  it("teaches the drawn sizes a painter draws, not a chevron that is a target", () => {
    // The retracted claims: a "tree chevron at iconSize.xs (12px)" — no painter
    // draws a 12px chevron and the tree's is a 16px `Icon` — and a pointer to a
    // `TODO.md` row that had already been resolved and removed.
    (
      [
        ["docs/tokens.md", catalogue],
        ["docs/design-system.md", system],
      ] as const
    ).forEach(([label, page]) => {
      expect(page, label).not.toMatch(/tree chevron at `iconSize\.xs`/);
      expect(page, label).not.toContain("12px chevron");
      expect(page, label).not.toContain("TODO.md");
    });
    expect(catalogue).toContain("rating star at 18px");
    expect(system).toContain("rating star's 18–20px glyph");
  });

  it("reads the tree's rule: the chevron is a drawing and the row is the target", () => {
    const row = read("packages/data/src/tree/row.tsx");
    expect(row).toContain("height: height ?? theme.density.rowHeight");
    expect(row).toContain("width: theme.iconSize.md");
    // The glyph passes the press through, so the row it sits in receives it.
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
      read("COMPONENTS.md")
        .split("\n")
        .find((line) => line.startsWith("| Target sizes ")) ?? "";

    expect(row).not.toContain("Remaining:");
    expect(row).toContain("press-routing-lifecycle");
    expect(row).toContain("rowHeight");
  });
});
