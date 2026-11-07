import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TokenList } from "./token-list";

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
    expect(render(["background", "card", "popover", "muted"])).toContain(
      "<code>muted</code>",
    );
  });

  it("renders nothing for an empty table", () => {
    expect(render([])).toBe("");
  });
});
