/**
 * DiffViewer: two sources compared into a unified or split diff.
 *
 * The comparison is {@link diffLines} — a longest-common-subsequence walk that
 * reports the minimal edit script — and the viewer only paints it. An added
 * line tints the `success` soft role, a removed line the `destructive` soft
 * role, so a diff reads as change rather than as syntax.
 *
 * There is a native `<diff>` host that paints a *patch string*; this component
 * exists because its input is two strings, not a patch. The line diff is
 * computed here so a caller never has to serialise a patch to view a change.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { accessibleName } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import {
  statusTone,
  textStyle,
  type TextStyleProperties,
  type Theme,
} from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  diffStrings,
  modeOf,
  numberDiff,
  splitPairs,
  type DiffMode,
  type DiffRow,
} from "./logic.js";
import { recipeStyle } from "../internal/recipe.js";
import { draftOf } from "../internal/text.js";

export type { DiffMode } from "./logic.js";

/** The name a blank `label` falls back to. */
const DIFF_NAME = "Diff";

/** The viewer's resting surface. */
const DIFF_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-background";

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

/** The ink a line paints: the page ink, or the tone's readable role for a change. */
const lineColor = (theme: Theme, kind: DiffRow["kind"]): string =>
  kind === "context"
    ? theme.colors.foreground
    : statusTone(theme, kind === "added" ? "success" : "destructive")
        .foreground;

/** The tint a changed line paints behind its ink: the soft role of its tone. */
const lineTint = (theme: Theme, kind: DiffRow["kind"]): string | undefined =>
  kind === "context"
    ? undefined
    : statusTone(theme, kind === "added" ? "success" : "destructive")
        .background;

/** The line's full paint: the code type, the tint behind it and the ink on it. */
const lineStyle = (
  theme: Theme,
  metrics: TextStyleProperties,
  kind: DiffRow["kind"],
): StyleDesc => ({
  ...metrics,
  whiteSpace: "nowrap",
  color: lineColor(theme, kind),
  ...(lineTint(theme, kind) === undefined
    ? {}
    : { backgroundColor: lineTint(theme, kind) }),
});

/** The line number a row carries on one side, or a blank cell. */
const rowNumber = (number: Option.Option<number>): string =>
  Option.match(number, {
    onNone: () => "",
    onSome: (value) => String(value),
  });

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
  const name = accessibleName(label) ?? DIFF_NAME;
  const metrics = textStyle(theme, "codeBlock");
  // A view mode is a stored preference as often as a literal; a name this
  // release does not declare reads as the default rather than falling through
  // to the other layout.
  const view = modeOf(mode);
  // A side restored from a saved record may not be text at all; it reads as an
  // empty source, the rule the other editor surfaces follow through `draftOf`,
  // rather than throwing out of the line split before a row paints.
  const rows = numberDiff(diffStrings(draftOf(before), draftOf(after)));
  const changed = Arr.some(rows, (row) => row.kind !== "context");
  const state: DiffViewerState = { changed };
  const quiet = { ...metrics, color: theme.colors.mutedForeground };

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
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((row, index) => (
            <div
              key={index}
              testId={`${testId}-row-${index}`}
              style={mergeStyles(
                { display: "flex", flexDirection: "row" },
                lineStyle(theme, metrics, row.kind),
              )}
            >
              <text role="presentation" style={quiet}>
                {row.kind === "added"
                  ? "+"
                  : row.kind === "removed"
                    ? "-"
                    : " "}
              </text>
              {lineNumbers ? (
                <>
                  <text role="presentation" style={quiet}>
                    {rowNumber(row.before)}
                  </text>
                  <text role="presentation" style={quiet}>
                    {rowNumber(row.after)}
                  </text>
                </>
              ) : null}
              <text
                role="presentation"
                style={{
                  ...metrics,
                  color: lineColor(theme, row.kind),
                  whiteSpace: "nowrap",
                }}
              >
                {row.text}
              </text>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {splitPairs(rows).map((pair, index) => (
            <div
              key={index}
              testId={`${testId}-row-${index}`}
              style={{ display: "flex", flexDirection: "row" }}
            >
              {renderSide(
                theme,
                metrics,
                quiet,
                pair.left,
                "before",
                lineNumbers,
              )}
              {renderSide(
                theme,
                metrics,
                quiet,
                pair.right,
                "after",
                lineNumbers,
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * One side of a split row: its line number (on the side it names) and its line,
 * or a blank cell where that side has no line for the pair.
 */
const renderSide = (
  theme: Theme,
  metrics: TextStyleProperties,
  quiet: StyleDesc,
  row: Option.Option<DiffRow>,
  side: "before" | "after",
  lineNumbers: boolean,
) =>
  Option.match(row, {
    onNone: () => (
      <div
        style={{ flexGrow: 1, flexBasis: 0, minHeight: metrics.lineHeight }}
      />
    ),
    onSome: (value) => (
      <div
        style={{
          flexGrow: 1,
          flexBasis: 0,
          display: "flex",
          flexDirection: "row",
        }}
      >
        {lineNumbers ? (
          <text role="presentation" style={quiet}>
            {rowNumber(side === "before" ? value.before : value.after)}
          </text>
        ) : null}
        <text role="presentation" style={lineStyle(theme, metrics, value.kind)}>
          {value.text}
        </text>
      </div>
    ),
  });

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
  ],
  docs: "docs/diff-viewer.mdx",
  example: "examples/diff-viewer.example.tsx",
  testFile: "src/diff/logic.test.ts",
} as const;
