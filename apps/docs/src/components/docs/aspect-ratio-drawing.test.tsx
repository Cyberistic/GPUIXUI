import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AspectRatioDemo } from "./aspect-ratio-demo";

/**
 * The aspect-ratio stage, as drawn.
 *
 * Guarded bug: the stage reserved the tallest ratio at the current width for
 * every state, so a 16:9 box left a 247px band of empty page under it. The
 * stage is now the box at rest and the tallest only while the reader is in the
 * controls — the promise "a ratio change does not move the page under the
 * pointer" holds without the band.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first rule whose selector list starts with `selector`. */
const block = (selector: string): string => {
  const start = css.indexOf(`\n${selector}`);
  if (start === -1) throw new Error(`no ${selector} rule`);
  return css.slice(start, css.indexOf("}", start));
};

const markup = renderToStaticMarkup(<AspectRatioDemo />);

describe("the aspect-ratio stage", () => {
  it("sizes the stage to the current box, not the tallest ratio", () => {
    // 320 / (16 / 9) = 180 at rest; 320 / 0.75 = 427 is the reservation the
    // controls may take while they are in use.
    expect(markup).toContain("--gx-aspect-width:320px");
    expect(markup).toContain("--gx-aspect-height:180px");
    expect(markup).toContain("--gx-aspect-tallest:427px");
    expect(markup).not.toContain("min-height");

    const frame = block(".gx-aspect-frame");
    expect(frame).toContain("height: var(--gx-aspect-height);");
    expect(frame).not.toContain("var(--gx-aspect-tallest)");
  });

  it("takes the tallest only while the reader is choosing", () => {
    // The reservation is a sibling rule on the controls, so it cannot move the
    // slider or the ratio buttons; it holds the stage while a press is being
    // aimed and lets go when the pointer leaves.
    const choosing = block(".gx-aspect-controls:hover");
    expect(choosing).toContain("height: var(--gx-aspect-tallest);");
    expect(choosing).toContain(
      ".gx-aspect-controls:has(:focus-visible) ~ .gx-aspect-frame",
    );

    // The controls come first: nothing the reader is pointing at sits below the
    // stage, so the reservation cannot reflow them.
    expect(markup.indexOf('class="gx-aspect-controls"')).toBeLessThan(
      markup.indexOf('class="gx-aspect-frame"'),
    );
  });

  it("keeps the ratio buttons and the readout together", () => {
    // The readout moved above the stage with the controls: it reports the box
    // and must not be pushed down by a taller reservation.
    expect(markup).toContain('class="gx-aspect-ratios"');
    expect(markup.match(/class="gx-aspect-readout"/g) ?? []).toHaveLength(2);
    expect(markup).toContain("320px wide at 16:9 · 180px tall");
  });
});
