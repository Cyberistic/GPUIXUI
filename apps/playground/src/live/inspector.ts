import * as Arr from "effect/Array";

export interface InspectedObject {
  readonly name: string;
  readonly tag: string;
  readonly width: number;
  readonly height: number;
}

export const INITIAL_OBJECT: InspectedObject = {
  name: "Alpha",
  tag: "",
  width: 120,
  height: 80,
};

export const WIDE_WIDTH = 240;

export const INSPECTOR_PANE_HEIGHT = 400;
export const INSPECTOR_TOOLBAR_HEIGHT = 40;
export const INSPECTOR_SCROLL_HEIGHT =
  INSPECTOR_PANE_HEIGHT - INSPECTOR_TOOLBAR_HEIGHT;

export const INSPECTOR_ROW_HEIGHT = 26;
export const INSPECTOR_LABEL_WIDTH = 96;
export const INSPECTOR_VALUE_WIDTH = 120;

export const INSPECTOR_IDS = {
  probe: "inspector-probe",
  readout: "inspector-readout",
  split: "inspector-split-row",
  preview: "inspector-preview",
  previewCaption: "inspector-preview-caption",
  previewBox: "inspector-preview-box",
  scroll: "inspector-scroll",
  toolbar: "inspector-toolbar",
  wide: "inspector-wide",
  reset: "inspector-reset",
  metric: "inspector-metric",
  metricValue: "inspector-metric-value",
  tagField: "inspector-tag-field",
  labelCell: (key: string): string => `inspector-label-${key}`,
  valueCell: (key: string): string => `inspector-value-cell-${key}`,
  value: (key: string): string => `inspector-value-${key}`,
} as const;

export interface PropertyRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

const STATIC_ROWS = [
  { key: "kind", label: "Kind", value: "Widget" },
  { key: "owner", label: "Owner", value: "Ada Lovelace" },
  { key: "updated", label: "Updated", value: "2026-10-22" },
  { key: "folder", label: "Folder", value: "workspace/assets" },
  { key: "format", label: "Format", value: "PNG" },
  { key: "permissions", label: "Permissions", value: "rw-r--r--" },
  { key: "checksum", label: "Checksum", value: "9f8e7d6c" },
  { key: "revision", label: "Revision", value: "12" },
  { key: "created", label: "Created", value: "2026-10-01" },
  { key: "modified", label: "Modified", value: "2026-10-22" },
  { key: "source", label: "Source", value: "design/alpha.svg" },
  { key: "license", label: "License", value: "Internal" },
  { key: "language", label: "Language", value: "en" },
  { key: "encoding", label: "Encoding", value: "UTF-8" },
  { key: "visibility", label: "Visibility", value: "Team" },
  { key: "retention", label: "Retention", value: "90 days" },
  { key: "backup", label: "Backup", value: "Nightly" },
  { key: "version", label: "Version", value: "3" },
  { key: "storage", label: "Storage", value: "local" },
  { key: "region", label: "Region", value: "eu-west" },
  { key: "project", label: "Project", value: "Atlas" },
  { key: "collection", label: "Collection", value: "Assets" },
  { key: "tags", label: "Tags", value: "ui, alpha" },
  { key: "reference", label: "Reference", value: "A-12" },
  { key: "notes", label: "Notes", value: "Draft" },
  { key: "archived", label: "Archived", value: "no" },
] as const satisfies ReadonlyArray<PropertyRow>;

export const areaOf = (object: InspectedObject): number =>
  object.width * object.height;

export const tagValue = (tag: string): string => (tag === "" ? "none" : tag);

export const sizeValue = (object: InspectedObject): string =>
  `${object.width} x ${object.height}`;

export const renameTag = (
  object: InspectedObject,
  tag: string,
): InspectedObject => ({ ...object, tag });

export const widen = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: WIDE_WIDTH,
});

export const resetSize = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: INITIAL_OBJECT.width,
  height: INITIAL_OBJECT.height,
});

export const propertyRows = (
  object: InspectedObject,
): ReadonlyArray<PropertyRow> =>
  Arr.appendAll(
    [
      { key: "name", label: "Name", value: object.name },
      { key: "tag", label: "Tag", value: tagValue(object.tag) },
      { key: "size", label: "Size", value: sizeValue(object) },
      { key: "area", label: "Area", value: `${areaOf(object)} px` },
    ],
    STATIC_ROWS,
  );

export const overflowsInspector = (object: InspectedObject): boolean =>
  Arr.length(propertyRows(object)) * INSPECTOR_ROW_HEIGHT >
  INSPECTOR_SCROLL_HEIGHT;

export const previewCaption = (object: InspectedObject): string =>
  `${object.name}${object.tag === "" ? "" : ` #${object.tag}`} — ${sizeValue(object)}`;

export const inspectorReadout = (object: InspectedObject): string =>
  `object=${object.name} tag=${tagValue(object.tag)} width=${object.width} height=${object.height} area=${areaOf(object)}`;

export const metricReadout = (object: InspectedObject): string =>
  `area=${areaOf(object)}`;
