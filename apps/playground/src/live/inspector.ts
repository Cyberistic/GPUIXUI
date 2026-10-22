/**
 * The property inspector `inspector-lifecycle` drives, and the rules a
 * workspace inspector owes.
 *
 * Tier 3's **property panels**, **key-value displays**, **data toolbars** and
 * **statistic cards**, and Tier 4's **inspector panels** and **property
 * editors**, are composition over primitives the runtime already provides: the
 * runtime cannot refuse a key-value row any more than it can refuse a toolbar.
 * What a window has to prove is the composition — one object read four ways (a
 * preview, a key-value table, a metric and a field), an edit that reaches all
 * of them without losing the text session, a toolbar action that moves all
 * three views, and an inspector pane that scrolls on its own while the pane
 * beside it holds still.
 *
 * The arithmetic lives here rather than in the view, so it is testable on a
 * host with no binding, as `table-filter.ts` and `table-columns.ts` are.
 */
import * as Arr from "effect/Array";

/** The object an inspector edits: a name, a free tag and a size. */
export interface InspectedObject {
  readonly name: string;
  readonly tag: string;
  readonly width: number;
  readonly height: number;
}

/** The object the probe opens on. */
export const INITIAL_OBJECT: InspectedObject = {
  name: "Alpha",
  tag: "",
  width: 120,
  height: 80,
};

/** The width the toolbar's `Wide` action gives the object. */
export const WIDE_WIDTH = 240;

/** The inspector pane's height, its toolbar's height and the height left to scroll. */
export const INSPECTOR_PANE_HEIGHT = 400;
export const INSPECTOR_TOOLBAR_HEIGHT = 40;
export const INSPECTOR_SCROLL_HEIGHT =
  INSPECTOR_PANE_HEIGHT - INSPECTOR_TOOLBAR_HEIGHT;

/** One property row's height, and the two column widths every row shares. */
export const INSPECTOR_ROW_HEIGHT = 26;
export const INSPECTOR_LABEL_WIDTH = 96;
export const INSPECTOR_VALUE_WIDTH = 120;

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
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

/** One row of the key-value table. */
export interface PropertyRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

/** The properties every inspected object carries, in the order they paint. */
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

/** The area the metric card totals. */
export const areaOf = (object: InspectedObject): number =>
  object.width * object.height;

/** The tag as the key-value table and the readout print it. */
export const tagValue = (tag: string): string => (tag === "" ? "none" : tag);

/** The size as one string, so the row and the preview cannot disagree. */
export const sizeValue = (object: InspectedObject): string =>
  `${object.width} x ${object.height}`;

/** The object an edit leaves. */
export const renameTag = (
  object: InspectedObject,
  tag: string,
): InspectedObject => ({ ...object, tag });

/** The object the toolbar's `Wide` action leaves. */
export const widen = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: WIDE_WIDTH,
});

/** The object the toolbar's reset leaves: the size returns, the edit stays. */
export const resetSize = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: INITIAL_OBJECT.width,
  height: INITIAL_OBJECT.height,
});

/**
 * Every row the inspector paints for `object`.
 *
 * The four rows the probe reads by name come first so they are above the fold;
 * the static rows below them are what makes the pane overflow its viewport, so
 * the scroll step measures a real scroll rather than a container that happens
 * to fit.
 */
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

/** Whether the property rows alone overflow the inspector's scroll viewport. */
export const overflowsInspector = (object: InspectedObject): boolean =>
  Arr.length(propertyRows(object)) * INSPECTOR_ROW_HEIGHT >
  INSPECTOR_SCROLL_HEIGHT;

/** The preview's caption: the name, the tag once it has one, and the size. */
export const previewCaption = (object: InspectedObject): string =>
  `${object.name}${object.tag === "" ? "" : ` #${object.tag}`} — ${sizeValue(object)}`;

/** The state line every check reads. */
export const inspectorReadout = (object: InspectedObject): string =>
  `object=${object.name} tag=${tagValue(object.tag)} width=${object.width} height=${object.height} area=${areaOf(object)}`;

/** The statistic card's one reading. */
export const metricReadout = (object: InspectedObject): string =>
  `area=${areaOf(object)}`;
