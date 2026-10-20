import { describe, expect, it } from "vitest";
import {
  formsWithinOneEdit,
  splitWords,
  typoForms,
  typoKey,
  typoMatch,
  typoWords,
  withinOneEdit,
  type TypoName,
} from "./typo";

/**
 * Guards plans 607 and 608: a misspelling has a tier of its own. The bug being
 * prevented: the lexical index tolerates a misspelling by returning *some*
 * page, and nothing could say the query was one edit from a name, so `botton`
 * returned Toggle, `theem` returned the Values API and `acordian` returned
 * nothing.
 *
 * Plan 608 adds the phrase arm: `theem editr`, `buton group` and `seach input`
 * are one edit per word from a real two-word name, and `themnig` is one
 * transposition from `theming` although the shared stem hides the suffix. These
 * tests fail if a transposition counts as two edits, if a doubled letter is not
 * collapsed (the typo itself), if the raw spelling is no longer compared beside
 * the stem, if a phrase ignores word order or word count, if an all-exact phrase
 * is promoted, if the tier order stops preferring a whole title over a word of
 * a longer one or a name over an alias, or if an ambiguous pair is guessed.
 */
const name = (value: string, url: string): TypoName => ({
  name: value,
  url,
  kind: "name",
});

const alias = (value: string, url: string): TypoName => ({
  name: value,
  url,
  kind: "alias",
});

describe("withinOneEdit", () => {
  it("accepts an equal word", () => {
    expect(withinOneEdit("button", "button")).toBe(true);
  });

  it("accepts one substitution, insertion and deletion", () => {
    expect(withinOneEdit("buton", "boton")).toBe(true);
    expect(withinOneEdit("seach", "search")).toBe(true);
    expect(withinOneEdit("search", "seach")).toBe(true);
  });

  it("counts an adjacent transposition as one edit", () => {
    expect(withinOneEdit("dropdwon", "dropdown")).toBe(true);
  });

  it("rejects a second edit and a longer gap", () => {
    expect(withinOneEdit("butxxn", "button")).toBe(false);
    expect(withinOneEdit("but", "button")).toBe(false);
    expect(withinOneEdit("dropdwom", "dropdown")).toBe(false);
  });
});

describe("typoKey", () => {
  it("collapses a doubled letter before stemming", () => {
    expect(typoKey("botton")).toBe("boton");
    expect(typoKey("Buttons")).toBe("buton");
    expect(typoKey("accordions")).toBe("acordion");
  });

  it("shares the stem the real matcher uses", () => {
    expect(typoKey("theem")).toBe("them");
    expect(typoKey("Theming")).toBe("them");
    expect(typoKey("components")).toBe("component");
  });

  it("splits a compound name into words of its own", () => {
    expect(splitWords("DropdownMenuGroup")).toEqual([
      "dropdown",
      "menu",
      "group",
    ]);
    expect(typoWords("SearchInput")).toEqual(["search", "input"]);
  });
});

describe("typoForms", () => {
  it("keeps the raw spelling beside the stem", () => {
    expect(typoForms("Theming")).toEqual(["them", "theming"]);
    expect(typoForms("themnig")).toEqual(["themnig"]);
    expect(typoForms("button")).toEqual(["buton"]);
  });

  it("compares the raw spelling, so a suffix transposition is one edit", () => {
    expect(formsWithinOneEdit("themnig", "theming")).toBe(true);
    expect(formsWithinOneEdit("theem", "theming")).toBe(true);
    expect(formsWithinOneEdit("theme", "theming")).toBe(true);
    expect(formsWithinOneEdit("butxy", "button")).toBe(false);
  });

  it("does not compare a form shorter than four characters", () => {
    expect(formsWithinOneEdit("the", "theming")).toBe(false);
  });
});

