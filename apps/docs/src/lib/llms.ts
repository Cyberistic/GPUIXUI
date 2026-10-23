import { packageCollections } from "./collection-routes";
import { servedPages } from "./curated-twins";
import { absoluteUrl } from "./site";
import { appName } from "./shared";

/**
 * `/llms.txt`, the machine-readable index of the documentation.
 *
 * The site is written for a reader, and its sidebar is the map that reader
 * follows. An agent reading the site has no sidebar, so it needs one flat
 * document that names every page, groups it the way the sidebar groups it, and
 * says what the page is for. The list is derived from the mounted collections
 * for the same reason the sitemap is: a page added anywhere appears without a
 * docs edit.
 *
 * The two paragraphs above the list are the site's honesty rule in the form an
 * agent needs it: this is a browser app documenting a native library, so a
 * preview is not the component, and the inventory — not a page's existence —
 * is the status.
 */

/** One page in the index: what the sidebar would show under its title. */
export interface LlmsPage {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
}

/** The sidebar's sections, in the order the sidebar shows them. */
export const llmsSectionOrder: ReadonlyArray<string> = [
  "Docs",
  "Components",
  "Primitives",
  "Icons",
  "Data display",
  "Workspace",
  "Blocks",
];

/** The site's own folders that are not a package's route, and their section. */
const siteSections: ReadonlyArray<{ prefix: string; name: string }> = [
  { prefix: "/docs/blocks", name: "Blocks" },
  { prefix: "/docs/workspace", name: "Workspace" },
];

const sectionRules = [
  ...packageCollections.map((collection) => ({
    prefix: collection.route,
    name: collection.section,
  })),
  ...siteSections,
];

/** True when `url` is `prefix` or a page under it. */
const under = (url: string, prefix: string): boolean =>
  url === prefix || url.startsWith(`${prefix}/`);

/**
 * The section a page is listed under.
 *
 * The longest matching prefix wins, so a page under a package's route keeps
 * that package's section even when a shorter rule would also match. A page no
 * rule names — a new top-level folder — is a `Docs` page; `llms.test.ts` reads
 * the folders on disk and fails until such a folder has a section of its own.
 */
export const sectionFor = (url: string): string => {
  const match = sectionRules
    .filter((rule) => under(url, rule.prefix))
    .toSorted((left, right) => right.prefix.length - left.prefix.length)[0];
  return match?.name ?? "Docs";
};

/** One line may not carry a bare `]` in its label or a line break in its note. */
const label = (title: string): string =>
  title.replaceAll("[", "\\[").replaceAll("]", "\\]");

const note = (description: string | undefined): string => {
  const text = description?.replaceAll(/\s+/g, " ").trim();
  return text === undefined || text === "" ? "" : `: ${text}`;
};

/**
 * The document for these pages.
 *
 * `site` is the site's own collection and `packaged` the pages the packages
 * write. A curated page shadows the package page at the same URL, so the site's
 * copy is the one that survives — the same precedence the sitemap and the
 * search index use. A package page a curated page in another section replaces
 * is not served at all (`curated-twins.ts`), so it is not printed either.
 */
export const llmsTxt = (
  site: ReadonlyArray<LlmsPage>,
  packaged: ReadonlyArray<LlmsPage>,
): string => {
  const seen = new Set<string>();
  const pages = [...site, ...servedPages(packaged)].filter((page) => {
    if (seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  });

  const bySection = pages.reduce((groups, page) => {
    const name = sectionFor(page.url);
    return groups.set(name, [...(groups.get(name) ?? []), page]);
  }, new Map<string, LlmsPage[]>());

  // A section no order names still prints, after the ones that do.
  const order = (name: string): number => {
    const position = llmsSectionOrder.indexOf(name);
    return position === -1 ? llmsSectionOrder.length : position;
  };

  const sections = [...bySection.entries()]
    .toSorted(
      ([left], [right]) =>
        order(left) - order(right) || left.localeCompare(right),
    )
    .flatMap(([name, entries]) => [
      `## ${name}`,
      "",
      ...entries
        .toSorted((left, right) => left.url.localeCompare(right.url))
        .map(
          (page) =>
            `- [${label(page.title)}](${absoluteUrl(page.url)})${note(page.description)}`,
        ),
      "",
    ]);

  return [
    `# ${appName}`,
    "",
    "> The documentation for GPUIxUI, a native UI component library for GPUix and React. Components render through GPUix host elements, not the DOM.",
    "",
    "This site is a browser application documenting a native library, so a browser",
    "preview is a labelled approximation of the component unless the page says it",
    "mounts the real renderer (`/live`, the wasm build). A page's API tables are held",
    "to the props its component declares; `COMPONENTS.md` in the repository is the",
    "status record for every component, and a page existing is not a claim that its",
    "component is finished.",
    "",
    ...sections,
  ].join("\n");
};

/** The content type a plain-text index is served with. */
export const llmsContentType = "text/plain; charset=utf-8";
