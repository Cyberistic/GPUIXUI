/**
 * SlidingNumber: a number whose digits roll into place like a mechanical counter.
 *
 * The runtime cannot animate the characters of a text node and has no
 * `transform` (upstream issue #102), so the movement is a **column** per digit:
 * ten stacked digits inside a one-line clipping frame, whose plate is raised a
 * line at a time. `@gpuixui/motion` owns the duration and the reduced-motion
 * policy; `sliding-number/logic.ts` owns which column each digit belongs to.
 *
 * A column is keyed by its **decimal place**, so a value that gains a digit (9 →
 * 10) mounts one column and leaves the rest where they are, and only the column
 * whose digit changed travels. A column that mounts paints at its digit instead
 * of rolling up from zero.
 *
 * The digits are presentational: ten stacked glyphs are one value, not ten, so
 * every digit publishes no accessibility node and the row as a whole is a
 * `status` named with the reading. `0.11.0` has no `aria-hidden`, but a node is
 * in the tree only with a role — measured: `role="presentation"` on a painted
 * digit leaves no node at all.
 */

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
import { textStyle, useTheme, type TextRole } from "./internal/theme.js";
import {
  columnTop,
  digitCells,
  numberLayout,
  type NumberCell,
} from "./sliding-number/logic.js";

/** What a sliding number draws at one frame. */
export interface SlidingNumberState {
  readonly value: number;
  /** The reading painted now. */
  readonly text: string;
  readonly reducedMotion: boolean;
}

/** {@link SlidingNumber} props. */
export interface SlidingNumberProps extends Omit<Props, "children" | "style"> {
  /** The number to show. A changed value rolls the columns whose digits moved. */
  readonly value: number;
  /** Digits after the point. Default `0`; clamped to the six a value can carry. */
  readonly decimals?: number;
  /** Painted and read before the sign, e.g. `"$"`. */
  readonly prefix?: string;
  /** Painted and read after the last digit, e.g. `"/mo"`. */
  readonly suffix?: string;
  /**
   * The accessible name. Default the reading itself, so assistive technology
   * hears `-3.50` rather than the ten glyphs a column stacks.
   */
  readonly label?: string;
  /** The motion level one roll runs at. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /** A typographic role from the theme. Default `"body"`. */
  readonly role?: TextRole;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the value painted. */
  readonly style?: StateStyle<SlidingNumberState>;
}

/** One column: ten stacked digits and the plate that raises to the painted one. */
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

/**
 * A number that rolls its digits when the value changes.
 *
 * It publishes no tab stop and no controls: it is a reading, so the caller owns
 * the buttons that change `value`.
 */
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
      aria-label={label ?? layout.text}
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
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
