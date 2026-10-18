import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LIVE_SCENES } from "../preview/scenes";
import { sectionsFor } from "./component-meta/contract";
import {
  PageTemplateSections,
  patternTemplates,
} from "./components/page-template";

/**
 * Guards the published component-page template (plan 487) and its live-scene
 * authoring guide (plan 517). The page is the only contribution guide a reader
 * has; the failures worth catching are silent: the generated section list is
 * replaced by a hand-written copy (which then drifts from `sectionsFor`), a
 * record field is renamed and the prose keeps the old name, or a guard that
 * reads every component page is left out of the table.
 *
 * The live-scene half derives its facts from the code: the gesture kinds come
 * from the `SceneStep` union, the paths must resolve, and every scene total the
 * page states must equal `LIVE_SCENES.length`. A new gesture, a renamed file or
 * a new scene therefore fails here instead of making the guide quietly wrong.
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

const sceneSource = readFileSync(
  join(appDirectory, "preview/scenes.ts"),
  "utf8",
);
const sceneSection = sectionBody(page, "Live scenes");

/** The gesture kinds the `SceneStep` union really declares (plan 517). */
const gestureKinds = (): ReadonlyArray<string> => {
  const union =
    sceneSource.match(
      /export type SceneStep =([\s\S]*?)\n\nexport const SCENE_GESTURE/,
    )?.[1] ?? "";
  return [
    ...new Set(
      [...union.matchAll(/kind: "([a-z-]+)"/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    ),
  ].toSorted();
};

/** The first column of the gesture table in the published template. */
const gestureRows = (): ReadonlyArray<string> => {
  const heading = "### The gesture vocabulary";
  const start = sceneSection.indexOf(heading);
  if (start < 0) return [];
  const rest = sceneSection.slice(start + heading.length);
  const end = rest.search(/^#{2,3} /m);
  const table = end < 0 ? rest : rest.slice(0, end);
  return table
    .split("\n")
    .flatMap((line) => {
      const row = line.match(/^\| `([a-z-]+)`/);
      return row?.[1] === undefined ? [] : [row[1]];
    })
    .toSorted();
};

/** The real files a live scene touches and the guards that keep it honest. */
const sceneFiles = [
  "src/component-meta/entries.ts",
  "preview/scenes.ts",
  "preview/scene-views.tsx",
  "preview/main.tsx",
  "preview/renderer-ready.ts",
  "src/components/preview/scene-contract.test.ts",
  "src/components/preview/preview-gaps.test.ts",
  "src/preview-pages.test.ts",
  "src/component-meta/registry.test.ts",
  "src/component-pages.test.ts",
] as const;

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

describe("live-scene authoring docs", () => {
  it("documents every gesture the scene grammar can take", () => {
    expect(sceneSection).not.toBe("");
    const kinds = gestureKinds();
    expect(kinds.length).toBeGreaterThan(0);
    expect(gestureRows()).toEqual(kinds);
  });

  it("names every file a scene touches, and only files that exist", () => {
    expect(
      sceneFiles.filter((path) => !sceneSection.includes(`\`${path}\``)),
    ).toEqual([]);
    expect(
      sceneFiles.filter((path) => !existsSync(join(appDirectory, path))),
    ).toEqual([]);
  });

  it("states a scene total the registry agrees with", () => {
    const claims = [
      ...sceneSection.matchAll(/(\d+)\s+(?:live\s+)?scenes?/gi),
    ].flatMap((match) => (match[1] === undefined ? [] : [Number(match[1])]));
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.filter((count) => count !== LIVE_SCENES.length)).toEqual([]);
  });
});
