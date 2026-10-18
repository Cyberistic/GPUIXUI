import {
  colorRoles,
  darkTheme,
  lightTheme,
  platformTypes,
  typography,
} from "@gpuixui/tokens";
import type { GeneratedSearchEntry } from "./generated-search";
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
 *
 * Only distinctive names are promoted (`names`): camelCase or dotted. A plain
 * word such as `input`, `label` or `body` is indexed but never outranks the
 * component page that owns it.
 */
const isDistinctive = (name: string): boolean =>
  /[A-Z]/.test(name) || name.includes(".");

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

const scaleNames = [
  ...scaleRows.map((row) => row.name),
  ...elevationLevels.map((level) => `elevation.${level}`),
];

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

export const tokenSearchEntries: ReadonlyArray<GeneratedSearchEntry> = [
  {
    names: colorRoles.filter(isDistinctive),
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
    names: textRoles.filter(isDistinctive),
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
    names: scaleNames,
    index: {
      title: "Scales and control metrics",
      description:
        "Spacing, radius, border width, icon size, density and elevation tokens.",
      content: scaleContent,
      url: "/docs/theming#scales-and-control-metrics",
      breadcrumbs: ["Theming"],
      keywords: scaleNames.join(" "),
    },
  },
  {
    names: [],
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
