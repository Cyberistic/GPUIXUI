import { Match } from "effect";

export interface PropertyObject {
  readonly name: string;
  readonly note: string;
  readonly tag: string;
  readonly owner: string;
}

export const PROPERTY_REST: PropertyObject = {
  name: "",
  note: "",
  tag: "internal",
  owner: "core",
};

export const PROPERTY_WIDE_LABEL = 200;

export const PROPERTY_IDS = {
  panel: "property-panel",
  wide: "property-panel-wide",
  readout: "property-readout",
} as const;

export const propertyField = (key: string): string => `property-${key}`;

export const propertyReadout = (object: PropertyObject): string =>
  `name=${object.name} note=${object.note} tag=${object.tag} owner=${object.owner}`;

export type PropertyFieldKey = "name" | "note";

export const PROPERTY_TYPED: Readonly<Record<PropertyFieldKey, string>> = {
  name: "Atlas",
  note: "v2",
};

export const withTyped = (
  object: PropertyObject,
  key: PropertyFieldKey,
): PropertyObject =>
  Match.value(key).pipe(
    Match.when("name", () => ({ ...object, name: PROPERTY_TYPED.name })),
    Match.when("note", () => ({ ...object, note: PROPERTY_TYPED.note })),
    Match.exhaustive,
  );

export const PROPERTY_CHECKS = 18;
