import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The tooltip preview must not move the page it annotates.
 *
 * Guarded bug: hovering the trigger re-centred the whole scene. The tip is an
 * absolute overlay and never took layout space — the state readout under the
 * trigger did. Its sentence is longest while the tip is open, the scene sized
 * itself to its widest child, and the stage centres that scene, so opening a
 * tip slid the trigger, the readout and the motion switch sideways by 50px.
 *
 * The fix is measured in the browser: every box is identical before and after
 * the hover, and the document's scroll height does not move. What a stylesheet
 * can promise here is that the boxes cannot depend on their content's length,
 * which is what these cases read.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

describe("the tooltip overlay", () => {
  it("takes no layout space of its own", () => {
    // An overlay is absolute against its anchor: a tip in flow would push the
    // page it annotates.
    expect(rule(".gx-tip-anchor")).toContain("position: relative");
    expect(rule(".gx-tip")).toContain("position: absolute");
  });

  it("cannot resize the scene it sits in", () => {
    // The scene is centred in the stage, so a scene that grows shifts
    // everything inside it. Its width is the scene's own, not its children's.
    expect(rule(".gx-tooltip-scene")).toContain("width: min(360px, 100%)");
    expect(rule(".gx-tooltip-demo")).toContain("width: 100%");
  });

  it("holds the readout's box while its sentence changes length", () => {
    // `tip closed` and `tip open · …` are different lengths; a shrink-to-fit
    // box moved itself to say so.
    const readout = rule(".gx-tip-readout");

    expect(readout).toContain("width: 100%");
    expect(readout).toContain("text-align: center");
  });
});
