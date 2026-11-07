import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { files } from "./data.js";
import { highlight, openFile, splitComment } from "./logic.js";

const joined = (line: string) =>
  Arr.join(
    Arr.map(highlight(line), (token) => token.text),
    "",
  );

describe("highlight", () => {
  it("joins every line of every file back to itself", () => {
    for (const file of files)
      for (const line of file.code) expect(joined(line)).toBe(line);
  });

  it("names a keyword, a string and a comment", () => {
    const line = 'import { Stack } from "@gpuixui/primitives"; // one tree';
    const tokens = highlight(line);
    expect(
      Arr.some(tokens, (t) => t.tone === "keyword" && t.text === "import"),
    ).toBe(true);
    expect(Arr.some(tokens, (t) => t.tone === "string")).toBe(true);
    expect(Option.getOrUndefined(Arr.last(tokens))?.tone).toBe("comment");
    expect(splitComment(line)[1]).toBe("// one tree");
  });

  it("opens a file by name and keeps the first for an unknown one", () => {
    expect(Option.getOrUndefined(openFile(files, "theme.ts"))?.name).toBe(
      "theme.ts",
    );
    expect(Option.getOrUndefined(openFile(files, "nope.ts"))?.name).toBe(
      "page.tsx",
    );
  });
});
