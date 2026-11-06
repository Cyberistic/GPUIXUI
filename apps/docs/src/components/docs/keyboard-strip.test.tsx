import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  keyboardContracts,
  keyboardContractFor,
} from "../../lib/keyboard-contracts";
import { KeyboardStrip } from "./keyboard-strip";

const strip = (url: string, sections: readonly string[] = []): string =>
  renderToStaticMarkup(<KeyboardStrip sections={sections} url={url} />);

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
    const markup = strip("/components/dialog");

    expect(markup).toContain("Escape");
    expect(markup).toContain("dismisses the topmost overlay");
    expect(markup).toContain("Tab");
    expect(markup).toContain("keeps focus inside the dialog");
  });

  it("names the module the keys were read from", () => {
    expect(strip("/components/dialog")).toContain("modal.ts");
    expect(strip("/components/time-picker")).toContain("time-picker.tsx");
  });

  it("names the runtime a wrapper's keys belong to", () => {
    const markup = decode(strip("/components/select"));
    expect(markup).toContain("select.js");
    expect(markup).toContain("in the pinned GPUix runtime");
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
    const contract = keyboardContractFor("/components/dialog");
    expect(contract).toBeDefined();

    expect(strip("/components/dialog", ["#keyboard"])).toBe("");
    expect(strip("/components/dialog", ["#usage", "#api"])).not.toBe("");
  });

  it("renders nothing on a page no contract names", () => {
    expect(strip("/components/card")).toBe("");
    expect(strip("/primitives")).toBe("");
  });

  it("is mounted on both frames", () => {
    expect(view).toContain("<KeyboardStrip");

    expect(view.match(/<KeyboardStrip/g)?.length).toBe(2);
    expect(view).toContain("sections={toc.map((entry) => entry.url)}");
  });
});
