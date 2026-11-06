import type { SelectOption } from "@gpuixui/primitives";
import * as Arr from "effect/Array";

export type PropertyValue = string | number | boolean;

export interface PropertyRowBase {
  readonly key: string;

  readonly label: string;
}

export interface TextPropertyRow extends PropertyRowBase {
  readonly type: "text";
  readonly value: string;
}

export interface NumberPropertyRow extends PropertyRowBase {
  readonly type: "number";
  readonly value: number;

  readonly min?: number;

  readonly max?: number;

  readonly step?: number;
}

export interface BooleanPropertyRow extends PropertyRowBase {
  readonly type: "boolean";
  readonly value: boolean;
}

export interface SelectPropertyRow extends PropertyRowBase {
  readonly type: "select";
  readonly value: string;
  readonly options: ReadonlyArray<SelectOption>;
}

export type PropertyRow =
  | TextPropertyRow
  | NumberPropertyRow
  | BooleanPropertyRow
  | SelectPropertyRow;

export type PropertyRecord = Readonly<Record<string, PropertyValue>>;

export const isTextRow = (row: PropertyRow): row is TextPropertyRow =>
  row.type === "text";

export const isNumberRow = (row: PropertyRow): row is NumberPropertyRow =>
  row.type === "number";

export const isBooleanRow = (row: PropertyRow): row is BooleanPropertyRow =>
  row.type === "boolean";

export const isSelectRow = (row: PropertyRow): row is SelectPropertyRow =>
  row.type === "select";

const emptyRecord: PropertyRecord = {};

export const propertyRecord = (
  rows: ReadonlyArray<PropertyRow>,
): PropertyRecord =>
  Arr.reduce(rows, emptyRecord, (record, row) => ({
    ...record,
    [row.key]: row.value,
  }));

export const setProperty = (
  record: PropertyRecord,
  key: string,
  value: PropertyValue,
): PropertyRecord => ({ ...record, [key]: value });
