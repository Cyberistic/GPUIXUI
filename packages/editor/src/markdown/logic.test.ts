/**
 * The markdown editor's rules.
 *
 * The bug guarded: an unclosed fence swallows every following line in the
 * preview, so a preview that trusts the source turns the rest of the document
 * into one code block while the reader is still typing the block. The source is
 * never repaired; only the preview closes the fence.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  closeFences,
  markdownStats,
  modeOf,
  openFence,
  statsLabel,
} from "./logic.js";

describe("openFence", () => {
  it("reads an unclosed backtick fence", () => {
    expect(Option.getOrNull(openFence("```ts\nconst a = 1"))).toBe("```");
  });

  it("treats a closed fence as closed", () => {
    expect(Option.isNone(openFence("```ts\ncode\n```"))).toBe(true);
  });

  it("closes a tilde fence with its own marker", () => {
    expect(Option.getOrNull(openFence("~~~\ncode"))).toBe("~~~");
    expect(Option.isNone(openFence("~~~\ncode\n~~~"))).toBe(true);
  });

  it("does not read an indented four-space fence", () => {
    expect(Option.isNone(openFence("    ```\n    code"))).toBe(true);
  });

  it("does not read inline ticks as a fence", () => {
    expect(Option.isNone(openFence("use ```x``` inline"))).toBe(true);
  });
});

describe("closeFences", () => {
  it("leaves a closed document exactly as it was", () => {
    const source = "# Title\n\n```ts\nconst a = 1\n```\n";
    expect(closeFences(source)).toBe(source);
  });

  it("appends only the missing marker", () => {
    expect(closeFences("```\ncode")).toBe("```\ncode\n```");
    expect(closeFences("~~~\ncode")).toBe("~~~\ncode\n~~~");
  });
});

describe("markdownStats", () => {
  it("counts an empty document as nothing", () => {
    expect(markdownStats("")).toStrictEqual({
      lines: 0,
      words: 0,
      characters: 0,
    });
  });

  it("counts lines, words and code points", () => {
    expect(markdownStats("a b\nc")).toStrictEqual({
      lines: 2,
      words: 3,
      characters: 5,
    });
    expect(markdownStats("hi 👋🏽")).toStrictEqual({
      lines: 1,
      words: 2,
      characters: 5,
    });
  });

  it("does not count runs of whitespace as words", () => {
    expect(markdownStats("  a   b  \n\n").words).toBe(2);
  });
});

describe("modeOf", () => {
  it("keeps a stored view and falls back from anything else", () => {
    expect(modeOf("preview")).toBe("preview");
    expect(modeOf("source")).toBe("source");
    expect(modeOf("wide")).toBe("split");
    expect(modeOf(undefined, "preview")).toBe("preview");
    expect(modeOf(7)).toBe("split");
  });
});

describe("statsLabel", () => {
  it("prints a singular for one and a plural otherwise", () => {
    expect(statsLabel({ lines: 1, words: 1, characters: 3 })).toBe(
      "1 line · 1 word",
    );
    expect(statsLabel({ lines: 2, words: 3, characters: 9 })).toBe(
      "2 lines · 3 words",
    );
  });
});
