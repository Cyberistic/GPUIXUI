import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  closeFences,
  draftOf,
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
    expect(Option.getOrNull(openFence("````\n```\ncode"))).toBe("````");
    expect(Option.getOrNull(openFence("~~~~\n~~~\ncode"))).toBe("~~~~");
    expect(closeFences("````\n```\ncode")).toBe("````\n```\ncode\n````");
    expect(Option.isNone(openFence("```\ncode\n````"))).toBe(true);
  });

  it("does not let an info string close a fence", () => {
    expect(Option.getOrNull(openFence("```\n```js\ncode"))).toBe("```");
    expect(Option.getOrNull(openFence("```\n``` js\ncode"))).toBe("```");

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

  it("does not add a blank line when the draft already ends on a newline", () => {
    expect(closeFences("```\ncode\n")).toBe("```\ncode\n```");

    expect(closeFences("~~~\ncode\n\n")).toBe("~~~\ncode\n\n~~~");
    expect(closeFences(closeFences("```\ncode\n"))).toBe("```\ncode\n```");
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
    expect(splitOf(undefined, 634)).toBe(317);
    expect(splitOf(Number.NaN, 634)).toBe(317);
    expect(splitOf(Number.POSITIVE_INFINITY, 634)).toBe(317);
  });
});

describe("draftOf", () => {
  it("reads a stored draft that is not text as an empty document", () => {
    expect(draftOf(null)).toBe("");
    expect(draftOf(undefined)).toBe("");
    expect(draftOf(42)).toBe("");
    expect(draftOf({ body: "text" })).toBe("");
  });

  it("keeps the document's own whitespace", () => {
    expect(draftOf("  indented\n\n")).toBe("  indented\n\n");
    expect(draftOf("")).toBe("");
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
