import { describe, expect, it } from "vitest";
import {
  splitWords,
  typoKey,
  typoMatch,
  typoWords,
  withinOneEdit,
  type TypoName,
} from "./typo";

/**
 * Guards plan 607's one-edit typo tier. The bug being prevented: the lexical
 * index tolerates a misspelling by returning *some* page, and nothing could say
 * the query was one edit from a name, so `botton` returned Toggle, `theem`
 * returned the Values API and `acordian` returned nothing.
 *
 * These tests fail if a transposition counts as two edits, if a doubled letter
 * is not collapsed (the typo itself), if the tier order stops preferring a
 * whole title over a word of a longer one or a name over an alias, if an
 * ambiguous pair of names is guessed, or if a phrase, a short word or a
 * two-edit word is promoted.
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

  it("never promotes an exact spelling, a phrase, a short word or two edits", () => {
    const names = [name("Buttons", "/docs/components/button")];
    expect(typoMatch("buttons", names)).toBeUndefined();
    expect(typoMatch("botton page", names)).toBeUndefined();
    expect(typoMatch("bot", names)).toBeUndefined();
    expect(typoMatch("butxy", names)).toBeUndefined();
  });
});
