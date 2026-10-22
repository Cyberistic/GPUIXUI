/**
 * The code block's tokenizer record.
 *
 * The bug this guards: the records that describe the block all said the runtime's
 * own `<code>` host decided which run was a token and that `nativeTextTheme`
 * handed the host its palette, so a reader was told the block painted through a
 * host it no longer uses. The block now tokenizes with `@tanstack/highlight`
 * (`code-block/tokenize.ts`) and resolves `syntaxColors(theme)` directly.
 *
 * The checks are derived from the seam rather than pinned as prose: the block's
 * source must read `syntaxColors(theme)`, the tokenizer module must import
 * `@tanstack/highlight` and map its classes through `tokenRole`, and every record
 * must name the tokenizer and fall back to plain text rather than a host.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { codeBlockMeta } from "./code-block.js";

const packageRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

const read = (relative: string, root: URL): string =>
  readFileSync(fileURLToPath(new URL(relative, root)), "utf8");

const page = read("docs/code-block.mdx", packageRoot);
const source = read("src/code-block.tsx", packageRoot);
const tokenizer = read("src/code-block/tokenize.ts", packageRoot);
const limitations = codeBlockMeta.limitations.join("\n");

/** The Code block row of the Tier 5 table. */
const row = Option.getOrElse(
  Arr.findFirst(
    read("COMPONENTS.md", repoRoot).split("\n"),
    Str.startsWith("| Code block |"),
  ),
  () => "",
);

/** Every record a consumer can read the tokenizer from. */
const records: ReadonlyArray<readonly [string, string]> = [
  ["codeBlockMeta.limitations", limitations],
  ["COMPONENTS.md", row],
  ["docs/code-block.mdx", page],
];

/** The sentences the tokenizer made false. */
const retracted: ReadonlyArray<string> = [
  "runtime's tokenizer decides",
  "nativeTextTheme",
  "runtime's own `<code>` host",
  "no component change",
];

describe("the code block's tokenizer", () => {
  it("resolves the palette and maps token classes in its own tokenizer module", () => {
    expect(Str.includes("syntaxColors(theme)")(source)).toBe(true);
    expect(Str.includes("@tanstack/highlight")(tokenizer)).toBe(true);
    expect(Str.includes("tokenRole")(tokenizer)).toBe(true);
  });

  it("names the tokenizer and the plain-text fallback in every record", () => {
    const missing = Arr.map(
      Arr.filter(
        records,
        ([, record]) => !Str.includes("@tanstack/highlight")(record),
      ),
      ([name]) => name,
    );
    expect(missing).toStrictEqual([]);
    expect(page).toContain("plain text");
  });

  it("retracts the runtime host and its tokenizer from every record", () => {
    const stale = Arr.flatMap(records, ([name, record]) =>
      Arr.map(
        Arr.filter(retracted, (sentence) => Str.includes(sentence)(record)),
        (sentence) => `${name}: ${sentence}`,
      ),
    );
    expect(stale).toStrictEqual([]);
  });

  it("teaches a brand the route its palette takes", () => {
    expect(page).toContain("extendTheme(theme, {");
    expect(page).toContain("syntaxColors(theme)");
    expect(page).toContain("`@tanstack/highlight`");
  });
});
