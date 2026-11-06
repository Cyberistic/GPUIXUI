import { packageCollections } from "./collection-routes";
import type { ComponentEntry } from "./component-index";

export interface ExampleSource {
  readonly file: string;
  readonly source: string;
}

export interface ExampleEntry {
  readonly id: string;

  readonly title: string;

  readonly summary: string;
  readonly packageName: string;

  readonly section: string;
  readonly file: string;

  readonly url: string;

  readonly anchor: string;

  readonly grouped: boolean;
  readonly source: string;
}

export const exampleAnchor = (entry: {
  readonly packageName: string;
  readonly id: string;
}): string => `${entry.packageName}-${entry.id}`;

const filePattern = /^packages\/([^/]+)\/examples\/([^/]+)\.example\.tsx$/;

export interface ExampleHome {
  readonly route: string;

  readonly section: string;
}

const laneHomes: ReadonlyArray<{
  readonly packageName: string;
  readonly home: ExampleHome;
}> = [
  {
    packageName: "data",
    home: { route: "/data-display", section: "Data display" },
  },
];

export const collectionOf = (packageName: string): ExampleHome | undefined =>
  packageCollections.find(
    (collection) => collection.dir === `packages/${packageName}/docs`,
  ) ?? laneHomes.find((lane) => lane.packageName === packageName)?.home;

const titleCase = (id: string): string => {
  const words = id.split("-");
  const [first, ...rest] = words;
  return [
    first === undefined
      ? id
      : `${first.slice(0, 1).toUpperCase()}${first.slice(1)}`,
    ...rest,
  ].join(" ");
};

const sentenceCase = (text: string): string =>
  text.length === 0
    ? text
    : `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;

const commentLines = (comment: string): ReadonlyArray<string> =>
  comment
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line !== "");

const jsxDirectives = /^(?:\s*\/\*\*\s*@jsx\w+[^*]*\*\/)+/;

const headerLines = (source: string): ReadonlyArray<string> => {
  const comment = /^\s*\/\*\*([\s\S]*?)\*\//.exec(
    source.replace(jsxDirectives, ""),
  )?.[1];
  return comment === undefined ? [] : commentLines(comment);
};

export const summaryOf = (source: string): string | undefined => {
  const lines = headerLines(source);
  const first = lines[0];
  if (first === undefined) return undefined;

  const afterColon = /^[^:]{1,60} example:\s*(.+)$/i.exec(first)?.[1] ?? first;
  const sentence = lines
    .slice(1)
    .reduce(
      (text, line) => (text.endsWith(".") ? text : `${text} ${line}`),
      afterColon,
    );

  const trimmed = sentence.trim();
  const end = trimmed.indexOf(". ");
  return sentenceCase(end === -1 ? trimmed : trimmed.slice(0, end + 1));
};

export const pageFor = (
  id: string,
  route: string,
  pages: ReadonlyArray<ComponentEntry>,
): ComponentEntry | undefined => {
  const exact = pages.find((page) => page.url === `${route}/${id}`);
  if (exact !== undefined) return exact;

  const prefixed = pages.filter((page) =>
    page.url.startsWith(`${route}/${id}-`),
  );
  return prefixed.length === 1 ? prefixed[0] : undefined;
};

export const buildExamples = (
  sources: ReadonlyArray<ExampleSource>,
  pages: ReadonlyArray<ComponentEntry>,
): ReadonlyArray<ExampleEntry> => {
  const entries = sources.flatMap(({ file, source }): ExampleEntry[] => {
    const parsed = filePattern.exec(file);
    if (parsed === null) return [];

    const [, packageName, id] = parsed;
    if (packageName === undefined || id === undefined) return [];
    const collection = collectionOf(packageName);
    if (collection === undefined) return [];

    const page = pageFor(id, collection.route, pages);
    const title = page?.title ?? titleCase(id);
    return [
      {
        id,
        title,
        summary:
          summaryOf(source) ??
          `A worked example in \`@gpuixui/${packageName}\`.`,
        packageName,
        section: collection.section,
        file,
        url: page?.url ?? collection.route,
        anchor: exampleAnchor({ packageName, id }),
        grouped: page === undefined,
        source,
      },
    ];
  });

  const sectionOrder = [
    ...packageCollections,
    ...laneHomes.map((lane) => lane.home),
  ].reduce<ReadonlyArray<string>>(
    (order, collection) =>
      order.includes(collection.section)
        ? order
        : [...order, collection.section],
    [],
  );

  return sectionOrder.flatMap((section) =>
    entries
      .filter((entry) => entry.section === section)
      .toSorted((left, right) => left.title.localeCompare(right.title)),
  );
};

export const examplesForPage = (
  entries: ReadonlyArray<ExampleEntry>,
  url: string,
): ReadonlyArray<ExampleEntry> =>
  entries.filter((entry) => !entry.grouped && entry.url === url);

export const filterExamples = (
  entries: ReadonlyArray<ExampleEntry>,
  query: string,
): ReadonlyArray<ExampleEntry> => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return entries;

  return entries.filter((entry) => {
    const haystack =
      `${entry.title} ${entry.summary} ${entry.packageName} ${entry.id} ${entry.file} ${entry.section}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
};
