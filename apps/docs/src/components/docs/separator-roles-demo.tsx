const Region = ({
  label,
  note,
  decorative,
}: {
  readonly label: string;
  readonly note: string;
  readonly decorative?: boolean;
}) => (
  <div className="gx-sep-region">
    <span className="gx-sep-word">{label}</span>
    <span
      className="gx-sep-part"
      data-decorative={decorative ? "" : undefined}
      data-orientation="horizontal"
      role={decorative ? undefined : "separator"}
    />
    <span className="gx-sep-label">{note}</span>
  </div>
);

export const SeparatorRoles = () => (
  <div className="gx-demo gx-demo-column gx-layout">
    <Region label="Account" note="semantic · announced" />
    <Region
      decorative
      label="Reset / Export"
      note="decorative · drawing only"
    />
    <div className="gx-sep-region gx-sep-region-row">
      <span className="gx-sep-word">Blog</span>
      <span
        className="gx-sep-part"
        data-orientation="vertical"
        role="separator"
      />
      <span className="gx-sep-word">Docs</span>
    </div>
  </div>
);

const separatorRolesSource = `import { Separator } from "@gpuixui/components/separator";

// A semantic rule is a separator node between two regions.
<Separator />;

// A decorative rule stays in the drawing and out of the tree.
<Separator decorative />;

// The axis is the caller's; a vertical rule needs a bounded row.
<Separator orientation="vertical" />;`;

export { separatorRolesSource };
