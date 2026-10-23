/**
 * Browser preview for the Box page.
 *
 * `Box` is a container, not a control, so the preview is a labelled diagram: a
 * dashed outline around each surface with a caption naming its tone and the
 * facts it declares. The Code tab shows the native usage.
 */

const tones = [
  { tone: "card", label: "card" },
  { tone: "muted", label: "muted" },
  { tone: "accent", label: "accent" },
  { tone: "selected", label: "selected" },
] as const;

interface Fact {
  readonly label: string;
  readonly border?: boolean;
  readonly dashed?: boolean;
  readonly elevation?: boolean;
}

const facts: ReadonlyArray<Fact> = [
  { label: "border · radius md", border: true },
  { label: "elevation md", elevation: true },
  { label: "dashed border", dashed: true },
];

export const BoxDemo = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Tones</p>
      <div className="gx-layout-band">
        {tones.map((entry) => (
          <figure className="gx-layout-figure" key={entry.tone}>
            <figcaption className="gx-layout-tag">{entry.label}</figcaption>
            <div className="gx-box-part" data-tone={entry.tone} />
          </figure>
        ))}
      </div>
    </div>
    <div className="gx-layout-row">
      <p className="gx-layout-caption">Facts</p>
      <div className="gx-layout-band">
        {facts.map((entry) => (
          <figure className="gx-layout-figure" key={entry.label}>
            <figcaption className="gx-layout-tag">{entry.label}</figcaption>
            <div
              className="gx-box-part"
              data-border={entry.border ? "" : undefined}
              data-dashed={entry.dashed ? "" : undefined}
              data-elevation={entry.elevation ? "" : undefined}
              data-tone="card"
            />
          </figure>
        ))}
      </div>
    </div>
  </div>
);

const boxDemoSource = `import { Box } from "@gpuixui/primitives";

<Box tone="card" padding="md" radius="md" border>
  A surface with the card role.
</Box>;

<Box tone="muted" padding="md" radius="md" />;
<Box tone="accent" padding="md" radius="md" />;
<Box tone="selected" padding="md" radius="md" />;

<Box tone="card" padding="md" radius="md" border elevation="md" />;
<Box tone="card" padding="md" radius="md" border borderStyle="dashed" />;`;

export { boxDemoSource };
