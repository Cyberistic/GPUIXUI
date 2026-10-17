import {
  darkTheme,
  elevationShadow,
  lightTheme,
  type ElevationLevel,
  type Theme,
} from "@gpuixui/tokens";

interface TokenRow {
  readonly name: string;
  readonly value: string;
}

interface ScaleGroup {
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

const scaleGroups = (theme: Theme): ReadonlyArray<ScaleGroup> => [
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

const elevationLevels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies ReadonlyArray<ElevationLevel>;

const shadow = (theme: Theme, level: ElevationLevel): string => {
  const value = elevationShadow(theme, level);
  if (value === undefined) return "none (reserved)";
  const { offsetX, offsetY, blurRadius, spreadRadius, color } = value;
  return `${offsetX}px ${offsetY}px ${blurRadius}px ${spreadRadius}px ${color}`;
};

const cell = "py-1.5 pr-4 font-mono text-xs";
const head = "py-2 pr-4 text-left font-medium";
const row = "border-b border-fd-border/60";

function ScaleTable({ group }: { readonly group: ScaleGroup }) {
  return (
    <div data-group={group.id} className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="pb-2 text-left font-medium">{group.title}</caption>
        <thead>
          <tr className="border-b border-fd-border">
            <th className={head}>Token</th>
            <th className={head}>Value</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((token) => (
            <tr
              key={token.name}
              data-token={`${group.id}.${token.name}`}
              data-value={token.value}
              className={row}
            >
              <td className={cell}>{token.name}</td>
              <td className={cell}>{token.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ElevationTable() {
  return (
    <div data-group="elevation" className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="pb-2 text-left font-medium">Elevation</caption>
        <thead>
          <tr className="border-b border-fd-border">
            <th className={head}>Level</th>
            <th className={head}>Light</th>
            <th className={head}>Dark</th>
          </tr>
        </thead>
        <tbody>
          {elevationLevels.map((level) => {
            const light = shadow(lightTheme, level);
            const dark = shadow(darkTheme, level);
            return (
              <tr
                key={level}
                data-token={`elevation.${level}`}
                data-light={light}
                data-dark={dark}
                className={row}
              >
                <td className={cell}>{level}</td>
                <td className={cell}>{light}</td>
                <td className={cell}>{dark}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The full non-colour token catalogue (plan 430): spacing, radius, border
 * width, icon size, density and elevation, generated from `@gpuixui/tokens`.
 * Colour and type have their own generators; together the three cover every
 * group a `Theme` carries.
 *
 * Spacing and friends are mode-independent, so they render one value column;
 * `token-scales.test.tsx` proves the dark theme agrees. Elevation differs by
 * mode because its shadow colour does.
 */
export function TokenScales() {
  return (
    <>
      {scaleGroups(lightTheme).map((group) => (
        <ScaleTable key={group.id} group={group} />
      ))}
      <ElevationTable />
    </>
  );
}
