import {
  isBooleanRow,
  isNumberRow,
  isSelectRow,
  isTextRow,
  propertyRecord,
  setProperty,
  type PropertyRecord,
  type PropertyRow,
  type PropertyValue,
} from "@gpuixui/files/property/logic";
import {
  clampNumeric,
  normalizeNumberRange,
  scrubNumber,
  SCRUB_PIXELS_PER_STEP,
  SHIFT_SCRUB_SCALE,
} from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { Match } from "effect";
import { useRef, useState, type PointerEvent } from "react";

/**
 * Browser preview for the Property panels page.
 *
 * `@gpuixui/files`' `PropertyPanel` is a GPUix host tree, so the page cannot
 * mount it and this drawing is a labelled approximation. The panel owns no copy
 * of its object, and neither does the drawing: the record starts as
 * `propertyRecord(rows)`, every edit is `setProperty`, and the box beside the
 * panel repaints from the same record — which is the contract the page
 * describes.
 */

/** The values the preview opens with, one per kind the panel renders. */
const DEFAULTS = {
  name: "Sidebar",
  width: 240,
  visible: true,
  align: "left",
} as const;

/** The label column's width, the width the shipped panel defaults to. */
export const LABEL_WIDTH = 120;

/** The bounds a width row scrubs between, so a drag reaches both ends. */
export const WIDTH_MIN = 120;
export const WIDTH_MAX = 640;

/** The range a number row scrubs in: one step per count, clamped to its bounds. */
export const scrubRange = (min: number, max: number) =>
  normalizeNumberRange({ min, max, step: 1 });

/** The value a horizontal scrub reports — the package's own arithmetic. */
export const scrubValue = (
  start: number,
  travel: number,
  min: number | undefined,
  max: number | undefined,
  shift: boolean,
): number =>
  scrubNumber(
    start,
    travel,
    scrubRange(min ?? -Infinity, max ?? Infinity),
    SCRUB_PIXELS_PER_STEP,
    shift ? SHIFT_SCRUB_SCALE : 1,
  );

/** The rows the preview opens with: one of each kind the panel renders. */
export const PANEL_ROWS: ReadonlyArray<PropertyRow> = [
  { type: "text", key: "name", label: "Name", value: DEFAULTS.name },
  {
    type: "number",
    key: "width",
    label: "Width",
    value: DEFAULTS.width,
    min: WIDTH_MIN,
    max: WIDTH_MAX,
  },
  {
    type: "boolean",
    key: "visible",
    label: "Visible",
    value: DEFAULTS.visible,
  },
  {
    type: "select",
    key: "align",
    label: "Align",
    value: DEFAULTS.align,
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
  },
];

/** The record the rows describe. */
export const panelRecord = (): PropertyRecord => propertyRecord(PANEL_ROWS);

/** The value a row paints: the record's, which the panel keeps current. */
export const valueOf = (
  record: PropertyRecord,
  row: PropertyRow,
): PropertyValue => record[row.key] ?? row.value;

/** The text value of a row, for a field that only takes a string. */
export const textValueOf = (record: PropertyRecord, row: PropertyRow): string =>
  String(valueOf(record, row));

/** The number value of a row. */
export const numberValueOf = (
  record: PropertyRecord,
  row: PropertyRow,
): number => {
  const value = valueOf(record, row);
  return typeof value === "number" ? value : 0;
};

/** The readout under the frame: the whole record, key by key. */
export const recordReadout = (record: PropertyRecord): string =>
  Arr.join(
    Arr.map(
      Arr.sort(Arr.fromIterable(Object.keys(record)), Order.String),
      (key) => `${key}=${String(record[key])}`,
    ),
    " · ",
  );

/** The record's number for a key, or the default the row opened with. */
const numberField = (
  record: PropertyRecord,
  key: string,
  fallback: number,
): number => {
  const value = record[key];
  return typeof value === "number" ? value : fallback;
};

/** The record's text for a key, or the default the row opened with. */
const textField = (
  record: PropertyRecord,
  key: string,
  fallback: string,
): string => {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
};

/** The record's flag for a key, or the default the row opened with. */
const flagField = (
  record: PropertyRecord,
  key: string,
  fallback: boolean,
): boolean => {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
};

export interface PropertyPanelFrameProps {
  /** The rows to draw, controlled the way `PropertyPanel` takes them. */
  readonly rows: ReadonlyArray<PropertyRow>;
  /** The record the panel reads and reports. */
  readonly record: PropertyRecord;
  /** Receives the whole record after every edit. */
  readonly onChange: (record: PropertyRecord) => void;
}

/** The id a row's field carries, so its label can point at it. */
export const fieldId = (key: string): string => `gx-prop-${key}`;

