import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The generated icon catalogue (plan 507). The Icons page must list the names
 * the set ships, and ⌘K must find one, but `@gpuixui/icons`' root pulls
 * `effect/Record` and its `Icon` component into whatever imports it — neither
 * belongs in the docs bundle (`src/architecture.test.ts`). So the catalogue is
 * derived from the package source at build time, the same boundary
 * `src/lib/api-values.ts` uses, and only `icon-catalogue.generated.ts` reaches
 * the browser.
 *
 * Native array helpers are deliberate here: this module never runs in the
 * browser, and `effect/*` in a non-test module of `apps/docs` would fail the
 * architecture guard.
 */

export interface IconCatalogueEntry {
  /** The `IconName` a consumer passes to `<Icon name>`. */
  readonly name: string;
  /** The exact `<svg …>…</svg>` string the runtime's `<svg source>` paints. */
  readonly markup: string;
}

export interface IconSources {
  /** `ICON_NAMES`, in the order the package documents and navigates them. */
  readonly names: ReadonlyArray<string>;
  /** The shared wrapper attributes, joined exactly as the registry joins them. */
  readonly attributes: string;
  /** Geometry by name, before the wrapper is applied. */
  readonly shapes: ReadonlyMap<string, string>;
}

const NAMES_FILE = "packages/icons/src/names.ts";
const REGISTRY_FILE = "packages/icons/src/registry.ts";

const read = (root: string, file: string): string =>
  readFileSync(join(root, file), "utf8");

const between = (
  source: string,
  startMarker: string,
  endMarker: string,
): string => {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return end === -1 ? "" : source.slice(start + startMarker.length, end);
};

/** Every `"name",` line of the ordered `ICON_NAMES` array. */
export const iconNames = (source: string): ReadonlyArray<string> =>
  [
    ...between(source, "export const ICON_NAMES = [", "] as const;").matchAll(
      /^ {2}"([^"]+)",$/gm,
    ),
  ].map((match) => match[1] ?? "");

const iconAttributes = (source: string): string =>
  [
    ...between(source, "const ATTRIBUTES = [", '].join(" ")').matchAll(
      /'([^']*)'/g,
    ),
  ]
    .map((match) => match[1] ?? "")
    .join(" ");

const iconShapes = (source: string): ReadonlyMap<string, string> => {
  const block = between(
    source,
    "const shapes = {",
    "} satisfies Record<IconName, string>;",
  );
  const pairs = [
    ...block.matchAll(/^ {2}(?:"([^"]+)"|([A-Za-z0-9-]+)):\s*'([^']*)'/gm),
  ].map((match): readonly [string, string] => [
    match[1] ?? match[2] ?? "",
    match[3] ?? "",
  ]);
  return new Map(pairs);
};

/** The three source pieces, parsed. Empty fields mean an anchor moved. */
export const readIconSources = (root: string): IconSources => ({
  names: iconNames(read(root, NAMES_FILE)),
  attributes: iconAttributes(read(root, REGISTRY_FILE)),
  shapes: iconShapes(read(root, REGISTRY_FILE)),
});

/**
 * The catalogue, in `ICON_NAMES` order with the registry's own wrapper. A name
 * with no geometry is dropped here and reported by `catalogueProblems`, so the
 * writer refuses it instead of shipping a blank tile.
 */
export const deriveIconCatalogue = (input: {
  readonly root: string;
}): ReadonlyArray<IconCatalogueEntry> => {
  const { names, attributes, shapes } = readIconSources(input.root);
  return names.flatMap((name) => {
    const shape = shapes.get(name);
    return shape === undefined
      ? []
      : [{ name, markup: `<svg ${attributes}>${shape}</svg>` }];
  });
};

/**
 * Every way the derivation can be wrong, as a sentence naming the icon. Empty
 * means the catalogue is complete, unique and safe to render in the browser:
 * one `<svg>` per entry, and only the retintable `#000` paint.
 */
export const catalogueProblems = (input: {
  readonly root: string;
  readonly entries: ReadonlyArray<IconCatalogueEntry>;
}): ReadonlyArray<string> => {
  const { names, attributes, shapes } = readIconSources(input.root);
  const anchorProblems = [
    ...(names.length === 0
      ? [`${NAMES_FILE} exposes no ICON_NAMES array`]
      : []),
    ...(attributes === ""
      ? [`${REGISTRY_FILE} exposes no ATTRIBUTES list`]
      : []),
    ...(shapes.size === 0 ? [`${REGISTRY_FILE} exposes no shapes map`] : []),
  ];
  if (anchorProblems.length > 0) return anchorProblems;

  const counts = input.entries.reduce<ReadonlyMap<string, number>>(
    (tally, entry) =>
      new Map([...tally, [entry.name, (tally.get(entry.name) ?? 0) + 1]]),
    new Map(),
  );
  const duplicates = [...counts]
    .filter(([, count]) => count > 1)
    .map(([name]) => `duplicate icon ${name}`);
  const missing = names
    .filter((name) => !shapes.has(name))
    .map((name) => `${name} is in ICON_NAMES but has no shape in registry.ts`);
  const extra = [...shapes.keys()]
    .filter((name) => !names.includes(name))
    .map((name) => `${name} has a shape but is not in ICON_NAMES`);
  const malformed = input.entries.flatMap((entry) => {
    const open = entry.markup.match(/<svg /g) ?? [];
    const close = entry.markup.match(/<\/svg>/g) ?? [];
    const paints = [
      ...entry.markup.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]+)"/g),
    ]
      .map((match) => match[1] ?? "")
      .filter((paint) => paint.toLowerCase() !== "#000");
    return [
      ...(open.length === 1 && close.length === 1
        ? []
        : [`${entry.name} is not exactly one <svg> element`]),
      ...paints.map(
        (paint) =>
          `${entry.name} carries the paint ${paint}, not the retintable #000`,
      ),
    ];
  });

  return [...new Set([...duplicates, ...missing, ...extra, ...malformed])];
};

const HEADER = `// Generated by \`nub run --filter docs icons\` from packages/icons
// (plan 507). Do not edit: \`src/lib/icon-catalogue.test.ts\` fails when this
// file is stale.`;

/** A value in the quote that needs no escapes, as the formatter settles it. */
const quote = (value: string): string =>
  value.includes("'") ? JSON.stringify(value) : `'${value}'`;

/** The committed module's text, so the writer has one renderer to change. */
export const renderGeneratedModule = (
  entries: ReadonlyArray<IconCatalogueEntry>,
): string =>
  [
    HEADER,
    'import type { IconCatalogueEntry } from "./icon-catalogue.js";',
    "",
    "export const iconCatalogue: readonly IconCatalogueEntry[] = [",
    ...entries.flatMap((entry) => [
      "  {",
      `    name: ${JSON.stringify(entry.name)},`,
      // Every markup is far past the 80-column limit, so the formatter always
      // wraps it onto its own line; emitting that shape keeps `fmt` clean after
      // a regeneration.
      "    markup:",
      `      ${quote(entry.markup)},`,
      "  },",
    ]),
    "];",
    "",
  ].join("\n");
