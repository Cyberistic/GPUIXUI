/**
 * The code block's palette record.
 *
 * The bug this guards: `codeBlockMeta.limitations`, the `COMPONENTS.md` Code
 * block row and `docs/code-block.mdx` all said the syntax colours were the
 * runtime's own palette with no token group owning them, so a reader was told
 * the one themed surface a reader spends time in could not be themed.
 * `@gpuixui/tokens` ships `syntaxColors`, `nativeTextTheme` hands it to the host
 * as `syntax`, and `CodeBlock` passes that object; every one of the three
 * records was stale.
 *
 * The palette's premise is derived from the seam itself rather than pinned as a
 * literal: `nativeTextTheme` must hand over `syntaxColors(theme)`, and a brand
 * palette must survive the trip, so a seam that stopped carrying the field
 * fails here before a record can describe it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import {
  extendTheme,
  lightTheme,
  nativeTextFills,
  nativeTextTheme,
  syntaxColors,
  syntaxRoles,
} from "@gpuixui/tokens";
import { codeBlockMeta } from "./code-block.js";

const packageRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

const read = (relative: string, root: URL): string =>
  readFileSync(fileURLToPath(new URL(relative, root)), "utf8");

const page = read("docs/code-block.mdx", packageRoot);
const source = read("src/code-block.tsx", packageRoot);
const limitations = codeBlockMeta.limitations.join("\n");

/** The Code block row of the Tier 5 table. */
const row = Option.getOrElse(
  Arr.findFirst(
    read("COMPONENTS.md", repoRoot).split("\n"),
    Str.startsWith("| Code block |"),
  ),
  () => "",
);

/** Every record a consumer can read the palette from. */
const records: ReadonlyArray<readonly [string, string]> = [
  ["codeBlockMeta.limitations", limitations],
  ["COMPONENTS.md", row],
  ["docs/code-block.mdx", page],
];

/** The sentences the shipped palette made false. */
const retracted: ReadonlyArray<string> = [
  "no token group owns them yet",
  "runtime's built-in light/dark syntax palette",
  "syntax colours are the runtime's own palette",
];

describe("the code block's syntax palette", () => {
  it("hands the host the palette the theme resolves", () => {
    const host = nativeTextTheme(lightTheme, "background");
    expect(Arr.sort(Object.keys(host.syntax), Str.Order)).toStrictEqual(
      Arr.sort([...syntaxRoles], Str.Order),
    );
    expect(host.syntax).toStrictEqual(syntaxColors(lightTheme));

    const brand = extendTheme(lightTheme, {
      syntax: { ...syntaxColors(lightTheme), keyword: "#7A1F5C" },
    });
    expect(nativeTextTheme(brand, "background").syntax?.keyword).toBe(
      "#7A1F5C",
    );
  });

  it("paints through the seam, on a fill the palette is measured on", () => {
    expect(Str.includes('nativeTextTheme(theme, "background")')(source)).toBe(
      true,
    );
    expect(Arr.contains(nativeTextFills, "background")).toBe(true);
  });

  it("retracts the runtime's own palette from every record", () => {
    const stale = Arr.flatMap(records, ([name, record]) =>
      Arr.map(
        Arr.filter(retracted, (sentence) => Str.includes(sentence)(record)),
        (sentence) => `${name}: ${sentence}`,
      ),
    );
    expect(stale).toStrictEqual([]);
  });

  it("names the palette and the contract that holds it", () => {
    const unnamed = Arr.map(
      Arr.filter(
        records,
        ([, record]) =>
          !Str.includes("syntaxColors")(record) ||
          !Str.includes("syntax.test.ts")(record),
      ),
      ([name]) => name,
    );
    expect(unnamed).toStrictEqual([]);
    expect(page).toContain("tokenizer");
  });

  it("teaches a brand the route its palette takes", () => {
    expect(page).toContain("extendTheme(theme, {");
    expect(page).toContain("syntaxColors(theme)");
  });
});