/** One field, chosen by the row's own `type` — the panel's `Match`, in DOM. */
function Field({
  row,
  record,
  onChange,
}: {
  readonly row: PropertyRow;
  readonly record: PropertyRecord;
  readonly onChange: (record: PropertyRecord) => void;
}) {
  const id = fieldId(row.key);
  const edit = (value: PropertyValue): void =>
    onChange(setProperty(record, row.key, value));

  return Match.value(row).pipe(
    Match.when(isTextRow, (text) => (
      <input
        className="gx-props-field"
        id={id}
        onChange={(event) => edit(event.target.value)}
        type="text"
        value={textValueOf(record, text)}
      />
    )),
    Match.when(isNumberRow, (number) => (
      <input
        className="gx-props-field"
        id={id}
        inputMode="numeric"
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isFinite(parsed)) return;
          edit(
            clampNumeric(
              parsed,
              scrubRange(number.min ?? -Infinity, number.max ?? Infinity),
            ),
          );
        }}
        type="text"
        value={numberValueOf(record, number)}
      />
    )),
    Match.when(isBooleanRow, () => (
      <input
        checked={valueOf(record, row) === true}
        className="gx-props-switch"
        id={id}
        onChange={(event) => edit(event.target.checked)}
        type="checkbox"
      />
    )),
    Match.when(isSelectRow, (select) => (
      <select
        className="gx-props-field"
        id={id}
        onChange={(event) => edit(event.target.value)}
        value={textValueOf(record, select)}
      >
        {Arr.map(select.options, (option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )),
    Match.exhaustive,
  );
}

/** The label an inspector scrubs: a horizontal drag, Shift for a coarse one. */
export interface ScrubLabelProps {
  readonly htmlFor: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  /** Reports every frame of the drag, clamped to the row's bounds. */
  readonly onValueChange: (next: number) => void;
  readonly children: string;
}

/** The words a press drags; a click that does not travel still focuses the field. */
export function ScrubLabel({
  htmlFor,
  value,
  min,
  max,
  onValueChange,
  children,
}: ScrubLabelProps) {
  const drag = useRef<
    | { readonly pointerId: number; readonly x: number; readonly value: number }
    | undefined
  >(undefined);
  const end = (event: PointerEvent<HTMLLabelElement>): void => {
    if (drag.current?.pointerId === event.pointerId) drag.current = undefined;
  };

  return (
    <label
      className="gx-props-label gx-props-scrub"
      htmlFor={htmlFor}
      onPointerCancel={end}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          value,
        };
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (active === undefined || active.pointerId !== event.pointerId) {
          return;
        }
        onValueChange(
          scrubValue(
            active.value,
            event.clientX - active.x,
            min,
            max,
            event.shiftKey,
          ),
        );
      }}
      onPointerUp={end}
      style={{ width: LABEL_WIDTH }}
    >
      {children}
    </label>
  );
}

/** The drawing itself: the labelled rows and the object they describe. */
export function PropertyPanelFrame({
  rows,
  record,
  onChange,
}: PropertyPanelFrameProps) {
  return (
    <div className="gx-props">
      <div className="gx-props-panel">
        <div className="gx-props-head">Sidebar</div>
        <div className="gx-props-rows">
          {rows.map((row) => (
            <div className="gx-props-row" key={row.key}>
              {isNumberRow(row) ? (
                <ScrubLabel
                  htmlFor={fieldId(row.key)}
                  max={row.max}
                  min={row.min}
                  onValueChange={(next) =>
                    onChange(setProperty(record, row.key, next))
                  }
                  value={numberValueOf(record, row)}
                >
                  {row.label}
                </ScrubLabel>
              ) : (
                <label
                  className="gx-props-label"
                  htmlFor={fieldId(row.key)}
                  style={{ width: LABEL_WIDTH }}
                >
                  {row.label}
                </label>
              )}
              <Field onChange={onChange} record={record} row={row} />
            </div>
          ))}
        </div>
      </div>
      <div className="gx-props-stage">
        <div
          className="gx-props-box"
          data-align={textField(record, "align", DEFAULTS.align)}
          data-visible={
            flagField(record, "visible", DEFAULTS.visible) ? "true" : "false"
          }
          style={{ width: numberField(record, "width", DEFAULTS.width) }}
        >
          {textField(record, "name", DEFAULTS.name)}
        </div>
      </div>
    </div>
  );
}

/** The page's preview: the panel and the object it edits. */
export function FilesPropertyPanelDemo() {
  const [record, setRecord] = useState<PropertyRecord>(panelRecord);

  return (
    <div className="gx-demo-frame">
      <PropertyPanelFrame
        onChange={setRecord}
        record={record}
        rows={PANEL_ROWS}
      />
      <p className="gx-demo-readout">{recordReadout(record)}</p>
    </div>
  );
}

export const filesPropertyPanelDemoSource = `import { PropertyPanel, type PropertyRow } from "@gpuixui/files";
import { useState } from "react";

const rows: ReadonlyArray<PropertyRow> = [
  { type: "text", key: "name", label: "Name", value: "Sidebar" },
  { type: "number", key: "width", label: "Width", value: 240 },
  { type: "boolean", key: "visible", label: "Visible", value: true },
  {
    type: "select",
    key: "align",
    label: "Align",
    value: "left",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
    ],
  },
];

export function Inspector() {
  const [record, setRecord] = useState(() => ({ name: "Sidebar", width: 240 }));
  return <PropertyPanel title="Sidebar" rows={rows} onChange={setRecord} />;
}`;
