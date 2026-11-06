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

const row = Option.getOrElse(
  Arr.findFirst(
    read(".agents/slop/COMPONENTS.md", repoRoot).split("\n"),
    Str.startsWith("| Code block |"),
  ),
  () => "",
);

const records: ReadonlyArray<readonly [string, string]> = [
  ["codeBlockMeta.limitations", limitations],
  [".agents/slop/COMPONENTS.md", row],
  ["docs/code-block.mdx", page],
];

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

  it("names the tokenizer in every record", () => {
    const missing = Arr.map(
      Arr.filter(
        records,
        ([, record]) => !Str.includes("@tanstack/highlight")(record),
      ),
      ([name]) => name,
    );
    expect(missing).toStrictEqual([]);
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
});
