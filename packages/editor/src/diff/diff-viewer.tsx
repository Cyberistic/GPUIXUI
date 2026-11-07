/** @jsxImportSource @gpuix/react */
import type { StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { Fragment, type ReactNode } from "react";
import {
  alpha,
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
  wordMarks,
  type DiffMode,
  type DiffRow,
  type RowKind,
  type SplitPair,
} from "./logic.js";
import { recipeStyle } from "../internal/recipe.js";
import { draftOf, labelOf } from "../internal/text.js";

export type { DiffMode } from "./logic.js";

const DIFF_NAME = "Diff";

const DIFF_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-background";

const MONO_DIGIT = 0.6;

export interface DiffViewerState {
  readonly changed: boolean;
}

export type DiffInk = "tone" | "code";

export interface DiffAnnotation {
  readonly line: number;

  readonly height: number;

  readonly content: ReactNode;
}

export interface DiffViewerProps {
  readonly before: string;

  readonly after: string;

  readonly mode?: DiffMode;

  readonly contextLines?: number;

  readonly lineNumbers?: boolean;

  readonly wordDiff?: boolean;

  readonly ink?: DiffInk;

  readonly annotations?: ReadonlyArray<DiffAnnotation>;

  readonly wrapColumns?: number;

  readonly firstLine?: { readonly before?: number; readonly after?: number };

  readonly label?: string;

  readonly className?: string;

  readonly style?: StateStyle<DiffViewerState>;
  readonly testId?: string;
}

const rowFill = (theme: Theme, kind: RowKind): string | undefined =>
  Match.value(kind).pipe(
    Match.when("added", () => statusTone(theme, "success").background),
    Match.when("removed", () => statusTone(theme, "destructive").background),
    Match.when("hunk", () => theme.colors.muted),
    Match.when("context", () => undefined),
    Match.exhaustive,
  );

const rowBar = (theme: Theme, kind: RowKind): StyleDesc =>
  kind === "added" || kind === "removed"
    ? {
        borderLeftWidth: theme.borderWidth.strong,
        borderColor: rowInk(theme, kind),
      }
    : {};

const rowInk = (theme: Theme, kind: RowKind): string =>
  Match.value(kind).pipe(
    Match.when("added", () => statusTone(theme, "success").foreground),
    Match.when("removed", () => statusTone(theme, "destructive").foreground),
    Match.when("hunk", () => theme.colors.mutedForeground),
    Match.when("context", () => theme.colors.foreground),
    Match.exhaustive,
  );

const rowNumber = (number: Option.Option<number>): string =>
  Option.match(number, {
    onNone: () => "",
    onSome: (value) => String(value),
  });

const rowSign = (kind: RowKind): string =>
  Match.value(kind).pipe(
    Match.when("added", () => "+"),
    Match.when("removed", () => "-"),
    Match.when("hunk", () => " "),
    Match.when("context", () => " "),
    Match.exhaustive,
  );

const gutterWidth = (
  theme: Theme,
  metrics: TextStyleProperties,
  lines: number,
): number =>
  Math.ceil(String(Math.max(1, lines)).length * metrics.fontSize * MONO_DIGIT) +
  theme.spacing.sm;

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

const codeCell = (
  theme: Theme,
  metrics: TextStyleProperties,
  kind: RowKind,
  ink: DiffInk = "tone",
): StyleDesc => ({
  ...metrics,
  color: ink === "code" && kind !== "hunk" ? theme.colors.foreground : rowInk(theme, kind),
  whiteSpace: "nowrap",
  paddingRight: theme.spacing.sm,
});

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

const markColor = (theme: Theme, kind: RowKind): string =>
  alpha(rowInk(theme, kind), 0.28);

const SplitColumn = ({
  side,
  script,
  offset,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  wordDiff,
  ink,
  annotations,
  wrapColumns,
  shift,
  testId,
}: {
  readonly wordDiff: boolean;
  readonly ink: DiffInk;
  readonly annotations: ReadonlyArray<DiffAnnotation>;
  readonly wrapColumns: number | undefined;
  readonly shift: number;
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
      const marks = Option.match(Option.all([pair.left, pair.right]), {
        onNone: () => undefined,
        onSome: ([left, right]) =>
          wordDiff && left.kind === "removed" && right.kind === "added"
            ? wordMarks(left.text, right.text)[side]
            : undefined,
      });
      const kindHere = Option.match(row, {
        onNone: (): RowKind => "context",
        onSome: (value) => value.kind,
      });
      const lengths = [pair.left, pair.right].map((cell) =>
        Option.match(cell, { onNone: () => 0, onSome: (value) => value.text.length }),
      );
      const rowLines =
        wrapColumns === undefined
          ? 1
          : Math.max(1, ...lengths.map((length) => Math.ceil(length / wrapColumns)));
      const afterLine = Option.flatMap(pair.right, (value) => value.after);
      const note = Option.match(afterLine, {
        onNone: () => undefined,
        onSome: (line) => annotations.find((item) => item.line === line),
      });
      return (
        <Fragment key={index}>
        <div
          testId={`${testId}-row-${index}-${side}`}
          style={{
            ...lineRow(theme, metrics, kindHere),
            height: metrics.lineHeight * rowLines,
            ...(ink === "code" ? rowBar(theme, kindHere) : {}),
            ...(ink === "code" && kindHere !== "context" && Option.isSome(row)
              ? { backgroundColor: alpha(rowInk(theme, kindHere), 0.13) }
              : {}),
          }}
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
                    {rowNumber(
                      Option.map(
                        side === "before" ? value.before : value.after,
                        (line) => line + shift,
                      ),
                    )}
                  </text>
                ) : null}
                <text
                  role="presentation"
                  highlight={
                    marks === undefined || marks.length === 0
                      ? undefined
                      : { ranges: [...marks.map(([from, to]) => [from, to] as [number, number])], color: markColor(theme, value.kind) }
                  }
                  style={{
                    ...codeCell(theme, metrics, value.kind, ink),
                    ...(wrapColumns === undefined
                      ? {}
                      : { whiteSpace: "normal", flexGrow: 1, flexBasis: 0, minWidth: 0 }),
                  }}
                >
                  {value.text}
                </text>
              </>
            ),
          })}
        </div>
        {note === undefined ? null : (
          <div
            testId={`${testId}-note-${note.line}-${side}`}
            style={{ height: note.height, flexShrink: 0 }}
          >
            {side === "after" ? note.content : null}
          </div>
        )}
        </Fragment>
      );
    })}
  </div>
);

