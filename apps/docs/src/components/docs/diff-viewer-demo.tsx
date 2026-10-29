import {
  blocks,
  diffStrings,
  numberDiff,
  pairs,
  rows,
  DEFAULT_CONTEXT,
  type DiffRow,
  type SplitPair,
} from "@gpuixui/editor/diff/logic";
import * as Option from "effect/Option";
import { useState } from "react";

/**
 * Browser preview for the Diff viewer page.
 *
 * The hunks, the unified row order and the split pairing are the package's own
 * `diff/logic`; the preview paints them in the platform theme's variables and
 * lets a reader switch the two modes the component offers. Only the paint is the
 * browser's — the rows are the diff the shipped viewer would draw, including the
 * hunk heading the sample earns and the paired change at the divider.
 */

export const DIFF_MODE_ORDER = ["unified", "split"] as const;
export type DiffMode = (typeof DIFF_MODE_ORDER)[number];

export const DIFF_BEFORE = `import { clamp } from "./math";

/** A cart's order total, before tax. */
export function total(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

/** A line total, rounded to cents. */
export function lineTotal(item) {
  return Math.round(item.price * item.quantity * 100) / 100;
}

/** Every line under a discount. */
export function discounted(items, rate) {
  return items.map((item) => ({
    ...item,
    price: item.price * (1 - rate)
  }));
}

export const CURRENCY = "USD";`;

export const DIFF_AFTER = `import { clamp } from "./math";

/** A cart's order total, with tax. */
export function total(items, tax) {
  const base = items.reduce((sum, item) => sum + item.price, 0);
  return base + tax;
}

/** A line total, rounded to cents. */
export function lineTotal(item) {
  return Math.round(item.price * item.quantity * 100) / 100;
}

/** Every line under a discount. */
export function discounted(items, rate) {
  return items.map((item) => ({
    ...item,
    price: clamp(item.price * (1 - rate), 0, item.price)
  }));
}

export const CURRENCY = "USD";`;

/** The diff the page's two sources produce. */
export const diffRows = (): ReadonlyArray<DiffRow> =>
  numberDiff(diffStrings(DIFF_BEFORE, DIFF_AFTER));

const number = (value: Option.Option<number>): string =>
  Option.match(value, { onNone: () => "", onSome: (line) => String(line) });

const Line = ({
  row,
  side,
}: {
  readonly row: Option.Option<DiffRow>;
  readonly side?: "before" | "after";
}) =>
  Option.match(row, {
    onNone: () => <div className="gx-diff-line" />,
    onSome: (value) => (
      <div className="gx-diff-line" data-kind={value.kind}>
        {side === undefined ? null : (
          <span className="gx-diff-num">
            {number(side === "before" ? value.before : value.after)}
          </span>
        )}
        <span className="gx-diff-text">{value.text}</span>
      </div>
    ),
  });

const Hunk = ({ heading }: { readonly heading: DiffRow }) => (
  <div className="gx-diff-line gx-diff-hunk" data-kind="hunk">
    <span className="gx-diff-text">{heading.text}</span>
  </div>
);

const Unified = ({ script }: { readonly script: ReadonlyArray<DiffRow> }) => (
  <div className="gx-diff-unified" role="presentation">
    {script.map((row, index) =>
      row.kind === "hunk" ? (
        <Hunk heading={row} key={index} />
      ) : (
        <div className="gx-diff-line" data-kind={row.kind} key={index}>
          <span className="gx-diff-sign">
            {row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}
          </span>
          <span className="gx-diff-num">{number(row.before)}</span>
          <span className="gx-diff-num">{number(row.after)}</span>
          <span className="gx-diff-text">{row.text}</span>
        </div>
      ),
    )}
  </div>
);

const Side = ({
  side,
  script,
}: {
  readonly side: "before" | "after";
  readonly script: ReadonlyArray<SplitPair>;
}) => (
  <div className={`gx-diff-side gx-diff-side-${side}`}>
    {script.map((pair, index) => (
      <Line
        row={side === "before" ? pair.left : pair.right}
        side={side}
        key={index}
      />
    ))}
  </div>
);

const Split = ({ script }: { readonly script: ReadonlyArray<SplitPair> }) => (
  <div className="gx-diff-split" role="presentation">
    {blocks(script).map((block, index) =>
      Option.match(block.heading, {
        onSome: (heading) => <Hunk heading={heading} key={index} />,
        onNone: () => (
          <div className="gx-diff-cols" key={index}>
            <Side side="before" script={block.pairs} />
            <div className="gx-diff-divider" />
            <Side side="after" script={block.pairs} />
          </div>
        ),
      }),
    )}
  </div>
);

export const DiffViewerDemo = ({
  initialMode = "unified",
}: {
  readonly initialMode?: DiffMode;
} = {}) => {
  const [mode, setMode] = useState<DiffMode>(initialMode);
  const numbered = diffRows();

  return (
    <div className="gx-demo-column gx-diff-demo">
      <div className="gx-tgroup" role="group" aria-label="Diff mode">
        {DIFF_MODE_ORDER.map((option) => (
          <button
            aria-pressed={mode === option}
            className="gx-btn gx-btn-ghost gx-btn-sm gx-toggle"
            data-pressed={mode === option ? "" : undefined}
            key={option}
            onClick={() => setMode(option)}
            type="button"
          >
            {option === "unified" ? "Unified" : "Split"}
          </button>
        ))}
      </div>
      <div className="gx-diff" data-mode={mode}>
        {mode === "unified" ? (
          <Unified script={rows(numbered, DEFAULT_CONTEXT)} />
        ) : (
          <Split script={pairs(numbered, DEFAULT_CONTEXT)} />
        )}
      </div>
      <p className="gx-diff-meta">{`${numbered.length} rows · before ${DIFF_BEFORE.split("\n").length} lines · after ${DIFF_AFTER.split("\n").length} lines`}</p>
    </div>
  );
};

export const diffViewerDemoSource = `import { DiffViewer } from "@gpuixui/editor";

<DiffViewer before={before} after={after} mode="unified" />;`;
