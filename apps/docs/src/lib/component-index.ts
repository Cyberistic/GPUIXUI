import {
  packageCollections,
  type PackageCollection,
} from "./collection-routes";
import { servedPages } from "./curated-twins";
import { frontmatterField, frontmatterOf } from "./frontmatter";
import * as Arr from "effect/Array";

export interface ComponentPage {
  readonly file: string;
  readonly source: string;
}

export interface PageVerdict {
  readonly status: string;
  readonly support: string;
}

export interface PageIdentity {
  readonly title: string;
  readonly url: string;
}

export type VerdictOf = (page: PageIdentity) => PageVerdict | undefined;

export interface ComponentEntry {
  readonly title: string;
  readonly description: string;
  readonly url: string;

  readonly section: string;

  readonly verdict: PageVerdict | undefined;

  readonly parts: ReadonlyArray<string>;

  readonly props: ReadonlyArray<string>;

  readonly types: ReadonlyArray<string>;

  readonly limitations: string;

  readonly preview: boolean;

  readonly demo: string | undefined;
}

const siteSection = "Components";

const sectionOrder = packageCollections.reduce<ReadonlyArray<string>>(
  (order, collection) =>
    order.includes(collection.section) ? order : [...order, collection.section],
  [],
);

const collectionOf = (file: string): PackageCollection | undefined =>
  Arr.reduce(
    packageCollections,
    undefined as PackageCollection | undefined,
    (best, candidate) => {
      if (!file.startsWith(`${candidate.dir}/`)) return best;
      return best === undefined || candidate.dir.length > best.dir.length
        ? candidate
        : best;
    },
  );

export const pageUrl = (file: string): string | undefined => {
  const site = /^content\/docs\/components\/(.+)\.mdx$/.exec(file);
  if (site !== null) return indexUrl("/components", site[1]);

  const packaged = /^(packages\/[^/]+\/docs(?:\/.+)?)\.mdx$/.exec(file);
  const directory = packaged?.[1];
  if (directory === undefined) return undefined;

  const collection = collectionOf(directory);
  if (collection === undefined) return undefined;
  const name = directory.slice(collection.dir.length + 1);
  return indexUrl(collection.route, name);
};

const indexUrl = (
  route: string,
  name: string | undefined,
): string | undefined =>
  name === undefined || name === "index" ? undefined : `${route}/${name}`;

const sectionOf = (file: string): string | undefined => {
  if (file.startsWith("content/docs/components/")) return siteSection;
  return collectionOf(file)?.section;
};

interface PageSection {
  readonly heading: string;
  readonly text: string;
}

const sectionsOf = (source: string): ReadonlyArray<PageSection> =>
  source
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const newline = part.indexOf("\n");
      return {
        heading: (newline === -1 ? part : part.slice(0, newline)).trim(),
        text: newline === -1 ? "" : part.slice(newline + 1),
      };
    });

export const partsOf = (source: string): ReadonlyArray<string> => {
  const names = sectionsOf(source).flatMap((section) => {
    const isParts =
      section.heading === "Parts" ||
      section.heading === "Anatomy" ||
      section.heading === "Composition";
    const isApi =
      section.heading === "API" || section.heading === "API reference";
    if (!isParts && !isApi) return [];

    const rows = [
      ...section.text.matchAll(/^\|\s*`([A-Z][A-Za-z0-9]*)`\s*(prop\s*)?\|/gm),
    ].map((match) => match[1] ?? "");
    const headings = [
      ...section.text.matchAll(/^###\s+`?([A-Z][A-Za-z0-9]*)`?\s*$/gm),
    ].map((match) => match[1] ?? "");

    const tree = [
      ...(section.text.match(/^```text\n([\s\S]*?)^```/m)?.[1] ?? "").matchAll(
        /[├└│─\s]*([A-Z][A-Za-z0-9]*)/g,
      ),
    ].map((match) => match[1] ?? "");

    return [...rows, ...headings, ...tree];
  });

  return [...new Set(names.filter((name) => !notAPart.has(name)))];
};

const notAPart = new Set([
  "Part",
  "Parts",
  "Prop",
  "Props",
  "Type",
  "Types",
  "Default",
  "Consequence",
  "Responsibility",
]);

export interface PageProps {
  readonly props: ReadonlyArray<string>;
  readonly types: ReadonlyArray<string>;
}

const withoutCodeFences = (text: string): string =>
  text.replace(/^```[\s\S]*?^```/gm, "");

interface Table {
  readonly header: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

const cellsOf = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());

const separator = (cells: ReadonlyArray<string>): boolean =>
  cells.every((cell) => /^-+$/.test(cell.replace(/:/g, "")));

const tablesOf = (text: string): ReadonlyArray<Table> =>
  withoutCodeFences(text)
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .filter((line) => line.startsWith("|"))
        .map(cellsOf),
    )
    .filter((rows) => rows.length >= 2)
    .flatMap(([header = [], ...rows]) => {
      const body = rows.filter((cells) => !separator(cells));
      return body.length === 0 ? [] : [{ header, rows: body }];
    });

const codeNames = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].flatMap((match) =>
    (match[1] ?? "")
      .split("/")
      .map((name) => name.trim())
      .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)),
  );

