/**
 * Guards the half of plan 723's Decision 5 that shipped undone: the wash walk
 * gained the pressed `selectedActive` fill, but seven passages that carry the old
 * reason — "a row is selected at rest" — were never corrected, and four of them
 * (both source blocks, the catalogue's interaction-states paragraph and the
 * design system's selected-row paragraph) said the pressed fill is deliberately
 * outside the selection-wash walk. The pages contradicted their own *Text
 * selection* sections, a reader was told the pressed fill is unmeasured when it
 * is measured, and the reason itself is the one plan 723 refuted:
 * `selectionSurfaces` holds `hover` and `active`, the pointer states of an
 * *unselected* row, because a reader drags a selection with the button held.
 *
 * Three further passages state the same reason about lists that do stop at the
 * pressed row. Plan 723 Decision 3 keeps the pressed row's own pairs at rest in
 * `selectionPressPairs`, so those passages now name that owner instead of the
 * row's transience.
 *
 * The cases read the shipped sentences and the published pair lists, so a later
 * plan that moves `selectedActive` into or out of a walk, or restores the old
 * phrase, fails here until the prose follows.
 *
 * `node:fs` is deliberate, as in the other tree-local documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dialogSurfacePairs,
  elevationContentSurfaces,
  elevationSurfaces,
  overlaySurfaces,
  selectionInactivePairs,
  selectionInputPairs,
  selectionPairs,
  selectionPressPairs,
  selectionStatusPairs,
  selectionSurfaces,
  selectionWashPairs,
} from "./index.js";

const source = readFileSync(new URL("./contrast.ts", import.meta.url), "utf8");
const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const designSystemSource = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);
const designSystem = designSystemSource
  .split("\n")
  .map((line) => line.replace(/\s+/g, " "));
const designSystemProse = designSystemSource.replace(/\s+/g, " ");

/** The JSDoc block directly above a module-level declaration, collapsed. */
const docBlockAbove = (declaration: string): string => {
  const at = source.indexOf(declaration);
  expect(at, declaration).toBeGreaterThan(-1);
  const start = source.lastIndexOf("/**", at);
  return source
    .slice(start, source.indexOf("*/", start))
    .replace(/^[ \t]*\*[ \t]?/gm, "")
    .replace(/\s+/g, " ");
};

/** The design-system table row that starts with `label`, collapsed. */
const tableRow = (label: string): string => {
  const row = designSystem.find((line) => line.startsWith(`| ${label}`));
  expect(row, label).toBeDefined();
  return row ?? "";
};

/** The catalogue paragraph that follows `anchor`, as the reader sees it. */
const paragraphAfter = (anchor: string): string => {
  const at = catalogue.indexOf(anchor);
  expect(at, anchor).toBeGreaterThan(-1);
  return catalogue.slice(at, at + 700);
};

describe("the pressed row's exclusion reason", () => {
  it("describes the walks the pair lists actually run", () => {
    // The pressed fill is a selection surface.
    expect(
      selectionWashPairs.filter(
        ([foreground, background]) =>
          foreground === "selection" && background === "selectedActive",
      ),
    ).toHaveLength(1);
    // The scrim, the dialog face and the elevation shadow read a window at rest.
    expect(overlaySurfaces).not.toContain("selectedActive");
    expect(elevationSurfaces).not.toContain("selectedActive");
    expect(elevationContentSurfaces).not.toContain("selectedActive");
    expect(
      dialogSurfacePairs.map(([, background]) => background),
    ).not.toContain("selectedActive");
    // The pressed row's own pairs live at rest, in their own list.
    expect(selectionSurfaces).toHaveLength(9);
    expect(selectionSurfaces).not.toContain("selectedActive");
    [
      selectionPairs,
      selectionInputPairs,
      selectionInactivePairs,
      selectionStatusPairs,
    ].forEach((pairs) => {
      expect(pairs.map(([, background]) => background)).not.toContain(
        "selectedActive",
      );
    });
    expect(selectionPressPairs.map(([, background]) => background)).toContain(
      "selectedActive",
    );
  });

  it("states the supersession in the pressed-row block", () => {
    const block = docBlockAbove("export const selectionPressPairs");

    expect(block).toContain("selectionWashPairs");
    expect(block).toContain("plan 723");
    expect(block).toContain("modal-scrim");
    expect(block).toContain("elevation");
    expect(block).not.toContain("deliberately outside the selection-wash");
    expect(block).not.toContain("a row is selected at rest");
  });

  it("states it in the typed-text block", () => {
    const block = docBlockAbove("export const selectionInputPairs");

    expect(block).toContain("selectionPressPairs");
    expect(block).toContain("selectionWashPairs");
    expect(block).not.toContain("a row is selected at rest");
    expect(block).not.toContain("stays out of the selection-wash contract");
  });

  it("states it in the catalogue's interaction-states paragraph", () => {
    const paragraph = paragraphAfter(
      "Before plan `651` the design system claimed the chosen row",
    );

    expect(paragraph).toContain("The pressed fill is a selection surface");
    expect(paragraph).toContain("selectionWashPairs");
    expect(paragraph).toContain("plan `723`");
    expect(paragraph).toContain("modal-scrim");
    expect(paragraph).toContain("elevation");
    expect(paragraph).not.toContain("outside the selection-wash");
    expect(paragraph).not.toContain("a row is selected at rest");
  });

  it("names the real owner in the design system's inactive-label row", () => {
    const row = tableRow("inactive label (");

    expect(row).toContain("selectionPressPairs");
    expect(row).toContain("inactiveSurfaces");
    expect(row).toContain("plan `723`");
    expect(row).not.toContain("a pressed row is transient");
  });

  it("states it in the design system's selected-row paragraph", () => {
    const anchor = "The pressed fill is a selection surface";
    const at = designSystemProse.indexOf(anchor);

    expect(at).toBeGreaterThan(-1);
    const paragraph = designSystemProse.slice(at, at + 400);
    expect(paragraph).toContain("selectionWashPairs");
    expect(paragraph).toContain("plan `723`");
    expect(paragraph).toContain("modal scrim");
    expect(paragraph).toContain("elevation");
    expect(paragraph).not.toContain(
      "The fill is transient, so the selection wash",
    );
  });

  it("names the real owner in the design system's disabled-state row", () => {
    const row = tableRow("disabled |");

    expect(row).toContain("inactiveSurfaces");
    expect(row).toContain("plan `723`");
    expect(row).not.toContain("a pressed row is transient");
  });

  it("keeps the design system's wash row naming the pressed fill", () => {
    const row = tableRow("text selection |");

    expect(row).toContain("pressed `selectedActive`");
    expect(row).toContain("plan `723`");
  });
});
