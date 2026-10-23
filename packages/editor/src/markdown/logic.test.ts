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
  splitBounds,
  splitOf,
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

  it("does not let a shorter run close a longer fence", () => {
    // The bug guarded: the preview treated any tick line as a closer, so a
    // three-tick line inside a four-tick block ended it and swallowed the rest.
    expect(Option.getOrNull(openFence("````\n```\ncode"))).toBe("````");
    expect(Option.getOrNull(openFence("~~~~\n~~~\ncode"))).toBe("~~~~");
    expect(closeFences("````\n```\ncode")).toBe("````\n```\ncode\n````");
    expect(Option.isNone(openFence("```\ncode\n````"))).toBe(true);
  });

  it("does not let an info string close a fence", () => {
    // ```js opens a block; inside another one it is content, not a closer.
    expect(Option.getOrNull(openFence("```\n```js\ncode"))).toBe("```");
    expect(Option.getOrNull(openFence("```\n``` js\ncode"))).toBe("```");
    // Trailing spaces alone are still a closing fence in CommonMark.
    expect(Option.isNone(openFence("```\ncode\n```   \nmore"))).toBe(true);
  });

  it("keeps a fence of the other family open", () => {
    expect(Option.getOrNull(openFence("```\n~~~\ncode"))).toBe("```");
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

describe("splitOf", () => {
  it("holds a stored split inside the view's band", () => {
    expect(splitBounds(634)).toStrictEqual({ min: 158, max: 475 });
    expect(splitOf(200, 634)).toBe(200);
    expect(splitOf(10, 634)).toBe(158);
    expect(splitOf(9999, 634)).toBe(475);
    expect(splitOf(200.9, 634)).toBe(200);
  });

  it("reads a split it cannot lay out as the middle of the body", () => {
    // The bug guarded: Math.max(NaN, min) stayed NaN, so a restored split
    // painted a pane with no width.
    expect(splitOf(undefined, 634)).toBe(317);
    expect(splitOf(Number.NaN, 634)).toBe(317);
    expect(splitOf(Number.POSITIVE_INFINITY, 634)).toBe(317);
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
