/**
 * Browser preview for the Spacer page.
 *
 * `Spacer` is empty space, not a control, so the preview is a labelled diagram:
 * a dashed outline around the row it sits in, with a caption naming the fixed
 * step or the flexible fill. The Code tab shows the native usage.
 */

export const SpacerDemo = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <div className="gx-layout-row">
      <p className="gx-layout-caption">A fixed step</p>
      <figure className="gx-layout-figure gx-layout-figure-wide">
        <figcaption className="gx-layout-tag">
          size=&quot;lg&quot; · 12px gap
        </figcaption>
        <div className="gx-spacer-part">
          <span className="gx-stack-cell">Left</span>
          <span className="gx-spacer-gap" data-size="lg" />
          <span className="gx-stack-cell">Right</span>
        </div>
      </figure>
    </div>
    <div className="gx-layout-row">
      <p className="gx-layout-caption">A flexible filler</p>
      <figure className="gx-layout-figure gx-layout-figure-wide">
        <figcaption className="gx-layout-tag">
          no size · pushes siblings apart
        </figcaption>
        <div className="gx-spacer-part">
          <span className="gx-stack-cell">Read-only</span>
          <span className="gx-spacer-flex" />
          <span className="gx-stack-cell">Reset all</span>
        </div>
      </figure>
    </div>
  </div>
);

const spacerDemoSource = `import { Spacer, Stack, Text } from "@gpuixui/primitives";

// A flexible spacer fills the leftover main-axis space.
<Stack direction="row" align="center" gap="sm" style={{ width: 320 }}>
  <Text role="caption" tone="muted">Read-only</Text>
  <Spacer />
  <Text role="caption" tone="primary">Reset all</Text>
</Stack>;

// With a size it is a fixed square gap instead.
<Stack direction="row" align="center">
  <Text role="body">Before</Text>
  <Spacer size="lg" />
  <Text role="body">After</Text>
</Stack>;`;

export { spacerDemoSource };
