/**
 * Guards plan 597. The bug this catches: plan 596 shipped a per-page Markdown
 * route and two controls whose labels exist only in React, and plan 594 named
 * the site's discovery routes only in prose — so a reader who typed the control
 * they could see (`view as markdown`, `page actions`, `copy page`) or the
 * feature (`page markdown`, `raw markdown`) landed on the component-page guide,
 * the Preview card or a Text area limitation. It also catches the section
 * losing its promoted names, a single plain word being promoted (which would
 * steal `markdown`, `page`, `copy` or `actions` from the page that owns it), and
 * the License page losing the words "open source".
 */
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";
import { source } from "@/lib/source";
import { PAGE_ACTIONS } from "./page-markdown";
import { isDistinctiveName, promotedNameRank } from "./generated-search";
import { search } from "./search";
import { SITE_OUTPUT_ROUTES } from "./site-output";
import { siteOutputSearchEntry } from "./site-output-search";

const SECTION = "/docs/contributing#site-output";

const firstUrl = async (query: string): Promise<string | undefined> => {
  const [first] = await search(query, 3);
  return first?.url;
};

const phrases = [
  "page actions",
  "copy page",
  "page markdown",
  "view as markdown",
  "raw markdown",
  PAGE_ACTIONS.copy.toLowerCase(),
  PAGE_ACTIONS.view.toLowerCase(),
  "site output",
] as const;

const routeNames = Arr.filterMap(SITE_OUTPUT_ROUTES, ({ searchName }) =>
  searchName === undefined ? Result.failVoid : Result.succeed(searchName),
);

describe("site output search document", { timeout: 120_000 }, () => {
  it("promotes every searchable route and the two page-action labels", () => {
    const promoted = [
      ...routeNames,
      PAGE_ACTIONS.copy.toLowerCase(),
      PAGE_ACTIONS.view.toLowerCase(),
    ];
    const missing = promoted.filter(
      (name) =>
        !siteOutputSearchEntry.names.some(
          (promotedName) => promotedName.toLowerCase() === name.toLowerCase(),
        ),
    );
    expect(missing).toEqual([]);
  });

  it("names every fixed route after its path, and only the page route is a template", () => {
    const unnamed = SITE_OUTPUT_ROUTES.filter(({ route, searchName }) =>
      route.includes("<")
        ? searchName !== undefined
        : searchName !== route.slice(1),
    ).map(({ route }) => route);
    expect(unnamed).toEqual([]);
    expect(new Set(routeNames).size).toBe(routeNames.length);
  });

  it("promotes no single plain word", () => {
    const plain = siteOutputSearchEntry.names.filter(
      (name) => !name.includes(" ") && !isDistinctiveName(name),
    );
    expect(plain).toEqual([]);
  });

  it("ranks every page-action phrase as an exact name", () => {
    const ranks = phrases.map(
      (phrase) => promotedNameRank(siteOutputSearchEntry, phrase) ?? -1,
    );
    expect(ranks).toEqual(phrases.map(() => 0));
  });

  it("documents the section on the real Contributing page", () => {
    expect(siteOutputSearchEntry.index.url).toBe(SECTION);
    expect(
      source.getPage(["contributing"])?.url,
      "the section's page must exist in the source",
    ).toBe("/docs/contributing");
  });

  it("sends every page-action phrase to the site-output section first", async () => {
    const wrong = await Promise.all(
      phrases.map(async (phrase) => {
        const url = await firstUrl(phrase);
        return url === SECTION ? null : `${phrase} -> ${url ?? "nothing"}`;
      }),
    );
    expect(wrong.filter((problem) => problem !== null)).toEqual([]);
  });

  it("sends every searchable route name to the section first", async () => {
    const wrong = await Promise.all(
      routeNames.map(async (name) => {
        const url = await firstUrl(name);
        return url === SECTION ? null : `${name} -> ${url ?? "nothing"}`;
      }),
    );
    expect(wrong.filter((problem) => problem !== null)).toEqual([]);
  });

  it("keeps the single words with the pages that own them", async () => {
    const owners = [
      ["markdown", "/docs/roadmap"],
      ["page", "/docs/component-pages"],
      ["copy", "/docs/theme-editor"],
      ["input", "/docs/components/text-input"],
      ["label", "/docs/components/label"],
    ] as const;
    const wrong = await Promise.all(
      owners.map(async ([query, owner]) => {
        const url = await firstUrl(query);
        return url === owner ? null : `${query} -> ${url ?? "nothing"}`;
      }),
    );
    expect(wrong.filter((problem) => problem !== null)).toEqual([]);
    expect(await firstUrl("actions")).not.toBe(SECTION);
  });

  it("keeps the earlier page-subject owners", async () => {
    const owners = [
      ["table", "/docs/data-display"],
      ["panel", "/docs/workspace"],
      ["aria", "/docs/accessibility"],
      ["focus ring", "/docs/tokens-api#functions"],
      ["modal focus", "/docs/capabilities"],
      ["open source", "/docs/license"],
    ] as const;
    const wrong = await Promise.all(
      owners.map(async ([query, owner]) => {
        const url = await firstUrl(query);
        return url === owner ? null : `${query} -> ${url ?? "nothing"}`;
      }),
    );
    expect(wrong.filter((problem) => problem !== null)).toEqual([]);
  });
});
