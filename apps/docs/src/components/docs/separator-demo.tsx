/**
 * Browser preview for the Separator page.
 *
 * `Separator` is a theme-coloured rule, not a control, so the preview is a
 * labelled diagram: a dashed outline around the rule's region with a caption
 * naming its orientation and optional caption. The Code tab shows the native
 * usage.
 */

export const SeparatorDemo = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Orientation</p>
      <div className="gx-layout-band">
        <figure className="gx-layout-figure gx-layout-figure-wide">
          <figcaption className="gx-layout-tag">horizontal</figcaption>
          <div className="gx-sep-region">
            <span className="gx-sep-word">Account</span>
            <span className="gx-sep-part" data-orientation="horizontal" />
            <span className="gx-sep-word">Sign-in details</span>
          </div>
        </figure>
        <figure className="gx-layout-figure">
          <figcaption className="gx-layout-tag">vertical</figcaption>
          <div className="gx-sep-region gx-sep-region-row">
            <span className="gx-sep-word">Left</span>
            <span className="gx-sep-part" data-orientation="vertical" />
            <span className="gx-sep-word">Right</span>
          </div>
        </figure>
      </div>
    </div>
    <div className="gx-layout-row">
      <p className="gx-layout-caption">A centred caption</p>
      <figure className="gx-layout-figure gx-layout-figure-wide">
        <figcaption className="gx-layout-tag">label=&quot;or&quot;</figcaption>
        <div className="gx-sep-region">
          <span className="gx-sep-word">Sign in with email</span>
          <div className="gx-sep-caption">
            <span className="gx-sep-part" data-orientation="horizontal" />
            <span className="gx-sep-label">or</span>
            <span className="gx-sep-part" data-orientation="horizontal" />
          </div>
          <span className="gx-sep-word">Sign in with passkey</span>
        </div>
      </figure>
    </div>
  </div>
);

const separatorDemoSource = `import { Separator, Stack, Text } from "@gpuixui/primitives";

<Stack direction="column" gap="md">
  <Text role="h3">Account</Text>
  <Separator orientation="horizontal" />
  <Text role="body">Profile and sign-in details.</Text>
</Stack>;

// A vertical rule needs a bounded parent to stretch.
<Stack direction="row" gap="md" style={{ height: 64 }}>
  <Text role="body">Left</Text>
  <Separator orientation="vertical" />
  <Text role="body">Right</Text>
</Stack>;

// A centred caption sits between two rules.
<Separator orientation="horizontal" label="or" />;`;

export { separatorDemoSource };
