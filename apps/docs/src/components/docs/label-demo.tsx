/**
 * Browser preview for the Label page.
 *
 * `Label` is the visible name of a field, not the field itself, so the preview
 * shows the three paint states — plain, required and invalid — each with the
 * optional description line. The Code tab shows the native usage.
 */

export const LabelDemo = () => (
  <div className="gx-demo gx-demo-column gx-label-scene">
    <p className="gx-demo-label">States</p>
    <div className="gx-demo-row gx-label-row">
      <div className="gx-label-block">
        <span className="gx-label-name">Workspace name</span>
        <span className="gx-label-desc">Shown on invitations.</span>
      </div>
      <div className="gx-label-block">
        <span className="gx-label-name">
          Workspace name
          <span aria-hidden="true" className="gx-label-req">
            *
          </span>
        </span>
        <span className="gx-label-desc">A required marker, visual only.</span>
      </div>
      <div className="gx-label-block" data-invalid>
        <span className="gx-label-name">Workspace name</span>
        <span className="gx-label-desc">
          Invalid paints the name destructive.
        </span>
      </div>
    </div>
    <p className="gx-label-note">
      The label is not associated with a control by reference — the control
      carries its own <code>label</code> prop through{" "}
      <code>labelledBy(name)</code>.
    </p>
  </div>
);

const labelDemoSource = `import { Input, Label, labelledBy } from "@gpuixui/primitives";

const name = "Workspace name";
const help = "Shown on invitations and in the app switcher.";

<Label description={help}>{name}</Label>
<Input {...labelledBy(name)} description={help} fullWidth />;

// The visible name is written twice: here, and in the control's own prop.
<Label required>Workspace name</Label>;
<Label invalid>Workspace name</Label>;`;

export { labelDemoSource };
