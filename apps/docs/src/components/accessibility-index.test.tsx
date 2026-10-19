import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccessibilityIndex } from "./accessibility-index";
import { components } from "@/component-meta/registry";

/**
 * The bug guarded: `/docs/accessibility` promises every delivered component's
 * recorded limitations, each linked to the section that explains it. The
 * failure is a silent one — the table still renders, but a record is dropped,
 * linked to the wrong anchor, or its strings are retyped and drift from the
 * page's status block. The test reads the same registry the pages render and
 * the rendered markup, in both directions.
 */
const markup = renderToStaticMarkup(<AccessibilityIndex />);

const delivered = components.filter(
  (component) => component.status !== "planned",
);
const limited = delivered.filter(
  (component) => component.limitations.length > 0,
);

const renderedSlugs = (): ReadonlyArray<string> =>
  [...markup.matchAll(/data-a11y-record="([^"]+)"/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

/** React escapes text entities on the server, so compare decoded text. */
const decoded = (): string =>
  markup
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("the accessibility index", () => {
  it("lists every delivered component that records a limitation, once", () => {
    const slugs = renderedSlugs();
    expect(slugs).toHaveLength(limited.length);
    expect(new Set(slugs).size).toBe(limited.length);
    expect(slugs).toEqual(limited.map((component) => component.slug));
  });

  it("links each row to its page's accessibility section", () => {
    const missing = limited.filter(
      (component) =>
        !markup.includes(
          `href="/docs/components/${component.slug}#accessibility-and-limitations"`,
        ),
    );
    expect(missing.map((component) => component.slug)).toEqual([]);
  });

  it("prints the exact limitation strings the page's status block shows", () => {
    const text = decoded();
    const missing = limited.flatMap((component) =>
      component.limitations
        .filter((limitation) => !text.includes(limitation))
        .map((limitation) => `${component.slug}: ${limitation}`),
    );
    expect(missing).toEqual([]);
  });

  it("counts the delivered records from the registry", () => {
    expect(markup).toContain(
      `${delivered.length} delivered components record at least one limitation`,
    );
  });

  it("does not invent a row for a planned record", () => {
    expect(
      components
        .filter((component) => component.status === "planned")
        .filter((component) =>
          markup.includes(`data-a11y-record="${component.slug}"`),
        )
        .map((component) => component.slug),
    ).toEqual([]);
  });
});
