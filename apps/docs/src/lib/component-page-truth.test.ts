import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inventory } from "./inventory-data";

/**
 * The curated component pages make three claims the code owns: which runtime
 * version a gap was measured on, how many native behaviour tests prove the
 * component, and whether the inventory calls it shipped.
 *
 * All three drifted. After the 0.11.0 bump the pages still measured their gaps
 * on 0.10.0 — and the Button page said the runtime had no `focusVisible`, which
 * 0.11.0 paints. The Tabs page claimed 14 native tests where the suite runs 19,
 * and the Button page said `COMPONENTS.md` listed Tier 1 as `todo` long after
 * the rows were `done`. A page that undersells or overstates the code is the
 * same defect in both directions.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string, base: URL = root): string =>
  readFileSync(new URL(path, base), "utf8");

/** The runtime the workspace installs, from the package catalogue. */
const pinnedRuntime = (): string => {
  const manifest: unknown = JSON.parse(read("package.json"));
  const catalog =
    typeof manifest === "object" &&
    manifest !== null &&
    "workspaces" in manifest
      ? manifest.workspaces
      : undefined;
  const versions =
    typeof catalog === "object" && catalog !== null && "catalog" in catalog
      ? catalog.catalog
      : undefined;
  const version =
    typeof versions === "object" &&
    versions !== null &&
    "@gpuix/native" in versions
      ? versions["@gpuix/native"]
      : undefined;
  return typeof version === "string" ? version : "";
};

interface CuratedPage {
  readonly file: string;
  /** The row in `COMPONENTS.md` this component's status comes from. */
  readonly row: string;
  /** The native suite that proves it, when the page prints a test count. */
  readonly suite?: string;
  /** The source the page's Dependencies table describes. */
  readonly source: string;
}

const pages: ReadonlyArray<CuratedPage> = [
  {
    file: "button.mdx",
    row: "Buttons",
    source: "packages/primitives/src/components/Button.tsx",
  },
  {
    file: "dialog.mdx",
    row: "Dialogs",
    suite: "packages/components/src/behaviour/dialog.test.tsx",
    source: "packages/components/src/dialog.tsx",
  },
  {
    file: "dropdown-menu.mdx",
    row: "Dropdown menus",
    suite: "packages/components/src/behaviour/dropdown-menu.test.tsx",
    source: "packages/components/src/dropdown-menu.tsx",
  },
  {
    file: "popover.mdx",
    row: "Popovers",
    suite: "packages/components/src/behaviour/popover.test.tsx",
    source: "packages/components/src/popover.tsx",
  },
  {
    file: "tabs.mdx",
    row: "Tabs",
    suite: "packages/components/src/behaviour/tabs.test.tsx",
    source: "packages/components/src/tabs.tsx",
  },
];

const body = (page: CuratedPage): string =>
  read(`apps/docs/content/docs/components/${page.file}`);

/** The `## Status` section, which is where a page makes its claims. */
const status = (page: CuratedPage): string => {
  const text = body(page);
  const start = text.indexOf("## Status");
  return start === -1 ? "" : text.slice(start);
};

/** Every `it(` in a suite file: the native cases the page counts. */
const nativeCases = (suite: string): number =>
  (read(suite).match(/\bit\(/g) ?? []).length;

/** The `## Dependencies` table's package cells. */
const dependencies = (page: CuratedPage): ReadonlyArray<string> => {
  const text = body(page);
  const start = text.indexOf("## Dependencies");
  if (start === -1) return [];
  const end = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, end === -1 ? undefined : end);

  return section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => {
      const cell = line.replace(/^\|/, "").split("|")[0]?.trim();
      return cell === undefined || cell === "Package" || cell.startsWith("---")
        ? []
        : [cell.replace(/`/g, "")];
    });
};

/**
 * Every package a source imports. A relative import is this package's own code
 * (the table's `this package` row), `react` is a peer every component shares,
 * and an `effect` subpath is the `effect` package the table names.
 */
const importedPackages = (source: string): ReadonlyArray<string> =>
  [...source.matchAll(/(?:from\s+|import\s+)"([^"]+)"/g)]
    .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
    .filter(
      (specifier) =>
        !specifier.startsWith(".") &&
        !specifier.startsWith("node:") &&
        specifier !== "react" &&
        specifier !== "react-dom" &&
        specifier !== "react/jsx-runtime",
    )
    .map((specifier) =>
      specifier.startsWith("effect/") ? "effect" : specifier,
    )
    .filter((specifier, index, all) => all.indexOf(specifier) === index);

describe("the curated component pages", () => {
  it("name the runtime version their gaps were measured on", () => {
    const pinned = pinnedRuntime();

    expect(pinned).not.toBe("");
    expect(
      pages.filter((page) => !body(page).includes(`@gpuix/native@${pinned}`)),
    ).toEqual([]);
  });

  it("cite no version other than the pinned runtime", () => {
    const pinned = pinnedRuntime();
    const stale = pages.flatMap((page) =>
      [...body(page).matchAll(/\b(\d+\.\d+\.\d+)\b/g)]
        .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
        .filter((version) => version !== pinned)
        .map((version) => `${page.file}: ${version}`),
    );

    expect(stale).toEqual([]);
  });

  it("print the number of native cases their suite runs", () => {
    const wrong = pages.flatMap((page) => {
      if (page.suite === undefined) return [];
      const printed = /(\d+) native/.exec(status(page))?.[1];
      return printed === String(nativeCases(page.suite))
        ? []
        : [
            `${page.file}: says ${printed ?? "nothing"}, suite runs ${nativeCases(page.suite)}`,
          ];
    });

    expect(wrong).toEqual([]);
  });

  it("agree with the inventory row for the component", () => {
    const disagreeing = pages.flatMap((page) => {
      const row = inventory.rows.find(
        (candidate) => candidate.name === page.row,
      );
      return row !== undefined && status(page).includes(row.status)
        ? []
        : [
            `${page.file}: says ${status(page).slice(0, 60)}…, inventory says ${row?.status ?? "no row"}`,
          ];
    });

    expect(disagreeing).toEqual([]);
  });

  it("list every package the component imports", () => {
    const missing = pages.flatMap((page) => {
      const listed = dependencies(page);
      return importedPackages(read(page.source))
        .filter((specifier) => !listed.includes(specifier))
        .map(
          (specifier) =>
            `${page.file}: imports ${specifier}, which its Dependencies table does not list`,
        );
    });

    expect(missing).toEqual([]);
  });
});