const SplitBlock = ({
  script,
  offset,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  wordDiff,
  ink,
  annotations,
  wrapColumns,
  firstLine,
  testId,
}: {
  readonly wrapColumns: number | undefined;
  readonly firstLine: DiffViewerProps["firstLine"];
  readonly wordDiff: boolean;
  readonly ink: DiffInk;
  readonly annotations: ReadonlyArray<DiffAnnotation>;
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
      wordDiff={wordDiff}
      ink={ink}
      annotations={annotations}
      wrapColumns={wrapColumns}
      shift={(firstLine?.before ?? 1) - 1}
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
      wordDiff={wordDiff}
      ink={ink}
      annotations={annotations}
      wrapColumns={wrapColumns}
      shift={(firstLine?.after ?? 1) - 1}
      testId={testId}
    />
  </div>
);

const SplitRows = ({
  script,
  theme,
  metrics,
  numberWidth,
  lineNumbers,
  wordDiff,
  ink,
  annotations,
  wrapColumns,
  firstLine,
  testId,
}: {
  readonly wrapColumns: number | undefined;
  readonly firstLine: DiffViewerProps["firstLine"];
  readonly wordDiff: boolean;
  readonly ink: DiffInk;
  readonly annotations: ReadonlyArray<DiffAnnotation>;
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
              wordDiff={wordDiff}
              ink={ink}
              annotations={annotations}
              wrapColumns={wrapColumns}
              firstLine={firstLine}
              testId={testId}
            />
          ),
        }),
      )}
    </div>
  );
};

const contextOf = (value: number | undefined): number =>
  value === undefined || !Number.isFinite(value) || value < 0
    ? DEFAULT_CONTEXT
    : Math.floor(value);

export const DiffViewer = ({
  before,
  after,
  mode = "unified",
  contextLines,
  lineNumbers = true,
  wordDiff = true,
  ink = "tone",
  annotations = [],
  wrapColumns,
  firstLine,
  label,
  className,
  style,
  testId = "diff-viewer",
}: DiffViewerProps) => {
  const theme = useTheme();

  const name = labelOf(label, DIFF_NAME);
  const metrics = textStyle(theme, "codeBlock");

  const view = modeOf(mode);

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
          wordDiff={wordDiff}
          ink={ink}
          annotations={annotations}
          wrapColumns={wrapColumns}
          firstLine={firstLine}
          testId={testId}
        />
      )}
    </div>
  );
};

export const diffViewerMeta = {
  name: "Diff viewer",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the line diff is an LCS walk, `O(n·m)` in time and space, so very large files are slow",
    "word marks and annotations paint in split mode; unified mode shows whole lines",
    "the diff rows are presentational runs, so a reader hears the change count, not the diffed text",
    "each split column scrolls its own horizontal overflow; the runtime has no sticky gutters, so a gutter travels with its column",
  ],
  docs: "docs/diff-viewer.mdx",
  example: "examples/diff-viewer.example.tsx",
  testFile: "src/diff/logic.test.ts",
} as const;
