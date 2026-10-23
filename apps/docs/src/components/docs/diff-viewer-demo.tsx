import {
  diffStrings,
  numberDiff,
  splitPairs,
  type DiffRow,
} from "@gpuixui/editor/diff/logic";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useState } from "react";

/**
 * Browser preview for the Diff viewer page.
 *
 * The edit script, its line numbers and the split pairing are the package's own
 * `diff/logic`; the preview paints them in the platform theme's variables and
 * lets a reader switch the two modes the component offers. Only the paint is the
 * browser's — the rows are the diff the shipped viewer would draw.
 */

export const DIFF_MODE_ORDER = ["unified", "split"] as const;
export type DiffMode = (typeof DIFF_MODE_ORDER)[number];

export const DIFF_BEFORE = `export function total(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;

export const DIFF_AFTER = `export function total(items, tax) {
  const base = items.reduce((sum, item) => sum + item.price, 0);
  return base + tax;
}`;

/** The diff the page's two sources produce. */
export const diffRows = (): ReadonlyArray<DiffRow> =>
  numberDiff(diffStrings(DIFF_BEFORE, DIFF_AFTER));

const number = (value: Option.Option<number>): string =>
  Option.match(value, { onNone: () => "", onSome: (line) => String(line) });

const Unified = ({ rows }: { readonly rows: ReadonlyArray<DiffRow> }) => (
  <div className="gx-diff-table" role="presentation">
    {rows.map((row, index) => (
      <div className="gx-diff-row" data-kind={row.kind} key={index}>
        <span className="gx-diff-num">{number(row.before)}</span>
        <span className="gx-diff-num">{number(row.after)}</span>
        <span className="gx-diff-text">{row.text}</span>
      </div>
    ))}
  </div>
);

const Split = ({ rows }: { readonly rows: ReadonlyArray<DiffRow> }) => (
  <div className="gx-diff-table" role="presentation">
    {splitPairs(rows).map((pair, index) => (
      <div className="gx-diff-row gx-diff-pair" key={index}>
        <span className="gx-diff-num">
          {Option.match(pair.left, {
            onNone: () => "",
            onSome: (row) => number(row.before),
          })}
        </span>
        <span
          className="gx-diff-text"
          data-kind={Option.match(pair.left, {
            onNone: () => undefined,
            onSome: (row) => row.kind,
          })}
        >
          {Option.match(pair.left, {
            onNone: () => "",
            onSome: (row) => row.text,
          })}
        </span>
        <span className="gx-diff-num">
          {Option.match(pair.right, {
            onNone: () => "",
            onSome: (row) => number(row.after),
          })}
        </span>
        <span
          className="gx-diff-text"
          data-kind={Option.match(pair.right, {
            onNone: () => undefined,
            onSome: (row) => row.kind,
          })}
        >
          {Option.match(pair.right, {
            onNone: () => "",
            onSome: (row) => row.text,
          })}
        </span>
      </div>
    ))}
  </div>
);

export const DiffViewerDemo = () => {
  const [mode, setMode] = useState<DiffMode>("unified");
  const rows = diffRows();

  return (
    <div className="gx-demo-column gx-diff-demo">
      <div className="gx-diff-bar" role="group" aria-label="Diff mode">
        {DIFF_MODE_ORDER.map((option) => (
          <button
            aria-pressed={mode === option}
            className="gx-btn gx-btn-secondary gx-btn-sm"
            key={option}
            onClick={() => setMode(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="gx-diff" data-mode={mode}>
        {Match.value(mode).pipe(
          Match.when("unified", () => <Unified rows={rows} />),
          Match.when("split", () => <Split rows={rows} />),
          Match.exhaustive,
        )}
      </div>
      <p className="gx-diff-meta">{`${rows.length} rows · before ${DIFF_BEFORE.split("\n").length} lines · after ${DIFF_AFTER.split("\n").length} lines`}</p>
    </div>
  );
};

export const diffViewerDemoSource = `import { DiffViewer } from "@gpuixui/editor";

<DiffViewer before={before} after={after} mode="unified" />;`;
