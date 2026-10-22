/**
 * The decisions a code block makes before it renders.
 *
 * The bugs these guard: a header that prints the path's extension for a file
 * whose extension no highlighter understands; a blank `language=""` painting an
 * empty chip instead of falling back to the path; a source that ends with a
 * newline claiming one row more than it paints; a whitespace-only source
 * counting as content and hiding the empty state; and a description that says
 * "1 lines" or drops the language a reader needs to know.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  codeBlockDescription,
  codeBlockHeader,
  codeBlockName,
  codeRowCount,
  hasCode,
  languageOfPath,
} from "./logic.js";

describe("languageOfPath", () => {
  it("names the language an extension is known to highlight", () => {
    expect(languageOfPath("src/app.tsx")).toEqual(Option.some("tsx"));
    expect(languageOfPath("README.md")).toEqual(Option.some("markdown"));
    expect(languageOfPath("script.SH")).toEqual(Option.some("bash"));
  });

  it("stays quiet for an extension no highlighter knows, and for none at all", () => {
    expect(languageOfPath("notes.xyz")).toEqual(Option.none());
    expect(languageOfPath("Makefile")).toEqual(Option.none());
  });
});

describe("codeBlockHeader", () => {
  it("takes the path as the title and its extension as the language", () => {
    expect(codeBlockHeader({ path: "src/app.tsx" })).toEqual({
      title: Option.some("src/app.tsx"),
      language: Option.some("tsx"),
    });
  });

  it("prefers the caller's title and language over the path", () => {
    expect(
      codeBlockHeader({
        title: "Install",
        path: "src/app.tsx",
        language: "bash",
      }),
    ).toEqual({
      title: Option.some("Install"),
      language: Option.some("bash"),
    });
  });

  it("reads a blank field as none instead of painting an empty label", () => {
    expect(
      codeBlockHeader({ title: "  ", path: "run.sh", language: "" }),
    ).toEqual({
      title: Option.some("run.sh"),
      language: Option.some("bash"),
    });
  });

  it("has neither field when nothing names them", () => {
    expect(codeBlockHeader({})).toEqual({
      title: Option.none(),
      language: Option.none(),
    });
  });
});

describe("hasCode", () => {
  it("refuses a whitespace-only source", () => {
    expect(hasCode("")).toBe(false);
    expect(hasCode(" \n\t ")).toBe(false);
    expect(hasCode("x")).toBe(true);
  });
});

describe("codeRowCount", () => {
  it("counts a trailing newline as the end of the last line, not a row", () => {
    expect(codeRowCount("const a = 1\n")).toBe(1);
    expect(codeRowCount("const a = 1")).toBe(1);
    expect(codeRowCount("a\nb\n")).toBe(2);
  });

  it("keeps blank lines inside the source", () => {
    expect(codeRowCount("a\n\nb")).toBe(3);
    expect(codeRowCount("a\n\n")).toBe(2);
  });

  it("reads every line ending the runtime accepts", () => {
    expect(codeRowCount("a\r\nb\rc")).toBe(3);
  });

  it("has no rows for an empty source", () => {
    expect(codeRowCount("")).toBe(0);
    expect(codeRowCount("   \n\n")).toBe(0);
  });
});

describe("the name and description a reader hears", () => {
  it("names the block by its title, or generically without one", () => {
    expect(
      codeBlockName({
        title: Option.some("src/app.tsx"),
        language: Option.none(),
      }),
    ).toBe("src/app.tsx");
    expect(
      codeBlockName({ title: Option.none(), language: Option.some("tsx") }),
    ).toBe("Code");
  });

  it("counts one line in the singular and names the language", () => {
    expect(codeBlockDescription(1, Option.some("tsx"))).toBe("1 line of tsx");
    expect(codeBlockDescription(12, Option.some("tsx"))).toBe(
      "12 lines of tsx",
    );
    expect(codeBlockDescription(12, Option.none())).toBe("12 lines");
  });

  it("describes an empty block as empty", () => {
    expect(codeBlockDescription(0, Option.some("tsx"))).toBe("Empty");
  });
});
