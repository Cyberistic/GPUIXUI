import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

describe("the tooltip overlay", () => {
  it("takes no layout space of its own", () => {
    expect(rule(".gx-tip-anchor")).toContain("position: relative");
    expect(rule(".gx-tip")).toContain("position: absolute");
  });

  it("cannot resize the scene it sits in", () => {
    expect(rule(".gx-tooltip-scene")).toContain("width: min(360px, 100%)");
    expect(rule(".gx-tooltip-demo")).toContain("width: 100%");
  });

  it("holds the readout's box while its sentence changes length", () => {
    const readout = rule(".gx-tip-readout");

    expect(readout).toContain("width: 100%");
    expect(readout).toContain("text-align: center");
  });
});
