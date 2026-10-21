import {
  packageCollections,
  type PackageCollection,
} from "./collection-routes";
import type { ComponentEntry } from "./component-index";

/**
 * The example registry.
 *
 * Every package ships a worked example beside its components — a screen with
 * caller-owned state, not a prop gallery. The site had no way to see them: a
 * reader learned an example's file name from the page it happened to be
 * documented on. This module turns the files themselves into rows, so a new
 * example appears on `/docs/examples` with no docs change and a deleted one
 * cannot leave a dead row.
 *
 * Pure: `examples-data.ts` supplies the files and the page index.
 */

/** One example file, as the build read it. */
export interface ExampleSource {
  /** Repository-relative: `packages/components/examples/card.example.tsx`. */
  readonly file: string;
  readonly source: string;
}

/** One row the page renders. */
export interface ExampleEntry {
  /** The registry id: `card`, `number-field`. */
  readonly id: string;
  /** The owning page's title when it has one, else the id in title case. */
  readonly title: string;
  /** The example's own first sentence, from its header comment. */
  readonly summary: string;
  readonly packageName: string;
  /** The sidebar section the package's pages fill: `Primitives`, `Components`. */
  readonly section: string;
  readonly file: string;
  /** The page this example illustrates, or the lane index when it spans several. */
  readonly url: string;
  /** True when no single page owns the example. */
  readonly grouped: boolean;
  readonly source: string;
}

/** The files the registry reads: one package's `examples` directory. */
const filePattern = /^packages\/([^/]+)\/examples\/([^/]+)\.example\.tsx$/;

const collectionOf = (packageName: string): PackageCollection | undefined =>
  packageCollections.find(
    (collection) => collection.dir === `packages/${packageName}/docs`,
  );

/** `number-field` → `Number field`: a fallback title, never a replacement. */
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

/** The lines of a file's leading doc comment, without the ` * ` gutters. */
const headerLines = (source: string): ReadonlyArray<string> => {
  const comment = /^\/\*\*([\s\S]*?)\*\//.exec(source)?.[1];
  if (comment === undefined) return [];
  return comment
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line !== "");
};

/**
 * The example's first sentence, from its own header.
 *
 * Every example opens with `<Name> example: <what it shows>.`; the summary is
 * the half after the colon, so the page cannot describe an example differently
 * from the file. A header that wraps is joined until the sentence ends.
 */
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

/**
 * The one page an example illustrates.
 *
 * An exact name wins; otherwise a single page whose name starts with the id
 * (`otp` → `otp-field`). Two candidates is ambiguous, and an ambiguous match
 * would send a reader to a page the example may not prove, so it stays grouped.
 */
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

/**
 * The registry, ordered by sidebar section and then by title.
 *
 * A file outside `packages/*\/examples/*.example.tsx` is not an example and is
 * skipped rather than guessed at.
 */
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
        grouped: page === undefined,
        source,
      },
    ];
  });

  const sectionOrder = packageCollections.reduce<ReadonlyArray<string>>(
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

/**
 * The rows a reader's query keeps.
 *
 * Every whitespace-separated term must appear in the row, so `card page` finds
 * the card example and `primitives` narrows to that lane — the same rule the
 * component index uses.
 */
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
