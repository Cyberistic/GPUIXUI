export interface InspectedObject {
  readonly name: string;
  readonly tag: string;
  readonly width: number;
  readonly height: number;
}

export const INSPECTED: InspectedObject = {
  name: "Alpha",
  tag: "",
  width: 120,
  height: 80,
};

export const WIDE_WIDTH = 240;

export const areaOf = (object: InspectedObject): number =>
  object.width * object.height;

export const tagValue = (tag: string): string => (tag === "" ? "none" : tag);

export const sizeValue = (object: InspectedObject): string =>
  `${object.width} x ${object.height}`;

export const withTag = (
  object: InspectedObject,
  tag: string,
): InspectedObject => ({
  ...object,
  tag,
});

export const widen = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: WIDE_WIDTH,
});

export const resetSize = (object: InspectedObject): InspectedObject => ({
  ...object,
  width: INSPECTED.width,
  height: INSPECTED.height,
});

export const captionOf = (object: InspectedObject): string =>
  `${object.name}${object.tag === "" ? "" : ` #${object.tag}`} — ${sizeValue(object)}`;

export interface InspectorRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

const staticRows: ReadonlyArray<InspectorRow> = [
  { key: "kind", label: "Kind", value: "Widget" },
  { key: "owner", label: "Owner", value: "Ada Lovelace" },
];

export const propertyRows = (
  object: InspectedObject,
): ReadonlyArray<InspectorRow> => [
  { key: "name", label: "Name", value: object.name },
  { key: "tag", label: "Tag", value: tagValue(object.tag) },
  { key: "size", label: "Size", value: sizeValue(object) },
  { key: "area", label: "Area", value: `${areaOf(object)} px` },
  ...staticRows,
];
