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

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

interface Rule {
  readonly selector: string;
  readonly body: string;
}

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

      expect(html).not.toMatch(/<span[^>]*class="[^"]*gx-date-navbtn/);
    }

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

    expect(style).toContain("appearance: none");
    expect(style).toContain("height: var(--control-height-sm)");
    expect(style).toContain("padding: 0 calc(");
    expect(style).toContain("border: 1px solid var(--border)");
    expect(style).toContain("border-radius: var(--radius)");
    expect(style).toContain("background: var(--input)");
    expect(style).toContain("color: var(--input-foreground)");
    expect(style).toContain("font-size: 13px");

    expect(css).toContain(
      `--control-height-sm: ${themes.light.density.controlHeight.sm}px`,
    );

    expect(html.match(/class="gx-date-select"/g) ?? []).toHaveLength(2);
    expect(html.match(/class="gx-date-chevron"/g) ?? []).toHaveLength(2);
    expect(html).toMatch(/class="gx-date-chevron"[\s\S]{0,400}<svg/);
    expect(block(".gx-date-chevron")).toContain("pointer-events: none");
  });
});
