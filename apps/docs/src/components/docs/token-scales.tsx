import {
  densityNames,
  densityPresets,
  elevationShadow,
  type BoxShadow,
  type ElevationLevel,
  type Theme,
} from "@gpuixui/tokens";
import { platformLabel } from "../../lib/platform";
import { usePlatform } from "./platform-toggle";
import { PreviewSurface } from "./preview-surface";

/**
 * The geometry scales, drawn from the theme rather than copied.
 *
 * The Theming page named `spacing`, `radius`, `borderWidth`, `iconSize` and
 * `density` in one table and never showed a value, so a reader sizing a control
 * had to open the package. Every row here is generated from the theme and
 * `token-scales.test.tsx` holds each step and its printed size to that theme,
 * so a step added to `@gpuixui/tokens` appears without a docs change.
 */

/** The shadow levels, in the order a surface is raised through them. */
export const elevationLevels: ReadonlyArray<ElevationLevel> = [
  "sm",
  "md",
  "lg",
  "overlay",
];

/** The CSS a preview box paints for a theme's elevation step. */
const cssShadow = (shadow: BoxShadow | undefined): string | undefined =>
  shadow === undefined
    ? undefined
    : `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blurRadius}px ${shadow.spreadRadius}px ${shadow.color}`;

const small = "m-0 font-mono text-[0.7rem] text-muted-foreground";
const nameCell = "w-16 shrink-0 font-mono text-xs text-muted-foreground";
const valueCell = "w-14 shrink-0 font-mono text-xs text-foreground";

const Group = ({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note: string;
  readonly children: React.ReactNode;
}) => (
  <section>
    <h3 className="m-0 text-sm font-semibold text-foreground">{title}</h3>
    <p className={`${small} mb-2`}>{note}</p>
    {children}
  </section>
);

/** The specimens, given a resolved theme (no context, so it is testable). */
export function TokenScalesBody({ theme }: { readonly theme: Theme }) {
  const steps = Object.entries(theme.spacing);
  const radii = Object.entries(theme.radius);
  const borders = Object.entries(theme.borderWidth);
  const icons = Object.entries(theme.iconSize);

  return (
    <div className="not-prose grid gap-8 md:grid-cols-2">
      <Group
        note="Gaps and padding between and inside elements."
        title="Spacing"
      >
        <ul className="m-0 list-none space-y-1 p-0">
          {steps.map(([name, value]) => (
            <li
              className="flex items-center gap-3"
              data-token={`spacing.${name}`}
              key={name}
            >
              <code className={nameCell}>{name}</code>
              <span className={valueCell}>{value}px</span>
              <span
                aria-hidden="true"
                style={{
                  background: "var(--primary)",
                  borderRadius: 2,
                  height: 8,
                  width: value,
                }}
              />
            </li>
          ))}
        </ul>
      </Group>

      <Group note="Corner radii a surface can take." title="Radius">
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {radii.map(([name, value]) => (
            <li
              className="flex flex-col items-center gap-1"
              data-token={`radius.${name}`}
              key={name}
            >
              <span
                aria-hidden="true"
                style={{
                  border: "2px solid var(--border)",
                  borderRadius: value,
                  height: 40,
                  width: 40,
                }}
              />
              <code className={nameCell}>{name}</code>
              <span className={valueCell}>{value}px</span>
            </li>
          ))}
        </ul>
      </Group>

      <Group
        note="Hairline dividers and emphasised control edges."
        title="Borders"
      >
        <ul className="m-0 list-none space-y-3 p-0">
          {borders.map(([name, value]) => (
            <li
              className="flex items-center gap-3"
              data-token={`borderWidth.${name}`}
              key={name}
            >
              <code className={nameCell}>{name}</code>
              <span className={valueCell}>{value}px</span>
              <span
                aria-hidden="true"
                className="w-full"
                style={{
                  borderTopColor: "var(--border)",
                  borderTopStyle: "solid",
                  borderTopWidth: value,
                }}
              />
            </li>
          ))}
        </ul>
      </Group>

      <Group
        note="Square sizes for an icon beside text or a control."
        title="Icons"
      >
        <ul className="m-0 flex list-none flex-wrap items-end gap-4 p-0">
          {icons.map(([name, value]) => (
            <li
              className="flex flex-col items-center gap-1"
              data-token={`iconSize.${name}`}
              key={name}
            >
              <span
                aria-hidden="true"
                style={{
                  background: "var(--muted-foreground)",
                  height: value,
                  width: value,
                }}
              />
              <code className={nameCell}>{name}</code>
              <span className={valueCell}>{value}px</span>
            </li>
          ))}
        </ul>
      </Group>

      <Group
        note="One shadow per level; a surface reads it, never mixes it."
        title="Elevation"
      >
        <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
          {elevationLevels.map((level) => (
            <li
              className="flex flex-col items-center gap-2"
              data-token={`elevation.${level}`}
              key={level}
            >
              <span
                aria-hidden="true"
                style={{
                  background: "var(--card)",
                  borderRadius: 8,
                  boxShadow: cssShadow(elevationShadow(theme, level)),
                  height: 36,
                  width: 56,
                }}
              />
              <code className={nameCell}>{level}</code>
              <span className={small}>
                {theme.elevation[level].length === 0
                  ? "none (reserved)"
                  : "1 shadow"}
              </span>
            </li>
          ))}
        </ul>
      </Group>

      <Group
        note="Control geometry per density preset. Type never changes."
        title="Density"
      >
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left">
                <th className="px-2 py-1.5 font-semibold">Preset</th>
                <th className="px-2 py-1.5 font-semibold">Height</th>
                <th className="px-2 py-1.5 font-semibold">Padding</th>
                <th className="px-2 py-1.5 font-semibold">Row</th>
              </tr>
            </thead>
            <tbody>
              {densityNames.map((name) => {
                const preset = densityPresets[name];
                const active = name === theme.density.name;

                return (
                  <tr
                    className="border-b border-border last:border-0"
                    data-active={active}
                    data-token={`density.${name}`}
                    key={name}
                  >
                    <th className="px-2 py-1.5 text-left font-mono text-xs font-medium">
                      {name}
                      {active ? " · active" : ""}
                    </th>
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {preset.controlHeight.sm}/{preset.controlHeight.md}/
                      {preset.controlHeight.lg}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {preset.controlPaddingX.sm}/{preset.controlPaddingX.md}/
                      {preset.controlPaddingX.lg}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {preset.rowHeight}px
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Group>
    </div>
  );
}

/** The scales on the platform surface, so a platform's radii and density show. */
export function TokenScales() {
  const { platform, theme } = usePlatform();

  return (
    <PreviewSurface className="gx-token-scales">
      <TokenScalesBody theme={theme} />
      <p className="gx-type-note">
        Browser preview of the {platformLabel(platform)} theme: every value is
        read from `@gpuixui/tokens`, and the platform switch changes the radii
        and the density it resolves. The shipped components paint these in
        GPUix, not the DOM.
      </p>
    </PreviewSurface>
  );
}
