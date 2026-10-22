import {
  getTheme,
  themeContrasts,
  themeModes,
  type Theme,
  type ThemeContrast,
  type ThemeMode,
} from "@gpuixui/tokens";

/**
 * The built-in themes, generated from the token package.
 *
 * The four themes the library ships were written out by hand, twice — a table
 * of `getTheme` calls on `/docs/dark-mode` and a table of names and exports on
 * `/docs/theming` — and nothing held either one to `@gpuixui/tokens`: a fifth
 * theme, a renamed export or a new contrast variant would have left both pages
 * describing a library that no longer exists.
 *
 * This specimen is the one list. It reads the package's own mode and contrast
 * indexes and the theme each call returns, so a theme the package adds appears
 * here with no docs edit. `src/lib/built-in-themes.test.ts` holds both pages to
 * it and to the claims they make about it.
 */

/** One built-in theme, with the call that returns it. */
export interface BuiltInTheme {
  /** The mode the call names. */
  readonly mode: ThemeMode;
  /** The contrast variant the call names. */
  readonly contrast: ThemeContrast;
  /** The call a reader writes. */
  readonly call: string;
  /** The theme the call returns. */
  readonly theme: Theme;
}

/**
 * Every built-in theme, in the package's mode order and contrast order.
 *
 * The order is the package's, not a copy of it: `themeModes` and
 * `themeContrasts` are the persisted-choice indexes, so a mode or a contrast
 * variant the library adds lands here in the place the library put it.
 */
export const builtInThemes = (): ReadonlyArray<BuiltInTheme> =>
  themeModes.flatMap((mode) =>
    themeContrasts.map((contrast) => ({
      mode,
      contrast,
      call:
        contrast === "default"
          ? `getTheme("${mode}")`
          : `getTheme("${mode}", "${contrast}")`,
      theme: getTheme(mode, contrast),
    })),
  );

/**
 * The built-in themes, drawn.
 *
 * Each row paints the theme's own colours — the built-in themes are the
 * identity the platform styles are applied to, so they do not follow the
 * platform switch. The specimen is data, not a preview of a component.
 */
export function ThemeMatrix() {
  return (
    <table className="not-prose w-full border-collapse text-left text-sm">
      <thead>
        <tr>
          <th className="border-b border-border pb-2 pr-4 font-medium">
            Theme
          </th>
          <th className="border-b border-border pb-2 pr-4 font-medium">Call</th>
          <th className="border-b border-border pb-2 pr-4 font-medium">Mode</th>
          <th className="border-b border-border pb-2 pr-4 font-medium">
            Contrast
          </th>
          <th className="border-b border-border pb-2 font-medium">Palette</th>
        </tr>
      </thead>
      <tbody>
        {builtInThemes().map(({ mode, contrast, call, theme }) => (
          <tr data-theme={theme.name} key={`${mode}-${contrast}`}>
            <td className="border-b border-border py-2 pr-4">{theme.name}</td>
            <td className="border-b border-border py-2 pr-4">
              <code>{call}</code>
            </td>
            <td className="border-b border-border py-2 pr-4">{mode}</td>
            <td className="border-b border-border py-2 pr-4">{contrast}</td>
            <td className="border-b border-border py-2">
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-24 overflow-hidden rounded border border-border"
                style={{ background: theme.colors.background }}
              >
                <span
                  className="h-full w-1/2"
                  style={{ background: theme.colors.primary }}
                />
                <span
                  className="h-full w-1/2"
                  style={{ background: theme.colors.foreground }}
                />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
