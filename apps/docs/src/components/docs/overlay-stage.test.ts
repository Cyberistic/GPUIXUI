import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const stageOf: Readonly<Record<string, string>> = {
  "gx-dialog-backdrop": "gx-demo-dialog",
  "gx-drawer-backdrop": "gx-drawer-frame",
};

const rule = (selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, selectors]) =>
      (selectors ?? "").split(",").some((one) => one.trim() === `.${selector}`),
    )
    .map(([, , body]) => body ?? "")
    .join("\n");

const veils = [
  ...new Set(
    [...css.matchAll(/\.(gx-[a-z-]+-backdrop)\s*\{([^}]*)\}/g)]
      .filter(([, , body]) => /inset:\s*0/.test(body ?? ""))
      .flatMap(([, name]) => (name === undefined ? [] : [name])),
  ),
].sort();

describe("the drawings' overlay veils", () => {
  it("are all mapped to the frame that fills them", () => {
    expect(veils.filter((veil) => stageOf[veil] === undefined)).toEqual([]);
  });

  it("sit in a frame that declares a real height", () => {
    const collapsed = Object.values(stageOf).filter((frame) => {
      const height = /(?:min-)?height:\s*(\d+)px/.exec(rule(frame))?.[1];
      return height === undefined || Number(height) < 200;
    });
    expect(collapsed).toEqual([]);
  });

  it("finds the veils it is meant to read", () => {
    expect(veils.length).toBeGreaterThan(1);
  });
});
