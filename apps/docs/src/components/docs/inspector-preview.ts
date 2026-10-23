/**
 * The property-inspector preview's model: one object, read four ways.
 *
 * `PropertyPanel`, `KeyValue` and `StatCard` own no copy of the object they
 * describe — every row is the caller's, an edit is a callback — so a preview, a
 * key-value table and a metric all repaint in the frame an edit lands, and an
 * action can move all three at once (`inspector-lifecycle` measured exactly
 * that in a window). A drawing can store the reading twice, keep a stale copy
 * in the card, or let `Reset` undo the edit as well as the size — none of which
 * is visible in a picture — so the rules live here and
 * `inspector-preview.test.ts` holds them to the probe's fixture.
 */

/** The object an inspector edits: a name, a free tag and a size. */
export interface InspectedObject {
  readonly name: string;
  readonly tag: string;
  readonly width: number;
  readonly height: number;
}

/** The object the preview opens on, and the one the window probe opens on. */
export const INSPECTED: InspectedObject = {
  name: "Alpha",
  tag: "",
  width: 120,
  height: 80,
};

/** The width the toolbar's `Wide` action gives the object. */
export const WIDE_WIDTH = 240;

/** The area the metric card totals. */
export const areaOf = (object: InspectedObject): number =>
  object.width * object.height;

/** The tag as the table prints it: no tag is a value (`none`), not a blank cell. */
export const tagValue = (tag: string): string => (tag === "" ? "none" : tag);

/** The size as one string, so the row and the preview cannot disagree. */
export const sizeValue = (object: InspectedObject): string =>
  `${object.width} x ${object.height}`;

/** The object a typed tag leaves — the editable row reports every keystroke. */
export const withTag = (
  object: InspectedObject,
  tag: string,
): InspectedObject => ({
  ...object,
  tag,
});

/** The object `Wide` leaves: the width moves and nothing else does. */
export const widen = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: WIDE_WIDTH,
});

/** What `Reset size` returns: the opening size, with the caller's edit kept. */
export const resetSize = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: INSPECTED.width,
  height: INSPECTED.height,
});

/** The preview's caption: the name, the tag once it has one, and the size. */
export const captionOf = (object: InspectedObject): string =>
  `${object.name}${object.tag === "" ? "" : ` #${object.tag}`} — ${sizeValue(object)}`;

/** One row of the property table. */
export interface InspectorRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

/** The rows every inspected object carries beside the four the probe reads. */
const staticRows: ReadonlyArray<InspectorRow> = [
  { key: "kind", label: "Kind", value: "Widget" },
  { key: "owner", label: "Owner", value: "Ada Lovelace" },
];

/**
 * The rows the panel paints for `object`.
 *
 * The four the probe reads by name come first: an inspector's edited value is
 * above the fold, and the static rows are context rather than the subject.
 */
export const propertyRows = (
  object: InspectedObject,
): ReadonlyArray<InspectorRow> => [
  { key: "name", label: "Name", value: object.name },
  { key: "tag", label: "Tag", value: tagValue(object.tag) },
  { key: "size", label: "Size", value: sizeValue(object) },
  { key: "area", label: "Area", value: `${areaOf(object)} px` },
  ...staticRows,
];
