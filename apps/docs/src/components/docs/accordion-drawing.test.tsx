import { ACCORDION_CONTENT, ACCORDION_TRIGGER } from "@gpuixui/tw";
import { themes } from "@gpuixui/tokens";
import { classesToStyle } from "@gpuixui/tw";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccordionComposition } from "./demos";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const style = (recipe: string): ReturnType<typeof classesToStyle>["style"] =>
  classesToStyle(recipe, themes.dark).style;

const markup = renderToStaticMarkup(<AccordionComposition />);

describe("the settings accordion draws the component's rows", () => {
  it("paints the header at the recipe's inset, gap and type", () => {
    const header = style(ACCORDION_TRIGGER);
    const trigger = rule(".gx-acc-trigger");

    expect(header.paddingLeft).toBe(4);
    expect(trigger).toContain(`padding: 0 ${header.paddingLeft}px;`);
    expect(trigger).toContain(`gap: ${header.gap}px;`);
    expect(trigger).toContain(`font-size: ${header.fontSize}px;`);
    expect(trigger).toContain(`font-weight: ${header.fontWeight};`);
    expect(header.color).toBe(themes.dark.colors.foreground);
    expect(trigger).toContain("color: var(--foreground);");
  });

  it("lets the row wash reach the frame's edges", () => {
    expect(rule(".gx-acc-panel")).not.toContain("padding");
    expect(rule(".gx-acc-trigger")).toContain("width: 100%;");
    expect(markup).toContain('class="gx-acc gx-acc-panel"');
  });

  it("paints the body at the content recipe's inset", () => {
    const content = style(ACCORDION_CONTENT);
    const body = rule(".gx-acc-body");

    expect(content.paddingLeft).toBe(4);
    expect(content.paddingBottom).toBe(8);
    expect(body).toContain(
      `padding: 0 ${content.paddingLeft}px ${content.paddingBottom}px;`,
    );
  });

  it("opens one section at a time and leaves the last one disabled", () => {
    expect(markup.match(/aria-expanded="true"/g) ?? []).toHaveLength(1);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-disabled="true"');
  });
});
