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
 * Every surface is its component's own: `PropertyPanel`'s panel and header
 * (`SURFACE_PANEL`/`SURFACE_HEADER`), `KeyValue`'s fixed label track, and
 * `StatCard`'s label/reading/hint column. The rules live in
 * `inspector-preview.ts` so a test can fail on them; this file only renders
 * them.
 */

/** The label column's width, the track the probe's fixture names. */
const LABEL_WIDTH = 96;

/** One read-only row: the label column is fixed, so values line up. */
const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <div className="gx-dkv-row" role="listitem">
    <span className="gx-dkv-label" style={{ width: LABEL_WIDTH }}>
      {label}
    </span>
    <span className="gx-dkv-value">{value}</span>
  </div>
);

/** The metric the card derives from the object, never a second copy of it. */
const Metric = ({ object }: { readonly object: InspectedObject }) => (
  <div aria-label="Area" className="gx-dstat" role="group">
    <span className="gx-dstat-label">Area</span>
    <span className="gx-dstat-reading">
      <span className="gx-dstat-value">{areaOf(object)}</span>
      <span className="gx-dstat-hint">px²</span>
    </span>
    <span className="gx-dstat-hint">width × height</span>
  </div>
);

export const PropertyPanelDemo = () => {
  const [object, setObject] = useState<InspectedObject>(INSPECTED);
  // The rows after the four the panel edits: the object's static context.
  const context = propertyRows(object).slice(4);

  return (
    <div aria-label="Property inspector" className="gx-data-scene" role="group">
      <div className="gx-data-row">
        <div className="gx-dpanel gx-inspector-stage">
          <div className="gx-dpanel-head">
            <span className="gx-dpanel-title">{captionOf(object)}</span>
          </div>
          <div aria-hidden="true" className="gx-inspector-arena">
            <div
              className="gx-inspector-box"
              style={{ width: object.width, height: object.height }}
            />
          </div>
        </div>

        <div className="gx-dpanel gx-inspector-panel">
          <div className="gx-dpanel-head">
            <span className="gx-dpanel-title">Properties</span>
          </div>
          <div className="gx-dpanel-body">
            <div aria-label="Properties" className="gx-dkv" role="list">
              <Row label="Name" value={object.name} />
              <div className="gx-dkv-row" role="listitem">
                <span className="gx-dkv-label" style={{ width: LABEL_WIDTH }}>
                  Tag
                </span>
                <label className="gx-dfield gx-dfield-sm gx-dkv-value">
                  <input
                    aria-label="Tag"
                    onChange={(event) =>
                      setObject(withTag(object, event.target.value))
                    }
                    placeholder="none"
                    value={object.tag}
                  />
                </label>
              </div>
              <Row label="Size" value={sizeValue(object)} />
              <Row label="Area" value={`${areaOf(object)} px`} />
              {context.map((row) => (
                <Row key={row.key} label={row.label} value={row.value} />
              ))}
            </div>
          </div>
          <div className="gx-data-row gx-inspector-actions">
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
      </div>

      <div className="gx-data-row">
        <div className="gx-dpanel gx-inspector-readout">
          <div aria-label="Selection" className="gx-dkv" role="list">
            <Row label="Tag" value={tagValue(object.tag)} />
            <Row label="Size" value={sizeValue(object)} />
          </div>
        </div>
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
