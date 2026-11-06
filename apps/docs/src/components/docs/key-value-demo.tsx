import { DEFAULT_LABEL_WIDTH, type KeyValueEntry } from "@gpuixui/data";
import { useState } from "react";

export interface LabelWidthChoice {
  readonly id: string;
  readonly label: string;

  readonly width: number;
}

const DEFAULT_CHOICE: LabelWidthChoice = {
  id: "default",
  label: `${DEFAULT_LABEL_WIDTH} (default)`,
  width: DEFAULT_LABEL_WIDTH,
};

export const WIDE_CHOICE: LabelWidthChoice = {
  id: "wide",
  label: "168",
  width: 168,
};

export const UNUSABLE_CHOICE: LabelWidthChoice = {
  id: "unusable",
  label: "NaN",
  width: Number.NaN,
};

export const LABEL_WIDTHS: ReadonlyArray<LabelWidthChoice> = [
  DEFAULT_CHOICE,
  WIDE_CHOICE,
  UNUSABLE_CHOICE,
];

export const labelTrack = (labelWidth: number = DEFAULT_LABEL_WIDTH): number =>
  Number.isFinite(labelWidth) && labelWidth > 0
    ? labelWidth
    : DEFAULT_LABEL_WIDTH;

export const FILE_ENTRIES: ReadonlyArray<KeyValueEntry> = [
  { key: "name", label: "Name", value: "harbour-chart.png" },
  { key: "kind", label: "Kind", value: "PNG image" },
  { key: "size", label: "Size", value: "1.4 MB" },
  { key: "dimensions", label: "Dimensions", value: "1920 × 1080" },
  { key: "modified", label: "Modified", value: "24 Oct 2026" },
];

export const trackReadout = (choice: LabelWidthChoice): string =>
  choice.id === "unusable"
    ? `label column ${labelTrack(choice.width)}px · NaN reads as the ${DEFAULT_LABEL_WIDTH}px default`
    : `label column ${labelTrack(choice.width)}px · every value begins at the track's edge`;

export function KeyValueDemo() {
  const [choice, setChoice] = useState<LabelWidthChoice>(DEFAULT_CHOICE);
  const track = labelTrack(choice.width);

  return (
    <div className="gx-data-scene">
      <div aria-label="File properties" className="gx-dkv" role="list">
        {FILE_ENTRIES.map((entry) => (
          <div className="gx-dkv-row" key={entry.key} role="listitem">
            <span className="gx-dkv-label" style={{ width: track }}>
              {entry.label}
            </span>
            <span className="gx-dkv-value">{entry.value}</span>
          </div>
        ))}
      </div>
      <div aria-label="Label column width" className="gx-data-row" role="group">
        {LABEL_WIDTHS.map((candidate) => (
          <button
            aria-pressed={candidate.id === choice.id}
            className="gx-btn gx-btn-sm gx-toggle"
            data-pressed={candidate.id === choice.id ? "" : undefined}
            key={candidate.id}
            onClick={() => setChoice(candidate)}
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <p className="gx-data-readout">{trackReadout(choice)}</p>
    </div>
  );
}

export const keyValueDemoSource = `import { KeyValue } from "@gpuixui/data";

// The label column is one fixed track. A width the layout cannot paint
// (NaN, zero, a negative) reads as the 120px default, so the values stay in
// one column instead of each starting after its own label.
<KeyValue
  labelWidth={120}
  entries={[
    { key: "name", label: "Name", value: "harbour-chart.png" },
    { key: "kind", label: "Kind", value: "PNG image" },
    { key: "size", label: "Size", value: "1.4 MB" },
  ]}
/>;`;
