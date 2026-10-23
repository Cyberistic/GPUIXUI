/**
 * Browser preview for the Grid page.
 *
 * `Grid` is the runtime's fixed equal-track grid, not a CSS grid, so the
 * preview is a labelled diagram: a dashed outline around each grid with a
 * caption naming its column count and gap. The Code tab shows the native usage.
 */

const cells = Array.from({ length: 6 }, (_, index) => index + 1);

export const GridDemo = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Columns</p>
      <div className="gx-layout-band">
        {([2, 3, 4] as const).map((columns) => (
          <figure className="gx-layout-figure" key={columns}>
            <figcaption className="gx-layout-tag">{columns} columns</figcaption>
            <div className="gx-grid-part" data-columns={columns}>
              {cells
                .filter((cell) => cell <= columns * 2)
                .map((cell) => (
                  <span className="gx-grid-cell" key={cell}>
                    {cell}
                  </span>
                ))}
            </div>
          </figure>
        ))}
      </div>
    </div>
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Rows</p>
      <figure className="gx-layout-figure gx-layout-figure-wide">
        <figcaption className="gx-layout-tag">
          columns={2} rows={3}
        </figcaption>
        <div className="gx-grid-part" data-columns={2}>
          {cells.map((cell) => (
            <span className="gx-grid-cell" key={cell}>
              {cell}
            </span>
          ))}
        </div>
      </figure>
    </div>
  </div>
);

const gridDemoSource = `import { Grid, Text } from "@gpuixui/primitives";

// Equal tracks only — the runtime's fixed-size grid, not a CSS grid.
<Grid columns={2} gap="sm">
  <Text role="caption" tone="muted">Width</Text>
  <Text role="code">1280 px</Text>
  <Text role="caption" tone="muted">Height</Text>
  <Text role="code">800 px</Text>
</Grid>;

<Grid columns={4} gap="xs" rows={3}>…</Grid>;`;

export { gridDemoSource };
