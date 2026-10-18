import {
  elevationShadow,
  typography,
  type ElevationLevel,
  type PlatformName,
  type TextRole,
  type Theme,
} from "@gpuixui/tokens";

/**
 * The token groups a `Theme` carries, derived once so the rendered tables
 * (`<TokenScales />`, `<TypeScale />`) and the search index (`token-search.ts`)
 * cannot disagree about what the package ships.
 */
export interface TokenRow {
  readonly name: string;
  readonly value: string;
}

export interface ScaleGroup {
  readonly id: string;
  readonly title: string;
  readonly rows: ReadonlyArray<TokenRow>;
}

const px = (value: number): string => `${value}px`;

const numericRows = (
  entries: ReadonlyArray<readonly [string, number]>,
): ReadonlyArray<TokenRow> =>
  entries.map(([name, value]) => ({ name, value: px(value) }));

const controlSizes = ["sm", "md", "lg"] as const;

const densityRows = (theme: Theme): ReadonlyArray<TokenRow> => [
  ...controlSizes.map((size) => ({
    name: `controlHeight.${size}`,
    value: px(theme.density.controlHeight[size]),
  })),
  ...controlSizes.map((size) => ({
    name: `controlPaddingX.${size}`,
    value: px(theme.density.controlPaddingX[size]),
  })),
  { name: "rowHeight", value: px(theme.density.rowHeight) },
];

export const scaleGroups = (theme: Theme): ReadonlyArray<ScaleGroup> => [
  {
    id: "spacing",
    title: "Spacing",
    rows: numericRows(Object.entries(theme.spacing)),
  },
  {
    id: "radius",
    title: "Radius",
    rows: numericRows(Object.entries(theme.radius)),
  },
  {
    id: "borderWidth",
    title: "Border width",
    rows: numericRows(Object.entries(theme.borderWidth)),
  },
  {
    id: "iconSize",
    title: "Icon size",
    rows: numericRows(Object.entries(theme.iconSize)),
  },
  {
    id: "density",
    title: `Density (${theme.density.name})`,
    rows: densityRows(theme),
  },
];

export const elevationLevels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies ReadonlyArray<ElevationLevel>;

export const shadow = (theme: Theme, level: ElevationLevel): string => {
  const value = elevationShadow(theme, level);
  if (value === undefined) return "none (reserved)";
  const { offsetX, offsetY, blurRadius, spreadRadius, color } = value;
  return `${offsetX}px ${offsetY}px ${blurRadius}px ${spreadRadius}px ${color}`;
};

const isTextRole = (name: string): name is TextRole =>
  name !== "sans" && name !== "mono" && Object.hasOwn(typography, name);

/** Every typographic role, in the order the package declares them. */
export const textRoles: ReadonlyArray<TextRole> =
  Object.keys(typography).filter(isTextRole);

export const platformNames: ReadonlyArray<PlatformName> = [
  "darwin",
  "linux",
  "win32",
  "default",
];
