import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AspectRatioDemo } from "./aspect-ratio-demo";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`\n${selector}`);
  if (start === -1) throw new Error(`no ${selector} rule`);
  return css.slice(start, css.indexOf("}", start));
};

const markup = renderToStaticMarkup(<AspectRatioDemo />);

describe("the aspect-ratio stage", () => {
  it("sizes the stage to the current box, not the tallest ratio", () => {
    expect(markup).toContain("--gx-aspect-width:320px");
    expect(markup).toContain("--gx-aspect-height:180px");
    expect(markup).toContain("--gx-aspect-tallest:427px");
    expect(markup).not.toContain("min-height");

    const frame = block(".gx-aspect-frame");
    expect(frame).toContain("height: var(--gx-aspect-height);");
    expect(frame).not.toContain("var(--gx-aspect-tallest)");
  });

  it("takes the tallest only while the reader is choosing", () => {
    const choosing = block(".gx-aspect-controls:hover");
    expect(choosing).toContain("height: var(--gx-aspect-tallest);");
    expect(choosing).toContain(
      ".gx-aspect-controls:has(:focus-visible) ~ .gx-aspect-frame",
    );

    expect(markup.indexOf('class="gx-aspect-controls"')).toBeLessThan(
      markup.indexOf('class="gx-aspect-frame"'),
    );
  });

  it("keeps the ratio buttons and the readout together", () => {
    expect(markup).toContain('class="gx-aspect-ratios"');
    expect(markup.match(/class="gx-aspect-readout"/g) ?? []).toHaveLength(2);
    expect(markup).toContain("320px wide at 16:9 · 180px tall");
  });
});
