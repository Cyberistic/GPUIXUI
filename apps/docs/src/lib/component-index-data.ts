import {
  buildIndex,
  type ComponentEntry,
  type ComponentPage,
  type PageIdentity,
  type PageVerdict,
} from "./component-index";
import { inventory } from "./inventory-data";
import { statusForPage } from "./inventory-status";
import { curatedPrimitiveTwins } from "./curated-twins";

const siteFiles = import.meta.glob("../../content/docs/components/**/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

const packageFiles = import.meta.glob("../../../../packages/*/docs/**/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

const repoRelative = (key: string): string => key.replace(/^(\.\.\/)+/, "");

const pages = (files: Readonly<Record<string, string>>): ComponentPage[] =>
  Object.entries(files).map(([file, source]) => ({
    file: repoRelative(file),
    source,
  }));

const verdictOf = (page: PageIdentity): PageVerdict | undefined => {
  const status = statusForPage(inventory, page);
  return status.kind === "row"
    ? { status: status.row.status, support: status.row.support }
    : undefined;
};

const docsOnly = new Set(["content/docs/components/reorderable-tabs.mdx"]);

export const componentIndex: ReadonlyArray<ComponentEntry> = buildIndex(
  [...pages(siteFiles), ...pages(packageFiles)].filter(
    (page) => !docsOnly.has(page.file),
  ),
  verdictOf,
);

export const componentPages: ReadonlyArray<ComponentEntry> =
  componentIndex.filter((entry) => entry.section === "Components");

export const primitivePages: ReadonlyArray<ComponentEntry> =
  componentIndex.filter(
    (entry) =>
      entry.section === "Primitives" &&
      !curatedPrimitiveTwins.some((twin) => twin.retired === entry.url),
  );
