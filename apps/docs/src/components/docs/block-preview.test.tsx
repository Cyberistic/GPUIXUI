import { themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BlockPreview } from "./block-preview";

vi.mock("./platform-toggle", () => ({
  usePlatform: () => ({
    platform: "darwin",
    look: "native",
    mode: "dark",
    theme: themes.dark,
    setPlatform: () => undefined,
    setLook: () => undefined,
    setMode: () => undefined,
  }),
}));

const css = readFileSync(
  new URL("../../styles/blocks.css", import.meta.url),
  "utf8",
);

const cssBlock = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  return start === -1 || end === -1 ? "" : css.slice(start, end);
};

describe("a block page", () => {
  const markup = renderToStaticMarkup(<BlockPreview name="dashboard-01" />);

  it("paints the block in the page column, not the component card", () => {
    expect(markup).toContain('class="gx-demo gx-block-stage"');
    expect(markup).not.toContain("gx-component");

    const stage = cssBlock(".gx-block-stage");
    expect(stage).toContain("overflow: visible");
    expect(stage).not.toContain("height: 520px");
  });

  it("keeps the recipe in a disclosure under the screen", () => {
    expect(markup).toContain("Hunter Association — Overview");
    expect(markup).toContain("Recipe — dashboard-01");
  });
});
