import { packageCollections } from "./collection-routes";
import { servedPages } from "./curated-twins";
import { absoluteUrl } from "./site";
import { appName } from "./shared";

export interface LlmsPage {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
}

export const servedPageList = <Page extends { readonly url: string }>(
  site: ReadonlyArray<Page>,
  packaged: ReadonlyArray<Page>,
): Array<Page> => {
  const seen = new Set<string>();

  return [...site, ...servedPages(packaged)].filter((page) => {
    if (seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  });
};

export const orderedSections = <Page extends { readonly url: string }>(
  pages: ReadonlyArray<Page>,
): ReadonlyArray<readonly [string, ReadonlyArray<Page>]> => {
  const bySection = pages.reduce((groups, page) => {
    const name = sectionFor(page.url);
    return groups.set(name, [...(groups.get(name) ?? []), page]);
  }, new Map<string, Page[]>());

  const order = (name: string): number => {
    const position = llmsSectionOrder.indexOf(name);
    return position === -1 ? llmsSectionOrder.length : position;
  };

  return [...bySection.entries()]
    .toSorted(
      ([left], [right]) =>
        order(left) - order(right) || left.localeCompare(right),
    )
    .map(
      ([name, entries]) =>
        [
          name,
          entries.toSorted((left, right) => left.url.localeCompare(right.url)),
        ] as const,
    );
};

export const llmsSectionOrder: ReadonlyArray<string> = [
  "Guide",
  "Docs",
  "Components",
  "Primitives",
  "Graphics",
  "Data display",
  "Workspace",
  "Effects",
  "Platform",
  "Blocks",
];

const siteSections: ReadonlyArray<{ prefix: string; name: string }> = [
  { prefix: "/getting-started", name: "Guide" },
  { prefix: "/blocks", name: "Blocks" },
  { prefix: "/workspace", name: "Workspace" },
  { prefix: "/platform", name: "Platform" },

  { prefix: "/graphics", name: "Graphics" },
];

const sectionRules = [
  ...packageCollections.map((collection) => ({
    prefix: collection.route,
    name: collection.section,
  })),
  ...siteSections,
];

const under = (url: string, prefix: string): boolean =>
  url === prefix || url.startsWith(`${prefix}/`);

export const sectionFor = (url: string): string => {
  const match = sectionRules
    .filter((rule) => under(url, rule.prefix))
    .toSorted((left, right) => right.prefix.length - left.prefix.length)[0];
  return match?.name ?? "Docs";
};

const label = (title: string): string =>
  title.replaceAll("[", "\\[").replaceAll("]", "\\]");

const note = (description: string | undefined): string => {
  const text = description?.replaceAll(/\s+/g, " ").trim();
  return text === undefined || text === "" ? "" : `: ${text}`;
};

export const llmsFullPath = "/llms-full.txt";

export const llmsTxt = (
  site: ReadonlyArray<LlmsPage>,
  packaged: ReadonlyArray<LlmsPage>,
): string => {
  const sections = orderedSections(servedPageList(site, packaged)).flatMap(
    ([name, entries]) => [
      `## ${name}`,
      "",
      ...entries.map(
        (page) =>
          `- [${label(page.title)}](${absoluteUrl(page.url)})${note(page.description)}`,
      ),
      "",
    ],
  );

  return [
    `# ${appName}`,
    "",
    "> The documentation for GPUIxUI, a native UI component library for GPUix and React. Components render through GPUix host elements, not the DOM.",
    "",
    "This site is a browser application documenting a native library, so a browser",
    "preview is a labelled approximation of the component unless the page says it",
    "mounts the real renderer (`/live`, the wasm build). A page's API tables are held",
    "to the props its component declares; `.agents/slop/COMPONENTS.md` in the repository is the",
    "status record for every component, and a page existing is not a claim that its",
    "component is finished.",
    "",
    `Every page above is also served whole, as Markdown, at ${absoluteUrl(llmsFullPath)}.`,
    "",
    ...sections,
  ].join("\n");
};

export const llmsContentType = "text/plain; charset=utf-8";
