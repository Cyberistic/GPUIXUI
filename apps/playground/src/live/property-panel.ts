/**
 * The `property-panel-lifecycle` fixture: the shipped `@gpuixui/data`
 * `PropertyPanel` in a window.
 *
 * Tier 3's *Property panels* row cites `inspector-lifecycle`, whose inspector is
 * **composed in the probe** from primitives — no window had mounted the shipped
 * panel, addressed an editable row's field or measured the fixed label column
 * the panel's own header promises. The distinction the panel exists for is data:
 * an editable row carries its change and an editable one does not, so the probe
 * paints both kinds and presses the fields.
 *
 * The two editable rows start empty, so a typed value is the whole content of
 * the field and a caret that lands mid-string cannot pass as the same edit. The
 * wide panel is the label column's measurement: the same component with a
 * 200-point label column puts its value further right, so the column's width is
 * the prop rather than a painted constant.
 *
 * Native-free, so the premises are testable on a host with no binding.
 */
import { Match } from "effect";

/** The object the panels describe: two empty editable values and two read ones. */
export interface PropertyObject {
  readonly name: string;
  readonly note: string;
  readonly tag: string;
  readonly owner: string;
}

/** The object before any edit. */
export const PROPERTY_REST: PropertyObject = {
  name: "",
  note: "",
  tag: "internal",
  owner: "core",
};

/** The label column's width the wide panel asks for. */
export const PROPERTY_WIDE_LABEL = 200;

/** The ids the view and the steps share. */
export const PROPERTY_IDS = {
  panel: "property-panel",
  wide: "property-panel-wide",
  readout: "property-readout",
} as const;

/** An editable row's field: the component names it `property-<key>`. */
export const propertyField = (key: string): string => `property-${key}`;

/** What the readout publishes: the object every edit reports. */
export const propertyReadout = (object: PropertyObject): string =>
  `name=${object.name} note=${object.note} tag=${object.tag} owner=${object.owner}`;

/** The field a typed value lands in, by the row it edits. */
export type PropertyFieldKey = "name" | "note";

/** The text each field is typed into it, in the order the steps drive them. */
export const PROPERTY_TYPED: Readonly<Record<PropertyFieldKey, string>> = {
  name: "Atlas",
  note: "v2",
};

/**
 * The object after one field is typed into.
 *
 * `Match` over the field keeps the pair exhaustive: a third editable row added
 * to the scene without a typed value fails here rather than in a window.
 */
export const withTyped = (
  object: PropertyObject,
  key: PropertyFieldKey,
): PropertyObject =>
  Match.value(key).pipe(
    Match.when("name", () => ({ ...object, name: PROPERTY_TYPED.name })),
    Match.when("note", () => ({ ...object, note: PROPERTY_TYPED.note })),
    Match.exhaustive,
  );

/**
 * The checks the probe asserts.
 *
 * `box()` is one assertion site the steps read four times, so the run asserts
 * one more check per read after the first: the rest step reads three fields and
 * the edit step reads the first field again.
 */
export const PROPERTY_CHECKS = 18;
