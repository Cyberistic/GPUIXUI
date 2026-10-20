/**
 * Guards the defect plan 753 fixes: `docs/design-system.md` §6 promised that
 * `theme.dimensions` let a brand widen a dialog or a toast "without touching
 * component source", but no consumer reads a dimension — the dialog still
 * paints `MAX_WIDTH` 360/480/640, the Toast `CARD_WIDTH` 380, the menu a 180px
 * minimum — and each migration is a cross-team row in `TODO.md`. The only
 * guard over the paragraph, `docs.test.ts` "states the fixed component
 * dimensions", pins its numbers, so the consumer half could be false while
 * every gate stayed green. This file holds the half the numbers cannot.
 *
 * `node:fs` is deliberate, as in the other tree-local documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dimensions } from "./scale.js";

const markdown = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

const start = markdown.indexOf("## 6. Spacing and density");
const end = markdown.indexOf("## 7. Radii, borders and elevation");
/** One line, so a hard-wrapped sentence is still one fact. */
const section = markdown.slice(start, end).replace(/\s+/g, " ");

describe("the design system's dimensions promise", () => {
  it("finds the section", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it("states that the shipped consumers paint their own values", () => {
    expect(section).toContain("still paint");
    expect(section).toContain("`TODO.md`");
    expect(section).toContain("`style`");
  });

  it("names the shipped literals the tokens do not reach", () => {
    expect(section).toContain(
      `the dialog a ${dimensions.dialogWidthSm}/${dimensions.dialogWidthMd}/${dimensions.dialogWidthLg} ladder`,
    );
    expect(section).toContain(`the Toast a ${dimensions.toastWidth}px card`);
    expect(section).toContain(
      `a menu a ${dimensions.overlayMinWidth}px minimum`,
    );
  });

  it("keeps the unconditional promise out", () => {
    expect(section).not.toContain("without touching component source");
    expect(section).not.toMatch(/so a brand can widen/i);
  });

  it("keeps the dimension story it had", () => {
    expect(section).toContain(
      `overlay surfaces take a ${dimensions.overlayMinWidth}px minimum and a ${dimensions.overlayWidth}px default width`,
    );
    expect(section).toContain(
      `a long list scrolls at ${dimensions.overlayMaxHeight}px`,
    );
    expect(section).toContain(`a toast is ${dimensions.toastWidth}px wide`);
    expect(section).toContain(
      `an icon or clear control inside a field is ${dimensions.fieldAdornmentSize}px`,
    );
  });
});
