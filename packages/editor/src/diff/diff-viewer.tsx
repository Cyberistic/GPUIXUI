/** @jsxImportSource @gpuix/react */
/**
 * DiffViewer: two sources compared into a unified or split diff.
 *
 * The comparison is {@link diffLines} — a longest-common-subsequence walk that
 * reports the minimal edit script — and the viewer only paints it. A removed
 * line tints the `destructive` soft role, an added line the `success` soft role,
 * and a hunk heading the `muted` strip, so a diff reads as change rather than as
 * syntax.
 *
 * There is a native `<diff>` host that paints a *patch string*; this component
 * exists because its input is two strings, not a patch. The line diff is
 * computed here so a caller never has to serialise a patch to view a change.
 *
 * The rows are the logic module's data: `rows` pairs a removal with the
 * addition it became and adds a heading where a hunk skips lines; `pairs` is the
 * same script zipped across the split's divider. One row is one code line high
 * in both views, so switching modes moves no row and both sides of the split
 * sit on the same baseline.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import {
  statusTone,
  textStyle,
  type TextStyleProperties,
  type Theme,
} from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { Match } from "effect";
import * as Option from "effect/Option";
import {
  DEFAULT_CONTEXT,
  blocks,
  diffStrings,
  modeOf,
  numberDiff,
  pairs,
  rows,
  type DiffMode,
  type DiffRow,
  type RowKind,
  type SplitPair,
} from "./logic.js";
import { recipeStyle } from "../internal/recipe.js";
import { draftOf, labelOf } from "../internal/text.js";

export type { DiffMode } from "./logic.js";

/** The name a blank `label` falls back to. */
const DIFF_NAME = "Diff";

/** The viewer's resting surface. */
const DIFF_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-background";

/** A monospace digit's advance as a share of the code type size. */
const MONO_DIGIT = 0.6;

/** What the viewer tells a `style` callback. */
export interface DiffViewerState {
  readonly changed: boolean;
}

/** {@link DiffViewer} props. */
export interface DiffViewerProps {
  /** The before source. */
  readonly before: string;
  /** The after source. */
  readonly after: string;
  /** One merged column, or two side-by-side. Default `"unified"`; a stored name that is neither reads as the default. */
  readonly mode?: DiffMode;
  /** Unchanged rows kept either side of a change before the diff skips to a heading. Default `3`; a negative or non-numeric value reads as the default. */
  readonly contextLines?: number;
  /** Number the rows on both sides. Default `true`. */
  readonly lineNumbers?: boolean;
  /** The accessible name. Default `"Diff"`; a blank name reads as the default. */
  readonly label?: string;
  /** A Tailwind class string for the surface, joined after the recipe so it wins. */
  readonly className?: string;
  /** A style, or a function of `{ changed }`. */
  readonly style?: StateStyle<DiffViewerState>;
  readonly testId?: string;
}

/** The fill a row paints behind its ink, in the tone's soft role. */
const rowFill = (theme: Theme, kind: RowKind): string | undefined =>
  Match.value(kind).pipe(
    Match.when("added", () => statusTone(theme, "success").background),
    Match.when("removed", () => statusTone(theme, "destructive").background),
    Match.when("hunk", () => theme.colors.muted),
    Match.when("context", () => undefined),
    Match.exhaustive,
  );

/** The ink a row paints: the page ink, the tone's readable role, or the muted strip's. */
const rowInk = (theme: Theme, kind: RowKind): string =>
  Match.value(kind).pipe(
    Match.when("added", () => statusTone(theme, "success").foreground),
    Match.when("removed", () => statusTone(theme, "destructive").foreground),
    Match.when("hunk", () => theme.colors.mutedForeground),
    Match.when("context", () => theme.colors.foreground),
    Match.exhaustive,
  );

/** The line number a row carries on one side, or a blank cell. */
const rowNumber = (number: Option.Option<number>): string =>
  Option.match(number, {
    onNone: () => "",
    onSome: (value) => String(value),
  });

/** The marker a changed row carries in the unified gutter. */
const rowSign = (kind: RowKind): string =>
  Match.value(kind).pipe(
    Match.when("added", () => "+"),
    Match.when("removed", () => "-"),
    Match.when("hunk", () => " "),
    Match.when("context", () => " "),
    Match.exhaustive,
  );

/** The width a gutter needs for the widest number the script reaches. */
const gutterWidth = (
  theme: Theme,
  metrics: TextStyleProperties,
  lines: number,
): number =>
  Math.ceil(String(Math.max(1, lines)).length * metrics.fontSize * MONO_DIGIT) +
  theme.spacing.sm;

/** One code line's box: the fill spans the row, the code never wraps. */
const lineRow = (
  theme: Theme,
  metrics: TextStyleProperties,
  kind: RowKind,
): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  height: metrics.lineHeight,
  flexShrink: 0,
  backgroundColor: rowFill(theme, kind),
});

