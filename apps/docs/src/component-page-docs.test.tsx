import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sectionsFor } from "./component-meta/contract";
import {
  PageTemplateSections,
  patternTemplates,
} from "./components/page-template";

/**
 * Guards the published component-page template (plan 487). The page is the only
 * contribution guide a reader has; the failures worth catching are silent: the
 * generated section list is replaced by a hand-written copy (which then drifts
 * from `sectionsFor`), a record field is renamed and the prose keeps the old
 * name, or a guard that reads every component page is left out of the table.
 *
 * `node:fs`/`node:path` are deliberate here: this is a vitest boundary reading
 * real content, like `content.test.ts` and `content-references.test.ts`, and
 * there is no Effect runtime in `apps/docs` (plan 411 §5).
 */

const appDirectory = fileURLToPath(new URL("../", import.meta.url));
const sourceDirectory = join(appDirectory, "src");
const page = readFileSync(
  join(appDirectory, "content/docs/component-pages.mdx"),
  "utf8",
);
const entries = readFileSync(
  join(sourceDirectory, "component-meta/entries.ts"),
  "utf8",
);

/** The body under one `## ` heading, up to the next heading. */
const sectionBody = (document: string, name: string): string => {
  const start = document.indexOf(`## ${name}`);
  if (start < 0) return "";
  const rest = document.slice(start + name.length + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};

/** The fields the delivered-record constructor declares, in source order. */
const deliveredFields = (): ReadonlyArray<string> =>
  [
    ...(
      entries.match(/interface DeliveredOptions[^{]*\{([\s\S]*?)\n\}/)?.[1] ??
      ""
    ).matchAll(/readonly (\w+)\??:/g),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/** The suites that read the component page directory and must be documented. */
const pageGuards = (): ReadonlyArray<string> =>
  readdirSync(sourceDirectory, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.test\.tsx?$/.test(file))
    // This suite matches its own query string, not a component page.
    .filter((file) => file !== "component-page-docs.test.tsx")
    .filter((file) =>
      readFileSync(join(sourceDirectory, file), "utf8").includes(
        "content/docs/components",
      ),
    )
    .map((file) => `src/${file.split(sep).join("/")}`);

describe("component-page template docs", () => {
  it("generates every pattern's section list on the template", () => {
    expect(page).toContain("<PageTemplateSections />");
    const markup = renderToStaticMarkup(<PageTemplateSections />);
    const templates = patternTemplates();

    expect(templates.map((template) => template.pattern)).toEqual([
      "static",
      "stateful",
      "workspace",
    ]);
    templates.forEach((template) => {
      expect(template.sections, template.pattern).toEqual(
        sectionsFor(template.pattern),
      );
      template.sections.forEach((section) => {
        expect(markup, `${template.pattern}: ${section}`).toContain(
          `>${section}<`,
        );
      });
    });
  });

  it("names every field a delivered record requires", () => {
    const fields = deliveredFields();
    const record = sectionBody(page, "The record");
    expect(fields).toContain("limitations");
    expect(fields.filter((field) => !record.includes(field))).toEqual([]);
  });

  it("names the guards that read a component page", () => {
    const guards = pageGuards();
    expect(guards).toContain("src/component-pages.test.ts");
    expect(guards.filter((guard) => !page.includes(guard))).toEqual([]);
  });

  it("names only guard files that exist", () => {
    const named = [...page.matchAll(/`(src\/[^`]*\.test\.tsx?)`/g)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );
    expect(named.length).toBeGreaterThan(0);
    expect(
      named.filter((path) => !existsSync(join(appDirectory, path))),
    ).toEqual([]);
  });
});
