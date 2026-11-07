/** @jsxImportSource @gpuix/react */
import type { MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { nameOf } from "./internal/text.js";
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import {
  columnTop,
  digitCells,
  numberLayout,
  type NumberCell,
} from "./sliding-number/logic.js";

export interface SlidingNumberState {
  readonly value: number;

  readonly text: string;
  readonly reducedMotion: boolean;
}

export interface SlidingNumberProps extends Omit<Props, "children" | "style"> {
  readonly value: number;

  readonly decimals?: number;

  readonly prefix?: string;

  readonly suffix?: string;

  readonly label?: string;

  readonly level?: MotionLevel;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<SlidingNumberState>;
}

const DigitColumn = ({
  cell,
  metrics,
  ink,
  motion,
}: {
  readonly cell: NumberCell;
  readonly metrics: ReturnType<typeof textStyle>;
  readonly ink: { readonly color: string };
  readonly motion: MotionProps;
}) => (
  <div
    testId={`cell-${cell.key}`}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflow: "hidden",
      height: metrics.lineHeight,
    }}
  >
    <div
      testId={`cell-${cell.key}-plate`}
      motion={motion}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {Arr.map(digitCells, (painted) => (
        <text
          key={painted}
          role="presentation"
          style={{ ...metrics, ...ink, height: metrics.lineHeight }}
        >
          {String(painted)}
        </text>
      ))}
    </div>
  </div>
);

export const SlidingNumber = ({
  value,
  decimals,
  prefix,
  suffix,
  label,
  level = "normal",
  role = "body",
  className,
  style,
  ...rest
}: SlidingNumberProps) => {
  const theme = useTheme();
  const reducedMotion = useMotionPreference() === "reduced";
  const timing = useSurfaceTiming(level);
  const layout = numberLayout(value, { decimals, prefix, suffix });
  const metrics = textStyle(theme, role);
  const ink = { color: theme.colors.foreground };
  const state: SlidingNumberState = {
    value,
    text: layout.text,
    reducedMotion,
  };

  const cell = (current: NumberCell) =>
    Option.match(current.digit, {
      onNone: () => (
        <text
          key={current.key}
          testId={`cell-${current.key}`}
          role="presentation"
          style={{ ...metrics, ...ink }}
        >
          .
        </text>
      ),
      onSome: (digit) => (
        <DigitColumn
          key={current.key}
          cell={current}
          metrics={metrics}
          ink={ink}
          motion={{
            initial: false,
            animate: { top: columnTop(digit, metrics.lineHeight) },
            transition: timing.enter,
          }}
        />
      ),
    });

  const fixed = (content: string, key?: string) => (
    <text key={key} role="presentation" style={{ ...metrics, ...ink }}>
      {content}
    </text>
  );

  return (
    <div
      {...rest}
      role="status"
      aria-label={nameOf(label) ?? layout.text}
      style={mergeStyles(
        { display: "flex", flexDirection: "row", alignItems: "flex-start" },
        mergeStyles(
          recipeStyle(cn(className), theme),
          resolveStyle(style, state),
        ),
      )}
    >
      {Arr.match(layout.cells, {
        onEmpty: () => fixed(layout.text),
        onNonEmpty: () => (
          <>
            {layout.negative ? fixed("-") : null}
            {prefix === undefined ? null : fixed(prefix)}
            {Arr.map(layout.cells, cell)}
            {suffix === undefined ? null : fixed(suffix)}
          </>
        ),
      })}
    </div>
  );
};

export const slidingNumberMeta = {
  name: "Sliding number",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "each column raises its plate inside a one-line clip, not a transform: the runtime scales nothing (upstream issue #102)",
    "a column is as wide as its widest digit, because the runtime cannot measure a glyph before it is laid out, so the row is tabular by construction rather than by font",
    "a carry rolls the digit back through its column rather than wrapping forward (9 → 0 travels the whole stack), and a roll takes one level whatever distance it covers",
    "a value that loses a digit drops its column at once; only the columns that remain roll",
    "no grouping separator and no currency formatting: `decimals`, `prefix` and `suffix` are the whole format",
  ],
  docs: "docs/sliding-number.mdx",
  example: "examples/sliding-number.example.tsx",
  testFile: "src/behaviour/sliding-number.test.tsx",
} as const;
