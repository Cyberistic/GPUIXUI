import { darkTheme, lightTheme } from "@gpuixui/tokens";
import {
  elevationLevels,
  scaleGroups,
  shadow,
  type ScaleGroup,
} from "@/lib/token-catalogue";

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
