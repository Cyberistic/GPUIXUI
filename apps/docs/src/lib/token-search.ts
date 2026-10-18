import {
  colorRoles,
  darkTheme,
  lightTheme,
  platformTypes,
  typography,
} from "@gpuixui/tokens";
import type { Index } from "fumadocs-core/search/server";
import {
  elevationLevels,
  platformNames,
  scaleGroups,
  shadow,
  textRoles,
} from "./token-catalogue";

/**
 * The token catalogue is rendered React (`<TokenColors />`, `<TokenScales />`,
 * `<TypeScale />`), so the MDX page index never sees a single token name. These
 * documents give every generated table its own index entry, the same fix plans
 * 419 and 490 applied to the component registry and the Values API: a reader
 * who types a role or a scale token reaches the table that documents it.
 */
export interface TokenSearchEntry {
  readonly index: Index;
  /** The tokens this document owns, for exact-match ranking. */
  readonly names: ReadonlyArray<string>;
}

const colourContent = colorRoles
  .map(
    (role) =>
      `${role}: ${lightTheme.colors[role]} (light), ${darkTheme.colors[role]} (dark)`,
  )
  .join("\n");

const typeContent = [
  ...textRoles.map((role) => {
    const style = typography[role];
    return `${role}: ${style.fontSize}px/${style.lineHeight}px ${style.fontWeight}`;
  }),
  `sans: ${typography.sans}`,
  `mono: ${typography.mono}`,
].join("\n");

const scaleRows = scaleGroups(lightTheme).flatMap((group) =>
  group.rows.map((row) => ({
    name: `${group.id}.${row.name}`,
    value: row.value,
  })),
);

const scaleContent = [
  ...scaleRows.map((row) => `${row.name}: ${row.value}`),
  ...elevationLevels.map(
    (level) => `elevation.${level}: ${shadow(lightTheme, level)}`,
  ),
].join("\n");

const platformContent = platformNames
  .map((platform) => {
    const type = platformTypes[platform];
    return `${type.label} (${platform}): ${type.mono}, ${type.sans}`;
  })
  .join("\n");

export const tokenSearchEntries: ReadonlyArray<TokenSearchEntry> = [
  {
    names: colorRoles,
    index: {
      title: "Colour roles",
      description: "Every semantic colour role, in both themes.",
      content: colourContent,
      url: "/docs/theming#semantic-roles",
      breadcrumbs: ["Theming"],
      keywords: colorRoles.join(" "),
    },
  },
  {
    names: textRoles,
    index: {
      title: "Type scale",
      description: "Every typographic role and the family it resolves to.",
      content: typeContent,
      url: "/docs/typography",
      breadcrumbs: ["Typography"],
      keywords: textRoles.join(" "),
    },
  },
  {
    names: [
      ...scaleRows.map((row) => row.name),
      ...elevationLevels.map((level) => `elevation.${level}`),
    ],
    index: {
      title: "Scales and control metrics",
      description:
        "Spacing, radius, border width, icon size, density and elevation tokens.",
      content: scaleContent,
      url: "/docs/theming#scales-and-control-metrics",
      breadcrumbs: ["Theming"],
      keywords: scaleRows.map((row) => row.name).join(" "),
    },
  },
  {
    names: platformNames,
    index: {
      title: "Platform styles",
      description: "The macOS, Linux, Windows and default type families.",
      content: platformContent,
      url: "/docs/theming#platform-styles",
      breadcrumbs: ["Theming"],
      keywords: platformNames.join(" "),
    },
  },
];

export const tokenEntryByUrl: ReadonlyMap<
  string,
  { readonly names: ReadonlyArray<string>; readonly title: string }
> = new Map(
  tokenSearchEntries.map((entry) => [
    entry.index.url,
    { names: entry.names, title: entry.index.title },
  ]),
);

/**
 * A distinctive token name is one no ordinary English word can be mistaken for:
 * camelCase (`destructiveSoft`, `bodyStrong`) or dotted (`spacing.2`). Plain
 * names (`input`, `label`, `body`) are indexed but never promoted, so the
 * component page that carries the same word keeps the first result.
 */
const isDistinctive = (name: string): boolean =>
  /[A-Z]/.test(name) || name.includes(".");

/** `0` when the query is exactly a distinctive token this document owns. */
export const tokenRank = (url: string, query: string): number | undefined => {
  const entry = tokenEntryByUrl.get(url);
  const needle = query.trim().toLowerCase();
  if (entry === undefined || needle.length === 0) return undefined;
  return entry.names.some(
    (name) => isDistinctive(name) && name.toLowerCase() === needle,
  )
    ? 0
    : undefined;
};
