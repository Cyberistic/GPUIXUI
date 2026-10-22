/**
 * The property panel's pure half: the rows that describe one object, and the
 * edit that changes one row without touching the rest.
 *
 * A row is discriminated by its `type` — text, number, boolean or select — so
 * the value's type rides with the row and the panel renders the right field
 * without a cast. {@link propertyRecord} folds the rows into the object a panel
 * reports; {@link setProperty} is the one-row edit that returns a new object,
 * leaving the source untouched.
 */

import type { SelectOption } from "@gpuixui/primitives";
import * as Arr from "effect/Array";

/** The values a property can hold. */
export type PropertyValue = string | number | boolean;

/** What every row carries. */
export interface PropertyRowBase {
  /** The stable identity a row is addressed by. */
  readonly key: string;
  /** The label the editor sits beside. */
  readonly label: string;
}

/** A text row. */
export interface TextPropertyRow extends PropertyRowBase {
  readonly type: "text";
  readonly value: string;
}

/** A number row. */
export interface NumberPropertyRow extends PropertyRowBase {
  readonly type: "number";
  readonly value: number;
}

/** A boolean row. */
export interface BooleanPropertyRow extends PropertyRowBase {
  readonly type: "boolean";
  readonly value: boolean;
}

/** A select row: one choice from its options. */
export interface SelectPropertyRow extends PropertyRowBase {
  readonly type: "select";
  readonly value: string;
  readonly options: ReadonlyArray<SelectOption>;
}

/** One row of a property panel. */
export type PropertyRow =
  | TextPropertyRow
  | NumberPropertyRow
  | BooleanPropertyRow
  | SelectPropertyRow;

/** The object a panel edits: a key to its value. */
export type PropertyRecord = Readonly<Record<string, PropertyValue>>;

/** Whether a row is a text row. */
export const isTextRow = (row: PropertyRow): row is TextPropertyRow =>
  row.type === "text";

/** Whether a row is a number row. */
export const isNumberRow = (row: PropertyRow): row is NumberPropertyRow =>
  row.type === "number";

/** Whether a row is a boolean row. */
export const isBooleanRow = (row: PropertyRow): row is BooleanPropertyRow =>
  row.type === "boolean";

/** Whether a row is a select row. */
export const isSelectRow = (row: PropertyRow): row is SelectPropertyRow =>
  row.type === "select";

/** An empty record, typed so the fold below keeps its index signature. */
const emptyRecord: PropertyRecord = {};

/** The record the rows describe; a duplicated key keeps its last row's value. */
export const propertyRecord = (
  rows: ReadonlyArray<PropertyRow>,
): PropertyRecord =>
  Arr.reduce(rows, emptyRecord, (record, row) => ({
    ...record,
    [row.key]: row.value,
  }));

/**
 * The record with one key set to a value.
 *
 * The returned record is a new object; the source is never mutated, so a panel
 * editing one row cannot corrupt the object its neighbours still read.
 */
export const setProperty = (
  record: PropertyRecord,
  key: string,
  value: PropertyValue,
): PropertyRecord => ({ ...record, [key]: value });
