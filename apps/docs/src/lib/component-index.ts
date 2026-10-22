import { packageCollections } from "./collection-routes";

/**
 * The component index.
 *
 * The Components section had forty pages and no way to scan them: the sidebar
 * lists names, the search box needs a query, and a reader arriving from the
 * landing page had prose to read before finding a component. The index is built
 * from the same frontmatter the pages render, so its titles and descriptions
 * cannot drift from the pages, and a page added to any collection appears here
 * without a docs change.
 */

/** One docs file, as the glob read it: a repo-relative path and its source. */
export interface ComponentPage {
  /** `content/docs/components/dialog.mdx`, `packages/components/docs/card.mdx`. */
  readonly file: string;
  readonly source: string;
}

/**
 * The `COMPONENTS.md` row a page reports: its status and its GPUix verdict.
 *
 * The row, not the page, decides whether a component is shipped and how much of
 * it the runtime supports. The index and the page's status strip read the same
 * two cells, so they cannot disagree.
 */
export interface PageVerdict {
  readonly status: string;
  readonly support: string;
}

/**
 * The inventory row for a page title, or `undefined` when it has none.
 *
 * Injected rather than imported: the index stays a function of its pages, and
 * the data module resolves the title aliases the status strip already uses.
 */
export type VerdictOf = (title: string) => PageVerdict | undefined;

/** One row the index renders. */
export interface ComponentEntry {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  /** The sidebar section the page belongs to: `Primitives` or `Components`. */
  readonly section: string;
  /** The inventory row the page reports, when `COMPONENTS.md` has one. */
  readonly verdict: PageVerdict | undefined;
  /** The compound parts the page documents, e.g. `DialogFooter`. */
  readonly parts: ReadonlyArray<string>;
  /** The props the page's API table documents, e.g. `onCheckedChange`. */
  readonly props: ReadonlyArray<string>;
  /** The named types those props take, e.g. `StateStyle`. */
  readonly types: ReadonlyArray<string>;
  /** What the page says the component cannot do. */
  readonly limitations: string;
  /**
   * True when the page opens with a browser preview (`<ComponentPreview`).
   *
   * Only a curated page mounts one; a package page is strategy 4 in
   * `docs/preview-strategy.md` and opens with the native-run note instead. The
   * index marks the rows so a reader can see which pages show the shape of the
   * component before reading its API.
   */
  readonly preview: boolean;
}

/** The section the site's own component pages belong to. */
const siteSection = "Components";

/** The sidebar order: primitives first, then the composed components. */
const sectionOrder = packageCollections.reduce<ReadonlyArray<string>>(
  (order, collection) =>
    order.includes(collection.section) ? order : [...order, collection.section],
  [],
);

/** Where a docs file is served, or `undefined` when it is not a component page. */
export const pageUrl = (file: string): string | undefined => {
  const site = /^content\/docs\/components\/(.+)\.mdx$/.exec(file);
  if (site !== null) return indexUrl("/docs/components", site[1]);

  const packaged = /^packages\/([^/]+)\/docs\/(.+)\.mdx$/.exec(file);
  if (packaged === null) return undefined;

  const collection = packageCollections.find(
    (candidate) => candidate.dir === `packages/${packaged[1]}/docs`,
  );
  return collection === undefined
    ? undefined
    : indexUrl(collection.route, packaged[2]);
};

/** `index.mdx` is its folder's landing page, not a component. */
const indexUrl = (
  route: string,
  name: string | undefined,
): string | undefined =>
  name === undefined || name === "index" ? undefined : `${route}/${name}`;

/** The sidebar section a docs file belongs to. */
const sectionOf = (file: string): string | undefined => {
  if (file.startsWith("content/docs/components/")) return siteSection;
  return packageCollections.find((collection) =>
    file.startsWith(`${collection.dir}/`),
  )?.section;
};

/** A frontmatter scalar; the packages quote a value a YAML parser would reject. */
const frontmatterValue = (head: string, key: string): string | undefined => {
  const value = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(head)?.[1]?.trim();
  if (value === undefined) return undefined;
  return value.startsWith('"') || value.startsWith("'")
    ? value.slice(1, -1)
    : value;
};

const frontmatter = (source: string): string =>
  /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";

/** One page's section: its `##` heading and the text under it. */
interface PageSection {
  readonly heading: string;
  readonly text: string;
}

/**
 * The `##` sections of a page.
 *
 * A page is prose with headings, and the two the index needs are the parts a
 * component is made of and the limits it has.
 */
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

/**
 * The compound parts a page documents.
 *
 * The pages name their parts in three ways: a parts table (`## Parts`,
 * `## Anatomy`, or the curated template's `## Composition`), an API table headed
 * by the part's name (`| `Dialog` prop |`), and a heading per part
 * (`### DialogContent`, or `### `CheckboxIndicator``).
 * All three are read, so a reader who searches "DialogFooter" finds the page
 * that documents it.
 */
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

    return [...rows, ...headings];
  });

  return [...new Set(names.filter((name) => !notAPart.has(name)))];
};

/**
 * The headings a page uses for something other than a part.
 *
 * `### Parts` inside an API section is a table of contents, not a part, and a
 * row headed `Part` is a column label.
 */
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

/** The props a page documents, and the named types those props take. */
export interface PageProps {
  readonly props: ReadonlyArray<string>;
  readonly types: ReadonlyArray<string>;
}