describe("typoMatch", () => {
  it("prefers a whole title over a word of a longer one", () => {
    const names = [
      name("Buttons", "/docs/components/button"),
      name("Button groups", "/docs/components/button-group"),
    ];
    expect(typoMatch("botton", names)?.url).toBe("/docs/components/button");
    expect(typoMatch("buton", names)?.url).toBe("/docs/components/button");
  });

  it("prefers a name over an alias", () => {
    const names = [
      name("Dropdown menus", "/docs/components/dropdown-menu"),
      alias("dropdown list", "/docs/components/select"),
    ];
    expect(typoMatch("dropdwon", names)?.url).toBe(
      "/docs/components/dropdown-menu",
    );
  });

  it("matches a page title by its stem", () => {
    const names = [
      name("Theming", "/docs/theming"),
      name("Theme editor", "/docs/theme-editor"),
      alias("theme switch", "/docs/dark-mode"),
    ];
    expect(typoMatch("theem", names)?.url).toBe("/docs/theming");
  });

  it("matches a single-word title whose plural is the same word", () => {
    const names = [
      name("Components", "/docs/components"),
      name("Component API", "/docs/component-api"),
    ];
    expect(typoMatch("componet", names)?.url).toBe("/docs/components");
  });

  it("matches an alias only when no name does", () => {
    const names = [alias("snackbar", "/docs/components/toast")];
    expect(typoMatch("snackbr", names)?.url).toBe("/docs/components/toast");
  });

  it("refuses to guess between two equally plausible names", () => {
    const names = [name("Batter", "/a"), name("Better", "/b")];
    expect(typoMatch("botter", names)).toBeUndefined();
  });

  it("never promotes an exact spelling, a short word or two edits", () => {
    const names = [name("Buttons", "/docs/components/button")];
    expect(typoMatch("buttons", names)).toBeUndefined();
    expect(typoMatch("botton page", names)).toBeUndefined();
    expect(typoMatch("bot", names)).toBeUndefined();
    expect(typoMatch("butxy", names)).toBeUndefined();
  });

  it("does not name a word of a longer title from four letters", () => {
    const names = [name("Dark mode", "/docs/dark-mode")];
    expect(typoMatch("code", names)).toBeUndefined();
    expect(
      typoMatch("hosting", [
        alias("unsupported host", "/docs/troubleshooting"),
      ]),
    ).toBeUndefined();
  });

  it("matches a transposition the shared stem hid", () => {
    const names = [name("Theming", "/docs/theming")];
    expect(typoMatch("themnig", names)?.url).toBe("/docs/theming");
  });
});

describe("typoMatch phrases", () => {
  it("aligns every word with the whole name", () => {
    const names = [
      name("Theme editor", "/docs/theme-editor"),
      name("Button groups", "/docs/components/button-group"),
      name("Search inputs", "/docs/components/search-input"),
      name("Dropdown menus", "/docs/components/dropdown-menu"),
    ];
    expect(typoMatch("theem editr", names)?.url).toBe("/docs/theme-editor");
    expect(typoMatch("buton group", names)?.url).toBe(
      "/docs/components/button-group",
    );
    expect(typoMatch("seach input", names)?.url).toBe(
      "/docs/components/search-input",
    );
    expect(typoMatch("dropdwon menu", names)?.url).toBe(
      "/docs/components/dropdown-menu",
    );
  });

  it("keeps a name ahead of an alias in the phrase arm", () => {
    const names = [
      name("Button groups", "/docs/components/button-group"),
      alias("button group", "/docs/components/other"),
    ];
    expect(typoMatch("buton group", names)?.url).toBe(
      "/docs/components/button-group",
    );
  });

  it("refuses a phrase with an extra or missing word", () => {
    const names = [name("Accordions", "/docs/components/accordion")];
    expect(typoMatch("acordian panel", names)).toBeUndefined();
    expect(typoMatch("acordian", names)?.url).toBe(
      "/docs/components/accordion",
    );
  });

  it("refuses a phrase whose words are all exactly the name", () => {
    const names = [name("Button groups", "/docs/components/button-group")];
    expect(typoMatch("button groups", names)).toBeUndefined();
  });

  it("refuses to guess between two equally plausible phrases", () => {
    const names = [name("Batter up", "/a"), name("Better up", "/b")];
    expect(typoMatch("botter up", names)).toBeUndefined();
  });
});
