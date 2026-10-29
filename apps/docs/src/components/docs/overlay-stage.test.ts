import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every overlay veil in the drawings sits in a frame that owns a height.
 *
 * Guarded bug: `.gx-dialog-backdrop` was an `inset: 0` layer inside a frame
 * whose only height came from `min-height: 100%` against a preview panel that
 * now hugs its content — so `/components/dialog` painted an empty 28px
 * strip, and `/components/confirm-dialog` clipped its dialog to a sliver.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** The frame each veil fills. A new veil has to be mapped here. */
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
    // A percentage of a panel that hugs its content is not a height: the drawer
    // frame once hugged its issues list at 303px and `min-height: 100%` on the
    // dialog's frame resolved to the content's own 28px. A frame is the window,
    // so it declares its own box — a height or a floor either way.
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
