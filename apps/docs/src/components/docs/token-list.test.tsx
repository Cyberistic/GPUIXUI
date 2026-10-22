import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TokenList } from "./token-list";

/**
 * The list is the page's copy of a table the package owns, so it has to render
 * whatever the table says — including a surface that did not exist when the
 * page was written. Both directions are worth holding: a name the page drops is
 * a surface a reader does not know is measured, and a name it invents is a
 * contract the library does not run.
 */

const render = (names: ReadonlyArray<string>): string =>
  renderToStaticMarkup(<TokenList names={names} />);

describe("the token list", () => {
  it("renders every name as its own code span", () => {
    expect(render(["background", "card", "muted"])).toBe(
      "<span><code>background</code></span><span>, " +
        "<code>card</code></span><span>, <code>muted</code></span>",
    );
  });

  it("renders a table that grew, not the three the page used to print", () => {
    // The series surfaces gained a `muted` toolbar and the paragraph is written
    // once; the fourth name has to appear without a page edit.
    expect(render(["background", "card", "popover", "muted"])).toContain(
      "<code>muted</code>",
    );
  });

  it("renders nothing for an empty table", () => {
    expect(render([])).toBe("");
  });
});
