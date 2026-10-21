import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { patternChoices, patterns } from "../../lib/patterns";
import { Pattern, PatternChoices } from "./patterns";

/**
 * The rendered patterns.
 *
 * The data guards check what the patterns point at; these check that the page
 * actually prints it. A section that renders a situation but drops the parts
 * table would read as complete while hiding who owns the state, and the chooser
 * is the page's only index, so every question has to reach the markup.
 */

const render = (id: string): string =>
  renderToStaticMarkup(<Pattern id={id} />);

/** Rendered text carries HTML entities; the assertions compare prose. */
const text = (markup: string): string =>
  markup
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("a pattern", () => {
  it.each(patterns.map((pattern) => pattern.id))(
    "prints every part, step and limit of %s",
    (id) => {
      const markup = render(id);
      const prose = text(markup);
      const pattern = patterns.find((candidate) => candidate.id === id);
      if (pattern === undefined) throw new Error(`no pattern ${id}`);

      expect(
        pattern.parts.filter((part) => !markup.includes(part.name)),
      ).toEqual([]);
      expect(
        pattern.parts.filter((part) => !markup.includes(`href="${part.url}"`)),
      ).toEqual([]);
      expect(pattern.steps.filter((step) => !prose.includes(step))).toEqual([]);
      expect(prose).toContain(pattern.state);
      expect(prose).toContain(pattern.prevents);
      expect(markup).toContain(pattern.example);
    },
  );

  it("points the example at the repository and the registry", () => {
    const markup = render("async-feedback");

    expect(markup).toContain("/blob/master/packages/components/examples/");
    expect(markup).toContain('href="/docs/examples"');
  });

  it("fails loudly on an id the data does not have", () => {
    expect(() => render("no-such-pattern")).toThrow(
      'Pattern: no pattern named "no-such-pattern"',
    );
  });
});

describe("the component chooser", () => {
  it("prints every question with the component it recommends", () => {
    const markup = renderToStaticMarkup(<PatternChoices />);

    expect(
      patternChoices.filter((choice) => !markup.includes(choice.need)),
    ).toEqual([]);
    expect(
      patternChoices.filter(
        (choice) => !markup.includes(`href="${choice.use.url}"`),
      ),
    ).toEqual([]);
    expect(
      patternChoices.filter((choice) => !markup.includes(choice.not)),
    ).toEqual([]);
  });
});
