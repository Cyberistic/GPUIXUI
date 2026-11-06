/** @jsxImportSource @gpuix/react */
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
import { textOf } from "./internal/text.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";

export interface HighlightTextState {
  readonly text: string;

  readonly revealed: number;

  readonly total: number;
  readonly complete: boolean;
  readonly reducedMotion: boolean;
}

export interface HighlightTextProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly query?: string;

  readonly ranges?: ReadonlyArray<Range>;

  readonly caseSensitive?: boolean;

  readonly wholeWord?: boolean;

  readonly stepMs?: number;

  readonly color?: string;

  readonly activeColor?: string;

  readonly activeIndex?: number;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<HighlightTextState>;
}

interface Progress {
  readonly run: string;
  readonly revealed: number;
}

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

  const phrase = textOf(text);
  const marks = useMemo(
    () => marksFor(phrase, { query, ranges, caseSensitive, wholeWord }),
    [caseSensitive, phrase, query, ranges, wholeWord],
  );
  const total = sweepLength(phrase, marks);
  const instant = reducedMotion || stepMs === 0;

  const rangeKey = Arr.map(
    ranges ?? [],
    (range) => `${range[0]}:${range[1]}`,
  ).join(",");
  const run = `${phrase}|${query ?? ""}|${rangeKey}|${caseSensitive}|${wholeWord}|${stepMs}`;

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
    text: phrase,
    revealed,
    total,
    complete,
    reducedMotion,
  };
  const painted = sweptRanges(phrase, marks, revealed);
  const wash = washFor(
    theme,
    { color, activeColor, activeIndex },
    Arr.length(painted),
  );
  const marksOnHost = hostRanges(painted);

  return (
    <div
      {...rest}
      highlight={
        wash === undefined
          ? { ranges: marksOnHost }
          : { ranges: marksOnHost, ...wash }
      }
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
        {phrase}
      </text>
    </div>
  );
};

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