const listedNames = (cell: string): ReadonlyArray<string> => [
  ...[...cell.matchAll(/`([^`]+)`/g)].flatMap((match) =>
    (match[1] ?? "")
      .split("/")
      .map((piece) => piece.trim().split(/[?:<(]/)[0] ?? "")
      .filter((name) => /^[a-z][A-Za-z0-9]*$/.test(name)),
  ),
  ...[
    ...cell.matchAll(/(?:^|[\s,])`?([a-z][A-Za-z0-9]*)\?`?(?=[\s,]|$)/g),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
];

const namedTypes = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].flatMap(
    (match) => match[1]?.match(/\b[A-Z][A-Za-z0-9]*\b/g) ?? [],
  );

const columnOf = (header: ReadonlyArray<string>, pattern: RegExp): number =>
  header.findIndex((cell) => pattern.test(cell.trim()));

export const propsOf = (source: string): PageProps => {
  const rows = sectionsOf(source)
    .filter((section) => /^(API|Props)\b/.test(section.heading))
    .flatMap((section) => tablesOf(section.text));

  const documented = rows.reduce<PageProps>(
    (found, table) => {
      const propColumn = columnOf(table.header, /(^|\s)prop$/i);
      const propsColumn = columnOf(table.header, /^props$/i);
      const typeColumn = columnOf(table.header, /^type$/i);
      const self = table.rows.reduce<PageProps>(
        (inside, cells) => {
          const names =
            propsColumn >= 0
              ? listedNames(cells[propsColumn] ?? "")
              : propColumn >= 0
                ? codeNames(cells[propColumn] ?? "")
                : [];
          const types =
            propsColumn >= 0
              ? namedTypes(cells[propsColumn] ?? "")
              : typeColumn >= 0
                ? namedTypes(cells[typeColumn] ?? "")
                : [];
          return {
            props: [...inside.props, ...names],
            types: [...inside.types, ...types],
          };
        },
        { props: [], types: [] },
      );
      return {
        props: [...found.props, ...self.props],
        types: [...found.types, ...self.types],
      };
    },
    { props: [], types: [] },
  );

  return {
    props: [...new Set(documented.props.filter((name) => !notAProp.has(name)))],
    types: [...new Set(documented.types)],
  };
};

const notAProp = new Set([
  "Prop",
  "Props",
  "Part",
  "Parts",

  "true",
  "false",
]);

export const limitationsOf = (source: string): string =>
  sectionsOf(source)
    .filter((section) =>
      /^(Limitations|Accessibility|Accessibility and limitations)$/.test(
        section.heading,
      ),
    )
    .map((section) => section.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

export interface VerdictMark {
  readonly label: string;

  readonly detail: string;
}

const verdictWord = (cell: string): string => {
  const first = cell.split(/[\s(]/)[0] ?? "";
  return first === "?" ? "unknown" : first;
};

export const verdictMark = (
  verdict: PageVerdict | undefined,
): VerdictMark | undefined => {
  if (verdict === undefined) return undefined;
  const words = [
    verdict.status.startsWith("done") ? undefined : verdictWord(verdict.status),
    verdict.support.startsWith("yes")
      ? undefined
      : verdictWord(verdict.support),
  ].filter((word): word is string => word !== undefined);

  return words.length === 0
    ? undefined
    : {
        label: words.join(" · "),
        detail: `status: ${verdict.status} · GPUix support: ${verdict.support}`,
      };
};

export const demoOf = (source: string): string | undefined =>
  /<ComponentPreview\s+name="([^"]+)"/.exec(source)?.[1];

const entryOf = (
  page: ComponentPage,
  verdictOf: VerdictOf,
): ComponentEntry | undefined => {
  const url = pageUrl(page.file);
  const section = sectionOf(page.file);
  if (url === undefined || section === undefined) return undefined;

  const head = frontmatterOf(page.source);
  const title = frontmatterField(head, "title");
  if (title === undefined) return undefined;

  return {
    title,
    description: frontmatterField(head, "description") ?? "",
    url,
    section,
    verdict: verdictOf({ title, url }),
    parts: partsOf(page.source),
    ...propsOf(page.source),
    limitations: limitationsOf(page.source),
    preview: page.source.includes("<ComponentPreview"),
    demo: demoOf(page.source),
  };
};

export const buildIndex = (
  pages: ReadonlyArray<ComponentPage>,
  verdictOf: VerdictOf,
): ReadonlyArray<ComponentEntry> => {
  const seen = new Set<string>();
  const entries = pages.flatMap((page) => {
    const entry = entryOf(page, verdictOf);
    if (entry === undefined || seen.has(entry.url)) return [];
    seen.add(entry.url);
    return [entry];
  });

  return sectionOrder.flatMap((section) =>
    entries
      .filter((entry) => entry.section === section)
      .toSorted((left, right) => left.title.localeCompare(right.title)),
  );
};

export const filterEntries = (
  entries: ReadonlyArray<ComponentEntry>,
  query: string,
): ReadonlyArray<ComponentEntry> => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return entries;

  return entries.filter((entry) => {
    const verdict =
      entry.verdict === undefined
        ? ""
        : `${entry.verdict.status} ${entry.verdict.support} ${verdictMark(entry.verdict)?.label ?? ""}`;
    const haystack =
      `${entry.title} ${entry.description} ${entry.section} ${entry.parts.join(" ")} ${entry.props.join(" ")} ${entry.types.join(" ")} ${entry.limitations} ${verdict} ${entry.preview ? "browser preview" : ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
};

export interface LaneMatches {
  readonly lane: string;
  readonly entries: ReadonlyArray<ComponentEntry>;
}

export const otherLaneMatches = (
  entries: ReadonlyArray<ComponentEntry>,
  query: string,
  lane = siteSection,
): ReadonlyArray<LaneMatches> =>
  query.trim() === ""
    ? []
    : filterEntries(
        servedPages(entries).filter((entry) => entry.section !== lane),
        query,
      ).reduce<ReadonlyArray<LaneMatches>>((groups, entry) => {
        const found = groups.find((group) => group.lane === entry.section);
        return found === undefined
          ? [...groups, { lane: entry.section, entries: [entry] }]
          : groups.map((group) =>
              group.lane === entry.section
                ? { ...group, entries: [...group.entries, entry] }
                : group,
            );
      }, []);