/** A gutter cell: right-aligned, quiet on context and readable on a tint. */
const gutterCell = (
  theme: Theme,
  metrics: TextStyleProperties,
  kind: RowKind,
  width: number,
): StyleDesc => ({
  ...metrics,
  width,
  flexShrink: 0,
  color:
    kind === "context" ? theme.colors.mutedForeground : rowInk(theme, kind),
  textAlign: "right",
  paddingRight: theme.spacing.xs,
});

/** A code cell: the row's ink, one line, no wrap. */
const codeCell = (
  theme: Theme,
  metrics: TextStyleProperties,
  kind: RowKind,
): StyleDesc => ({
  ...metrics,
  color: rowInk(theme, kind),
  whiteSpace: "nowrap",
  paddingRight: theme.spacing.sm,
});

/** The hunk heading a skip paints, across the whole sheet. */
const HunkHeading = ({
  heading,
  theme,
  metrics,
  testId,
}: {
  readonly heading: DiffRow;
  readonly theme: Theme;
  readonly metrics: TextStyleProperties;
  readonly testId: string;
}) => (
  <div
    testId={testId}
    style={{
      ...lineRow(theme, metrics, "hunk"),
      paddingLeft: theme.spacing.sm,
      paddingRight: theme.spacing.sm,
    }}
  >
    <text
      role="presentation"
      style={{ ...metrics, color: theme.colors.mutedForeground }}
    >
      {heading.text}
    </text>
  </div>
);

/** The merged column: a two-number gutter, a marker, then the line. */
const UnifiedRows = ({
  script,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  testId,
}: {
  readonly script: ReadonlyArray<DiffRow>;
  readonly theme: Theme;
  readonly metrics: TextStyleProperties;
  readonly numberWidth: number;
  readonly lineNumbers: boolean;
  readonly testId: string;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      overflowX: "scroll",
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    }}
  >
    {script.map((row, index) =>
      row.kind === "hunk" ? (
        <HunkHeading
          key={index}
          heading={row}
          theme={theme}
          metrics={metrics}
          testId={`${testId}-hunk-${index}`}
        />
      ) : (
        <div
          key={index}
          testId={`${testId}-row-${index}`}
          style={lineRow(theme, metrics, row.kind)}
        >
          <text
            role="presentation"
            style={{
              ...metrics,
              width: theme.spacing.md,
              flexShrink: 0,
              textAlign: "center",
              color: theme.colors.mutedForeground,
            }}
          >
            {rowSign(row.kind)}
          </text>
          {lineNumbers ? (
            <>
              <text
                role="presentation"
                style={gutterCell(theme, metrics, row.kind, numberWidth)}
              >
                {rowNumber(row.before)}
              </text>
              <text
                role="presentation"
                style={gutterCell(theme, metrics, row.kind, numberWidth)}
              >
                {rowNumber(row.after)}
              </text>
            </>
          ) : null}
          <text role="presentation" style={codeCell(theme, metrics, row.kind)}>
            {row.text}
          </text>
        </div>
      ),
    )}
  </div>
);

/** One side of the split: its own gutter, its own horizontal scroller. */
const SplitColumn = ({
  side,
  script,
  offset,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  testId,
}: {
  readonly side: "before" | "after";
  readonly script: ReadonlyArray<SplitPair>;
  readonly offset: number;
  readonly theme: Theme;
  readonly metrics: TextStyleProperties;
  readonly numberWidth: number;
  readonly lineNumbers: boolean;
  readonly testId: string;
}) => (
  <div
    testId={`${testId}-${side}`}
    style={{
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      overflowX: "scroll",
    }}
  >
    {script.map((pair, position) => {
      const row = side === "before" ? pair.left : pair.right;
      const index = offset + position;
      return (
        <div
          key={index}
          testId={`${testId}-row-${index}-${side}`}
          style={lineRow(
            theme,
            metrics,
            Option.match(row, {
              onNone: () => "context",
              onSome: (value) => value.kind,
            }),
          )}
        >
          {Option.match(row, {
            onNone: () => null,
            onSome: (value) => (
              <>
                {lineNumbers ? (
                  <text
                    role="presentation"
                    style={gutterCell(theme, metrics, value.kind, numberWidth)}
                  >
                    {rowNumber(side === "before" ? value.before : value.after)}
                  </text>
                ) : null}
                <text
                  role="presentation"
                  style={codeCell(theme, metrics, value.kind)}
                >
                  {value.text}
                </text>
              </>
            ),
          })}
        </div>
      );
    })}
  </div>
);

