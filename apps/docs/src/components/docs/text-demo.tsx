/**
 * Browser preview for the Text page.
 *
 * `Text` is one run of type, not a control, so the preview is a labelled
 * diagram: a dashed outline around each run with a caption naming its role and
 * tone. The Code tab shows the native usage.
 */

const roles = [
  { role: "h2", label: "h2", sample: "Version 0.11.0" },
  { role: "bodyStrong", label: "bodyStrong", sample: "A lead sentence." },
  { role: "body", label: "body", sample: "Running text in the default tone." },
  { role: "code", label: "code", sample: "nub add @gpuixui/primitives" },
] as const;

const tones = [
  { tone: "default", label: "default" },
  { tone: "muted", label: "muted" },
  { tone: "primary", label: "primary" },
  { tone: "destructive", label: "destructive" },
] as const;

export const TextDemo = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Roles</p>
      <div className="gx-layout-band">
        {roles.map((entry) => (
          <figure
            className="gx-layout-figure gx-layout-figure-wide"
            key={entry.role}
          >
            <figcaption className="gx-layout-tag">{entry.label}</figcaption>
            <span className="gx-text-part" data-role={entry.role}>
              {entry.sample}
            </span>
          </figure>
        ))}
      </div>
    </div>
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Tones</p>
      <div className="gx-layout-band">
        {tones.map((entry) => (
          <figure className="gx-layout-figure" key={entry.tone}>
            <figcaption className="gx-layout-tag">{entry.label}</figcaption>
            <span
              className="gx-text-part"
              data-role="body"
              data-tone={entry.tone}
            >
              Released 17 Oct.
            </span>
          </figure>
        ))}
      </div>
    </div>
  </div>
);

const textDemoSource = `import { Text, Stack } from "@gpuixui/primitives";

<Stack direction="column" gap="2xs">
  <Text role="h2">Version 0.11.0</Text>
  <Text role="body" tone="muted">
    Released 17 October 2026.
  </Text>
  <Text role="code">nub add @gpuixui/primitives</Text>
</Stack>;

// The tone decides the colour role, the role decides the type scale.
<Text role="body" tone="primary">An action's name</Text>;
<Text role="body" tone="destructive">A failed check</Text>;`;

export { textDemoSource };
