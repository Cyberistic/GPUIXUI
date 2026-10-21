import { seriesColors, type Theme } from "@gpuixui/tokens";
import { platformLabel } from "../../lib/platform";
import { usePlatform } from "./platform-toggle";
import { PreviewSurface } from "./preview-surface";

/**
 * The categorical data series, drawn from the theme rather than copied.
 *
 * A chart, a legend swatch or a heat-map region paints `seriesColors(theme)`, so
 * the Theming page shows the scale itself instead of naming it: every swatch
 * here is generated from the theme the platform switch resolves, and
 * `series-swatches.test.tsx` holds each position to that theme. The light and
 * dark rows are different scales by design, which is why the specimen is worth
 * rendering rather than tabulating.
 */

/** The swatches, given a resolved theme (no context, so it is testable). */
export function SeriesSwatchesBody({ theme }: { readonly theme: Theme }) {
  return (
    <ol className="not-prose m-0 grid list-none grid-cols-5 gap-3 p-0">
      {seriesColors(theme).map((color, index) => (
        <li
          className="m-0 flex flex-col gap-1"
          data-series={index + 1}
          key={color}
        >
          <span
            aria-hidden="true"
            className="h-12 rounded-lg border border-border"
            style={{ background: color }}
          />
          <code className="font-mono text-xs text-foreground">
            {`--series-${index + 1}`}
          </code>
          <span className="font-mono text-[0.7rem] text-muted-foreground">
            {color}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The series on the platform surface, so the switch repaints it. */
export function SeriesSwatches() {
  const { platform, theme } = usePlatform();

  return (
    <PreviewSurface className="gx-series">
      <SeriesSwatchesBody theme={theme} />
      <p className="gx-type-note">
        Browser preview of the {platformLabel(platform)} theme's scale: a chart
        in this theme paints these colours, and the switch above changes them
        with the mode, the platform and the look.
      </p>
    </PreviewSurface>
  );
}
