import { colorRoles, type ThemeColors } from "@gpuixui/tokens";
import { themeColors } from "@/lib/docs-theme";

const swatch =
  "inline-block size-4 shrink-0 rounded border border-fd-border align-middle";

/** One palette a colour table renders, and the heading it shows. */
export interface ColourPalette {
  /** Stable key for tests; also the cell's `data-palette`. */
  readonly key: string;
  /** The reader-facing column heading. */
  readonly label: string;
  readonly colors: ThemeColors;
}

/**
 * Every semantic colour role, one column per palette (plans 416, 586). Nothing
 * is retyped: the caller passes the package's own maps, so the page cannot
 * document a value the library does not ship.
 */
export function TokenColorTable({
  palettes,
}: {
  readonly palettes: ReadonlyArray<ColourPalette>;
}) {
  return (
    <div className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border text-left">
            <th className="py-2 pr-4 font-medium">Role</th>
            {palettes.map((palette) => (
              <th key={palette.key} className="py-2 pr-4 font-medium">
                {palette.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colorRoles.map((role) => (
            <tr
              key={role}
              data-role={role}
              className="border-b border-fd-border/60"
            >
              <td className="py-1.5 pr-4 font-mono text-xs">{role}</td>
              {palettes.map((palette) => {
                const value = palette.colors[role];
                return (
                  <td
                    key={palette.key}
                    data-palette={palette.key}
                    className="py-1.5 pr-4"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className={swatch}
                        style={{ backgroundColor: value }}
                      />
                      <code className="font-mono text-xs">{value}</code>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The light and dark palettes, as rendered under "Semantic roles". */
export function TokenColors() {
  return (
    <TokenColorTable
      palettes={[
        { key: "light", label: "Light", colors: themeColors.light },
        { key: "dark", label: "Dark", colors: themeColors.dark },
      ]}
    />
  );
}