/** The two columns of one split block, divided by the input hairline. */
const SplitBlock = ({
  script,
  offset,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  testId,
}: {
  readonly script: ReadonlyArray<SplitPair>;
  readonly offset: number;
  readonly theme: Theme;
  readonly metrics: TextStyleProperties;
  readonly numberWidth: number;
  readonly lineNumbers: boolean;
  readonly testId: string;
}) => (
  <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}>
    <SplitColumn
      side="before"
      script={script}
      offset={offset}
      theme={theme}
      metrics={metrics}
      numberWidth={numberWidth}
      lineNumbers={lineNumbers}
      testId={testId}
    />
    <div
      testId={`${testId}-divider`}
      style={{
        width: theme.borderWidth.thin,
        flexShrink: 0,
        backgroundColor: theme.colors.border,
      }}
    />
    <SplitColumn
      side="after"
      script={script}
      offset={offset}
      theme={theme}
      metrics={metrics}
      numberWidth={numberWidth}
      lineNumbers={lineNumbers}
      testId={testId}
    />
  </div>
);

/** The side-by-side layout: headings span the sheet, rows share one baseline. */
const SplitRows = ({
  script,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  testId,
}: {
  readonly script: ReadonlyArray<SplitPair>;
  readonly theme: Theme;
  readonly metrics: TextStyleProperties;
  readonly numberWidth: number;
  readonly lineNumbers: boolean;
  readonly testId: string;
}) => {
  const [, sections] = Arr.mapAccum(
    blocks(script),
    0,
    (offset, block) =>
      [offset + Arr.length(block.pairs), { block, offset }] as const,
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.xs,
      }}
    >
      {sections.map(({ block, offset }, index) =>
        Option.match(block.heading, {
          onSome: (heading) => (
            <HunkHeading
              key={index}
              heading={heading}
              theme={theme}
              metrics={metrics}
              testId={`${testId}-hunk-${offset}`}
            />
          ),
          onNone: () => (
            <SplitBlock
              key={index}
              script={block.pairs}
              offset={offset}
              theme={theme}
              metrics={metrics}
              numberWidth={numberWidth}
              lineNumbers={lineNumbers}
              testId={testId}
            />
          ),
        }),
      )}
    </div>
  );
};

/**
 * A context window is a saved preference as often as a literal: a negative or
 * non-numeric value reads as the documented default rather than a silent zero.
 */
const contextOf = (value: number | undefined): number =>
  value === undefined || !Number.isFinite(value) || value < 0
    ? DEFAULT_CONTEXT
    : Math.floor(value);

/**
 * A unified or split diff between two sources.
 *
 * The rows are presentational runs (`role="presentation"`); the surface is a
 * `group` named by `label` and described by whether anything changed, so a
 * reader hears the scale of the change even though it cannot read the diffed
 * code.
 */
export const DiffViewer = ({
  before,
  after,
  mode = "unified",
  contextLines,
  lineNumbers = true,
  label,
  className,
  style,
  testId = "diff-viewer",
}: DiffViewerProps) => {
  const theme = useTheme();
  // The rows are presentational, so the group's name is the whole surface's
  // name: a blank one would publish a silent diff (a default covers only
  // `undefined`, and a saved or i18n label arrives empty).
  const name = labelOf(label, DIFF_NAME);
  const metrics = textStyle(theme, "codeBlock");
  // A view mode is a stored preference as often as a literal; a name this
  // release does not declare reads as the default rather than falling through
  // to the other layout.
  const view = modeOf(mode);
  // A side restored from a saved record may not be text at all; it reads as an
  // empty source, the rule the other editor surfaces follow through `draftOf`,
  // rather than throwing out of the line split before a row paints.
  const numbered = numberDiff(diffStrings(draftOf(before), draftOf(after)));
  const changed = Arr.some(numbered, (row) => row.kind !== "context");
  const state: DiffViewerState = { changed };
  const numberWidth = gutterWidth(theme, metrics, Arr.length(numbered));
  const context = contextOf(contextLines);

  return (
    <div
      role="group"
      aria-label={name}
      aria-description={changed ? "Changes were found" : "No changes"}
      testId={testId}
      style={mergeStyles(
        recipeStyle(cn(DIFF_ROOT, className), theme),
        resolveStyle(style, state),
      )}
    >
      {view === "unified" ? (
        <UnifiedRows
          script={rows(numbered, context)}
          theme={theme}
          metrics={metrics}
          numberWidth={numberWidth}
          lineNumbers={lineNumbers}
          testId={testId}
        />
      ) : (
        <SplitRows
          script={pairs(numbered, context)}
          theme={theme}
          metrics={metrics}
          numberWidth={numberWidth}
          lineNumbers={lineNumbers}
          testId={testId}
        />
      )}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` by the owning workstream. */
export const diffViewerMeta = {
  name: "Diff viewer",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the line diff is an LCS walk, `O(n·m)` in time and space, so very large files are slow",
    "no word-level diff: a changed line is a whole line, not the words inside it",
    "the diff rows are presentational runs, so a reader hears the change count, not the diffed text",
    "each split column scrolls its own horizontal overflow; the runtime has no sticky gutters, so a gutter travels with its column",
  ],
  docs: "docs/diff-viewer.mdx",
  example: "examples/diff-viewer.example.tsx",
  testFile: "src/diff/logic.test.ts",
} as const;
