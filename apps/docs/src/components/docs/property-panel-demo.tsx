import { useState } from "react";
import {
  areaOf,
  captionOf,
  INSPECTED,
  propertyRows,
  resetSize,
  sizeValue,
  tagValue,
  widen,
  withTag,
  type InspectedObject,
} from "./inspector-preview";

/**
 * Browser preview for the Property panels page.
 *
 * The shipped panel, list and card are three readers of one object the caller
 * owns: an editable row reports a change, and the preview, the key-value table
 * and the metric repaint in the same frame — the composition the
 * `inspector-lifecycle` probe measured. The drawing mirrors that contract with
 * HTML and says so; the Code tab shows the native composition.
 *
 * The rules live in `inspector-preview.ts` so a test can fail on them; this
 * file only renders them.
 */

/** One read-only row: the label column is fixed, so values line up. */
const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <>
    <dt className="gx-inspector-label">{label}</dt>
    <dd className="gx-inspector-value">{value}</dd>
  </>
);

/** The metric the card derives from the object, never a second copy of it. */
const Metric = ({ object }: { readonly object: InspectedObject }) => (
  <div className="gx-inspector-metric">
    <span className="gx-inspector-metric-label">Area</span>
    <span className="gx-inspector-metric-value">
      {areaOf(object)}
      <span className="gx-inspector-metric-unit">px²</span>
    </span>
    <span className="gx-inspector-metric-hint">
      width × height, derived from the object
    </span>
  </div>
);

export const PropertyPanelDemo = () => {
  const [object, setObject] = useState<InspectedObject>(INSPECTED);
  // The rows after the four the panel edits: the object's static context.
  const context = propertyRows(object).slice(4);

  return (
    <div aria-label="Property inspector" className="gx-inspector" role="group">
      <div className="gx-inspector-stage">
        <p className="gx-inspector-caption">{captionOf(object)}</p>
        <div aria-hidden="true" className="gx-inspector-arena">
          <div
            className="gx-inspector-box"
            style={{ width: object.width, height: object.height }}
          />
        </div>
        <p className="gx-inspector-stage-note">
          The preview reads the same width and height the table prints.
        </p>
      </div>

      <div className="gx-inspector-panel">
        <div className="gx-inspector-head">Properties</div>
        <dl className="gx-inspector-rows">
          <Row label="Name" value={object.name} />
          <dt className="gx-inspector-label">Tag</dt>
          <dd className="gx-inspector-value">
            <input
              aria-label="Tag"
              className="gx-field gx-inspector-input"
              onChange={(event) =>
                setObject(withTag(object, event.target.value))
              }
              placeholder="none"
              value={object.tag}
            />
          </dd>
          <Row label="Size" value={sizeValue(object)} />
          <Row label="Area" value={`${areaOf(object)} px`} />
          {context.map((row) => (
            <Row key={row.key} label={row.label} value={row.value} />
          ))}
        </dl>
        <div className="gx-inspector-actions">
          <button
            className="gx-btn gx-btn-secondary gx-btn-sm"
            onClick={() => setObject(widen(object))}
            type="button"
          >
            Wide
          </button>
          <button
            className="gx-btn gx-btn-ghost gx-btn-sm"
            onClick={() => setObject(resetSize(object))}
            type="button"
          >
            Reset size
          </button>
        </div>
      </div>

      <div className="gx-inspector-readout">
        <dl className="gx-inspector-rows">
          <Row label="Tag" value={tagValue(object.tag)} />
          <Row label="Size" value={sizeValue(object)} />
        </dl>
        <Metric object={object} />
      </div>
    </div>
  );
};

export const propertyPanelDemoSource = `import { KeyValue, PropertyPanel, StatCard } from "@gpuixui/data";
import { useState } from "react";

export const Inspector = () => {
  const [object, setObject] = useState({
    name: "Alpha",
    tag: "",
    width: 120,
    height: 80,
  });
  const area = object.width * object.height;

  return (
    <>
      {/* The preview: the object's own size, not a second copy of it. */}
      <div style={{ width: object.width, height: object.height }} />

      <PropertyPanel
        title="Properties"
        rows={[
          { kind: "readonly", key: "name", label: "Name", value: object.name },
          {
            kind: "editable",
            key: "tag",
            label: "Tag",
            value: object.tag,
            onChange: (tag) => setObject({ ...object, tag }),
          },
          {
            kind: "readonly",
            key: "size",
            label: "Size",
            value: \`\${object.width} x \${object.height}\`,
          },
        ]}
      />

      <KeyValue
        entries={[
          {
            key: "tag",
            label: "Tag",
            value: object.tag === "" ? "none" : object.tag,
          },
        ]}
      />

      <StatCard
        label="Area"
        value={\`\${area}\`}
        unit="px²"
        hint="width × height"
      />
    </>
  );
};`;
