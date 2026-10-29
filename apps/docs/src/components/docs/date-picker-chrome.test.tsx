import { readFileSync } from "node:fs";
import { themes } from "@gpuixui/tokens";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CalendarDropdowns,
  CalendarRange,
  CalendarSingle,
} from "./date-picker-demo";

/**
 * The Calendar and Date picker chrome.
 *
 * The bugs these guard:
 *
 * - the range window's nav spacer wore `gx-date-navbtn`, so pointing at the gap
 *   between the two months painted the button's grey hover square — a control
 *   that is not there;
 * - the caption `<select>`s were native boxes: the browser's own arrow, a tall
 *   `md` box and a `borderStrong` edge that matched neither the field nor the
 *   `Select`'s `sm` trigger.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

interface Rule {
  readonly selector: string;
  readonly body: string;
}

/** Every top-level rule, with a selector list split. */
const rules = (source: string): ReadonlyArray<Rule> => {
  const found: Array<Rule> = [];
  let from = 0;
  for (;;) {
    const open = source.indexOf("{", from);
    if (open === -1) return found;
    const selector = source.slice(from, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < source.length && depth > 0; end += 1) {
      if (source[end] === "{") depth += 1;
      if (source[end] === "}") depth -= 1;
    }
    const body = source.slice(open + 1, end - 1);
    if (!selector.startsWith("@")) {
      found.push(
        ...selector.split(",").map((part) => ({ selector: part.trim(), body })),
      );
    }
    from = end;
  }
};

/** One selector's declarations. */
const block = (selector: string): string =>
  rules(css).find((rule) => rule.selector === selector)?.body ?? "";

const pages: ReadonlyArray<readonly [string, ComponentType]> = [
  ["the single month", CalendarSingle],
  ["the dropdown caption", CalendarDropdowns],
  ["the range", CalendarRange],
];

describe("the calendar's nav spacer", () => {
  it("is never a control, on any caption or side", () => {
    for (const [, Page] of pages) {
      const html = renderToStaticMarkup(<Page />);
      // The phantom was a `<span>` carrying the button's class, which the
      // button's own hover rule then filled.
      expect(html).not.toMatch(/<span[^>]*class="[^"]*gx-date-navbtn/);
    }

    // The two-month window paints one spacer on each inner edge, where the
    // shared nav pair leaves room for the arrow the other month does not own.
    const range = renderToStaticMarkup(<CalendarRange />);
    const spacers = [
      ...range.matchAll(/<span[^>]*class="([^"]*gx-date-navspacer[^"]*)"/g),
    ];
    expect(spacers).toHaveLength(2);
  });

  it("paints nothing in any state", () => {
    const spacer = rules(css).filter((rule) =>
      rule.selector.includes("gx-date-navspacer"),
    );
    expect(spacer.map((rule) => rule.selector)).toEqual([".gx-date-navspacer"]);
    expect(spacer[0]?.body).toContain("visibility: hidden");
    expect(spacer.filter((rule) => /background/.test(rule.body))).toEqual([]);

    // The pointer wash belongs to the button, so no element can take it by
    // mere class name.
    expect(
      rules(css)
        .filter((rule) => rule.selector.includes("gx-date-navbtn:hover"))
        .map((rule) => rule.selector),
    ).toEqual(["button.gx-date-navbtn:hover:not(:disabled)"]);
  });
});

describe("the caption selects", () => {
  it("stand at the Select's sm trigger, with the icon set's chevron", () => {
    const html = renderToStaticMarkup(<CalendarDropdowns />);
    const selects = rules(css).filter(
      (rule) => rule.selector === ".gx-date-select",
    );
    expect(selects).toHaveLength(1);

    const style = selects[0]?.body ?? "";
    // `appearance: none` is what removes the browser's arrow box.
    expect(style).toContain("appearance: none");
    expect(style).toContain("height: var(--control-height-sm)");
    expect(style).toContain("padding: 0 calc(");
    expect(style).toContain("border: 1px solid var(--border)");
    expect(style).toContain("border-radius: var(--radius)");
    expect(style).toContain("background: var(--input)");
    expect(style).toContain("color: var(--input-foreground)");
    expect(style).toContain("font-size: 13px");

    // The height is the shipped `sm` box, not a number that drifted.
    expect(css).toContain(
      `--control-height-sm: ${themes.light.density.controlHeight.sm}px`,
    );

    // Two selects, each with the icon set's own chevron over it.
    expect(html.match(/class="gx-date-select"/g) ?? []).toHaveLength(2);
    expect(html.match(/class="gx-date-chevron"/g) ?? []).toHaveLength(2);
    expect(html).toMatch(/class="gx-date-chevron"[\s\S]{0,400}<svg/);
    expect(block(".gx-date-chevron")).toContain("pointer-events: none");
  });
});
