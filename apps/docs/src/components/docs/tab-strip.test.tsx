import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { nextTabIndex, TabStrip } from "./tab-strip";

const render = (value: string): string =>
  renderToStaticMarkup(
    <TabStrip
      label="Sections"
      onChange={() => {}}
      options={[
        { value: "one", label: "One" },
        { value: "two", label: "Two" },
        { value: "three", label: "Three" },
      ]}
      value={value}
    />,
  );

describe("the shared tab strip", () => {
  it("marks exactly the selected tab and makes it the only tab stop", () => {
    const markup = render("two");
    expect(markup.match(/role="tab"/g)).toHaveLength(3);
    expect(markup.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(markup).toMatch(
      /aria-selected="true" class="gx-tab" id="[^"]+-two-tab"/,
    );
    expect(markup.match(/tabindex="0"/g)).toHaveLength(1);
    expect(markup.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(markup).toContain('aria-label="Sections"');
  });

  it("walks the keys with wrapping, Home and End", () => {
    expect(nextTabIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextTabIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextTabIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextTabIndex("Home", 2, 3)).toBe(0);
    expect(nextTabIndex("End", 0, 3)).toBe(2);
    expect(nextTabIndex("Enter", 1, 3)).toBeUndefined();
    expect(nextTabIndex("ArrowRight", 0, 0)).toBeUndefined();
  });

  it("joins a block's own classes after the shared ones", () => {
    const markup = renderToStaticMarkup(
      <TabStrip
        className="gx-mail-tabs"
        label="Categories"
        onChange={() => {}}
        options={[{ value: "primary", label: "Primary" }]}
        tabClassName="gx-mail-tab"
        value="primary"
      />,
    );

    expect(markup).toContain('class="gx-tabs-list gx-mail-tabs"');
    expect(markup).toContain('class="gx-tab gx-mail-tab"');
  });

  it("paints no marker until a browser can measure the selected tab", () => {
    expect(render("one")).not.toContain("gx-tabs-indicator");
  });
});
