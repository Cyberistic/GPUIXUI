/**
 * HighlightText: a phrase with a marker wash that sweeps across its matches.
 *
 * The wash is the runtime's own `highlight` — a paint behind the text, not a
 * coloured copy of it — so the glyphs stay the theme's body colour and the mark
 * is a quad the paint layer draws. `@gpuix/native@0.11.0` has no animated
 * `highlight`, so the component owns the sweep: it reveals the ranges a code
 * point at a time, and a mark grows as one range rather than a run of quads
 * (abutting translucent quads show their seams).
 *
 * The default wash is the theme's `findHighlight` pair — the colours
 * `@gpuixui/tokens` derives from `primary` so the matched text keeps the body
 * floor — with the active mark painted at the stronger share. The reveal is a
 * real-time timer, so a paused renderer clock does not hold it.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useMemo, useState } from "react";
import {
  hostRanges,
  marksFor,
  stepOf,
  sweepLength,
  sweptRanges,
  type Range,
} from "./highlight-text/logic.js";
import { washFor } from "./highlight-text/wash.js";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";

/** What a highlight draws at one frame. */
export interface HighlightTextState {
  readonly text: string;
  /** How many code points of the marks are painted. */
  readonly revealed: number;
  /** How many code points every mark spans. */
  readonly total: number;
  readonly complete: boolean;
  readonly reducedMotion: boolean;
}

/** {@link HighlightText} props. */
export interface HighlightTextProps extends Omit<Props, "children" | "style"> {
  /** The phrase to paint. */
  readonly text: string;
  /** The substring to mark; every occurrence, case-insensitively by default. */
  readonly query?: string;
  /** Explicit `[start, end)` ranges in the phrase's UTF-16 units; wins over `query`. */
  readonly ranges?: ReadonlyArray<Range>;
  /** Match `query` case-sensitively. Default `false`. */
  readonly caseSensitive?: boolean;
  /** Only mark a whole word. Default `false`. */
  readonly wholeWord?: boolean;
  /**
   * Milliseconds per swept code point. Default `60`; `0` paints every mark on
   * the first frame.
   */
  readonly stepMs?: number;
  /** Every match's wash. Default: the theme's `findHighlight` colour. */
  readonly color?: string;
  /** The active match's wash. Default: the theme's `findHighlight` active colour. */
  readonly activeColor?: string;
  /**
   * Which mark is the active match, by its index among this phrase's marks.
   * The runtime paints it with `activeColor`; a find bar over a document
   * converts its document-wide index first.
   */
  readonly activeIndex?: number;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the reveal. */
  readonly style?: StateStyle<HighlightTextState>;
}

/** The reveal progress, tagged with the run it belongs to. */
interface Progress {
  readonly run: string;
  readonly revealed: number;
}

/**
 * A phrase whose matches a marker sweeps across.
 *
 * Under `MotionProvider preference="reduced"` — or with `stepMs={0}` — every
 * mark paints on the first frame: the resting appearance does not depend on the
 * preference, only the journey does.
 */
export const HighlightText = ({
  text,
  query,
  ranges,
  caseSensitive = false,
  wholeWord = false,
  stepMs: stepMsProp,
  color,
  activeColor,
  activeIndex,
  role = "body",
  className,
  style,
  ...rest
}: HighlightTextProps) => {
  const theme = useTheme();
  const reducedMotion = useMotionPreference() === "reduced";
  const stepMs = stepOf(Option.fromNullishOr(stepMsProp));
  const marks = useMemo(
    () => marksFor(text, { query, ranges, caseSensitive, wholeWord }),
    [caseSensitive, query, ranges, text, wholeWord],
  );
  const total = sweepLength(text, marks);
  const instant = reducedMotion || stepMs === 0;

  // A parent that hands the same ranges in a new array must not restart the
  // sweep, so the run is their values rather than their identity.
  const rangeKey = Arr.map(
    ranges ?? [],
    (range) => `${range[0]}:${range[1]}`,
  ).join(",");
  const run = `${text}|${query ?? ""}|${rangeKey}|${caseSensitive}|${wholeWord}|${stepMs}`;

  // Progress belongs to the run it was measured for, so a changed query reads as
  // zero immediately instead of flashing the previous mark.
  const [progress, setProgress] = useState<Progress>({ run, revealed: 0 });
  const revealed = instant
    ? total
    : progress.run === run
      ? progress.revealed
      : 0;
  const complete = revealed >= total;

  useEffect(() => {
    if (instant || total === 0) return;

    let shown = 0;
    let handle: ReturnType<typeof setTimeout> | undefined;
    const sweep = (): void => {
      shown += 1;
      setProgress({ run, revealed: shown });
      if (shown < total) handle = setTimeout(sweep, stepMs);
    };
    handle = setTimeout(sweep, stepMs);

    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [instant, run, stepMs, total]);

  const state: HighlightTextState = {
    text,
    revealed,
    total,
    complete,
    reducedMotion,
  };
  const painted = sweptRanges(text, marks, revealed);
  const wash = washFor(theme, { color, activeColor, activeIndex }, Arr.length(painted));

  return (
    <div
      {...rest}
      highlight={{
        ranges: hostRanges(painted),
        ...wash,
      }}
      style={mergeStyles(
        recipeStyle(cn(className), theme),
        resolveStyle(style, state),
      )}
    >
      <text
        style={{
          ...textStyle(theme, role),
          color: theme.colors.foreground,
        }}
      >
        {text}
      </text>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const highlightTextMeta = {
  name: "Highlight text",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the sweep is a real-time timer, so it is not driven by the renderer's motion clock",
    "no animated highlight: the wash is repainted as a shorter range each step",
    "the query's case folding is the regular-expression engine's; a locale that changes the string length needs the caller's ranges",
    "`activeIndex` counts the marks this phrase paints, not a document's matches; a find bar converts a document-wide index first",
  ],
  docs: "docs/highlight-text.mdx",
  example: "examples/highlight-text.example.tsx",
  testFile: "src/behaviour/highlight-text.test.tsx",
} as const;