/** A fenced block is an example, not documentation: its `|` rows are not tables. */
const withoutCodeFences = (text: string): string =>
  text.replace(/^```[\s\S]*?^```/gm, "");

/** One table: its header cells and the body rows that carry data. */
interface Table {
  readonly header: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

/** A row's cells, with a `\\|` kept inside its cell instead of splitting it. */
const cellsOf = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());

/** A row of dashes (`---`, `:--:`) marks the header boundary. */
const separator = (cells: ReadonlyArray<string>): boolean =>
  cells.every((cell) => /^-+$/.test(cell.replace(/:/g, "")));

/**
 * The tables in a section.
 *
 * A table is a blank-line-delimited block of `|` rows, so prose between two
 * tables does not join them and a fenced example is already gone.
 */
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

/** The identifiers inside one cell's code spans, split on `/` for pairs. */
const codeNames = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].flatMap((match) =>
    (match[1] ?? "")
      .split("/")
      .map((name) => name.trim())
      .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)),
  );

/**
 * The props named in a free-form props cell.
 *
 * Some pages describe a part's props in one sentence — "`value` (required),
 * `max?`, children" — so the names are the code spans and the words marked
 * optional with `?`. A capitalised name is the part or a type, not a prop.
 */
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

/** The capitalised type names a cell writes in code. */
const namedTypes = (cell: string): ReadonlyArray<string> =>
  [...cell.matchAll(/`([^`]+)`/g)].flatMap(
    (match) => match[1]?.match(/\b[A-Z][A-Za-z0-9]*\b/g) ?? [],
  );

/** The column a header names, or `-1`. */
const columnOf = (header: ReadonlyArray<string>, pattern: RegExp): number =>
  header.findIndex((cell) => pattern.test(cell.trim()));

/**
 * The props a page documents, read from its API tables.
 *
 * A reader who knows the prop but not the component — "which pages take
 * `onCheckedChange`?" — has nothing else to search: the sidebar shows names and
 * the parts table shows parts. The pages write three table shapes: one prop per
 * row (`Prop | Type`), one part per row with a prop column (`Part | Prop |
 * Type`), and one part per row with its props in a sentence (`Part | Renders |
 * Props`). All three are read. The named types come along for the same reason
 * ("which components take a `StateStyle`?"), limited to capitalised identifiers
 * so a `boolean` does not match every page in the library.
 */
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

/** Column labels a table repeats, and words that are never a prop. */
const notAProp = new Set([
  "Prop",
  "Props",
  "Part",
  "Parts",
  // A default value a page writes in a code span (`(default `true`)`) is data,
  // not a prop: counting it made "true" a prop of every menu page, so the
  // index's prop list and its filter both matched a value.
  "true",
  "false",
]);

/**
 * What a page says its component cannot do.
 *
 * The limits are the reason a reader searches at all — "which component has no
 * `aria-current`?" — and they are written under three different headings
 * across the packages.
 */
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

/**
 * The mark a row wears when its inventory verdict is not whole.
 *
 * `done` with `yes` support is the shipped component, so it needs no badge: an
 * unmarked row is complete on both axes. Anything else names the axis that is
 * not — `partial` support, a `todo` status, a `?` nobody measured — because the
 * page says status is per component and a reader scanning the list cannot see
 * the strip on a page they have not opened.
 */
export interface VerdictMark {
  /** The words the row wears, e.g. `partial` or `todo · unknown`. */
  readonly label: string;
  /** The inventory cells those words summarise, for the mark's tooltip. */
  readonly detail: string;
}

/** The first word of a cell, with `?` read as the absence it stands for. */
const verdictWord = (cell: string): string => {
  const first = cell.split(/[\s(]/)[0] ?? "";
  return first === "?" ? "unknown" : first;
};

/** The badge a verdict earns, or `undefined` when the row is whole. */
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

/** One page's row, or `undefined` when it has no title or is not a component. */
const entryOf = (
  page: ComponentPage,
  verdictOf: VerdictOf,
): ComponentEntry | undefined => {
  const url = pageUrl(page.file);
  const section = sectionOf(page.file);
  if (url === undefined || section === undefined) return undefined;

  const head = frontmatter(page.source);
  const title = frontmatterValue(head, "title");
  if (title === undefined) return undefined;

  return {
    title,
    description: frontmatterValue(head, "description") ?? "",
    url,
    section,
    verdict: verdictOf(title),
    parts: partsOf(page.source),
    ...propsOf(page.source),
    limitations: limitationsOf(page.source),
    preview: page.source.includes("<ComponentPreview"),
  };
};

/**
 * Every component page, one row per URL.
 *
 * A curated page shadows the package page that shares its URL, so the first
 * page read wins; the data module reads the site's pages first for that reason.
 */
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

/**
 * The rows a reader's query keeps.
 *
 * Every whitespace-separated term must appear in the row, so "search input"
 * finds the search field and not every input, and a term matches the section so
 * "primitives" narrows to that lane. A part name finds the page that
 * documents it, a prop or its type finds the page whose API table declares it,
 * a limitation finds the pages that carry it, and "preview" finds the pages
 * that open with a browser rendering. The inventory verdict is indexed too, so
 * "partial" finds every component the runtime covers only in part.
 */
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
