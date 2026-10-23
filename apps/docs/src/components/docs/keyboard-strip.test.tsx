import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  keyboardContracts,
  keyboardContractFor,
} from "../../lib/keyboard-contracts";
import { KeyboardStrip } from "./keyboard-strip";

/**
 * The strip is the only place a component page states its keys, so it has to
 * print every note the model carries, name the module they were read from, and
 * stay silent where the page already writes its own `## Keyboard` section.
 *
 * The mount case reads both frames: a strip that renders but is mounted only on
 * the curated frame would leave every package page without its keys.
 */

const strip = (url: string, sections: readonly string[] = []): string =>
  renderToStaticMarkup(<KeyboardStrip sections={sections} url={url} />);

/** The text a reader sees, so an apostrophe is compared as one. */
const decode = (markup: string): string =>
  markup
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const view = readFileSync(
  new URL("../../lib/docs-view.tsx", import.meta.url),
  "utf8",
);

describe("the keyboard strip", () => {
  it("prints the keys and what each does", () => {
    const markup = strip("/docs/components/dialog");

    expect(markup).toContain("Escape");
    expect(markup).toContain("dismisses the topmost overlay");
    expect(markup).toContain("Tab");
    expect(markup).toContain("keeps focus inside the dialog");
  });

  it("names the module the keys were read from", () => {
    // The reader should be able to check the strip against the handler.
    expect(strip("/docs/components/dialog")).toContain("modal.ts");
    expect(strip("/docs/components/time-picker")).toContain("time-picker.tsx");
  });

  it("prints every note of every contract", () => {
    const missing = keyboardContracts.flatMap((contract) => {
      const markup = decode(strip(contract.url));
      return contract.notes.flatMap((note) => [
        ...note.keys
          .filter((key) => !markup.includes(">" + key + "<"))
          .map((key) => `${contract.url}: ${key}`),
        ...(markup.includes(note.action)
          ? []
          : [`${contract.url}: ${note.action}`]),
      ]);
    });

    expect(missing).toEqual([]);
  });

  it("stays silent on a page that writes its own section", () => {
    const contract = keyboardContractFor("/docs/components/dialog");
    expect(contract).toBeDefined();

    // The page's own headings arrive as the table of contents it built.
    expect(strip("/docs/components/dialog", ["#keyboard"])).toBe("");
    expect(strip("/docs/components/dialog", ["#usage", "#api"])).not.toBe("");
  });

  it("renders nothing on a page no contract names", () => {
    expect(strip("/docs/components/card")).toBe("");
    expect(strip("/docs/primitives")).toBe("");
  });

  it("is mounted on both frames", () => {
    expect(view).toContain("<KeyboardStrip");
    // One mount per frame: the curated page and the package page.
    expect(view.match(/<KeyboardStrip/g)?.length).toBe(2);
    expect(view).toContain("sections={toc.map((entry) => entry.url)}");
  });
});
