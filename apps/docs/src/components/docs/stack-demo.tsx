/**
 * Browser preview for the Stack page.
 *
 * `Stack` is layout, not a control, so the preview is a labelled diagram: a
 * dashed outline around each arrangement with a caption naming its axis, gap
 * and alignment. The Code tab shows the native usage.
 */

const cells = ["A", "B", "C"] as const;

export const StackDemo = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Direction</p>
      <div className="gx-layout-band">
        <figure className="gx-layout-figure">
          <figcaption className="gx-layout-tag">row</figcaption>
          <div className="gx-stack-part gx-stack-row">
            {cells.map((cell) => (
              <span className="gx-stack-cell" key={cell}>
                {cell}
              </span>
            ))}
          </div>
        </figure>
        <figure className="gx-layout-figure">
          <figcaption className="gx-layout-tag">column</figcaption>
          <div className="gx-stack-part gx-stack-column">
            {cells.map((cell) => (
              <span className="gx-stack-cell" key={cell}>
                {cell}
              </span>
            ))}
          </div>
        </figure>
      </div>
    </div>
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Justify</p>
      <div className="gx-layout-band">
        {(["start", "center", "end", "between"] as const).map((justify) => (
          <figure className="gx-layout-figure" key={justify}>
            <figcaption className="gx-layout-tag">{justify}</figcaption>
            <div className="gx-stack-part gx-stack-row" data-justify={justify}>
              {cells.slice(0, 2).map((cell) => (
                <span className="gx-stack-cell" key={cell}>
                  {cell}
                </span>
              ))}
            </div>
          </figure>
        ))}
      </div>
    </div>
  </div>
);

const stackDemoSource = `import { Stack, Text, Button } from "@gpuixui/primitives";

<Stack direction="column" gap="sm">
  <Text role="h3">Danger zone</Text>
  <Stack direction="row" gap="sm" justify="end">
    <Button variant="outline">Cancel</Button>
    <Button variant="destructive">Delete</Button>
  </Stack>
</Stack>;

// justify distributes the children along the main axis.
<Stack direction="row" justify="between" style={{ width: 320 }}>
  <Text role="caption" tone="muted">Read-only</Text>
  <Text role="caption" tone="primary">Reset all</Text>
</Stack>;`;

export { stackDemoSource };
