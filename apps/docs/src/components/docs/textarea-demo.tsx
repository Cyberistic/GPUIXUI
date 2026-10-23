/**
 * Browser preview for the TextArea page.
 *
 * `TextArea` is `Input`'s multi-line sibling, so the preview draws the shared
 * field chrome on a `textarea` with the resting, invalid and disabled paint.
 * The Code tab shows the native usage.
 */

export const TextAreaDemo = () => (
  <div className="gx-demo gx-demo-column gx-input-scene">
    <div className="gx-input-block">
      <label className="gx-input-label" htmlFor="gx-textarea-demo-notes">
        Description
      </label>
      <textarea
        className="gx-field gx-textarea-field"
        defaultValue={"Markdown is not interpreted.\nType a plain note."}
        id="gx-textarea-demo-notes"
        rows={3}
      />
      <span className="gx-input-help">Markdown is not interpreted.</span>
    </div>
    <div className="gx-input-block">
      <label className="gx-input-label" htmlFor="gx-textarea-demo-invalid">
        Release notes
      </label>
      <textarea
        className="gx-field gx-textarea-field gx-input-invalid"
        defaultValue=""
        id="gx-textarea-demo-invalid"
        placeholder="One line at least"
        rows={2}
      />
      <span className="gx-input-error">Release notes cannot be empty.</span>
    </div>
  </div>
);

const textareaDemoSource = `import { Label, TextArea, labelledBy } from "@gpuixui/primitives";

const notes = "Description";
const help = "Markdown is not interpreted.";

<Label description={help}>{notes}</Label>
<TextArea
  {...labelledBy(notes)}
  description={help}
  value={value}
  onValueChange={setValue}
  minRows={3}
  maxRows={8}
  fullWidth
/>;

<TextArea invalid label="Release notes" placeholder="One line at least" />;`;

export { textareaDemoSource };
