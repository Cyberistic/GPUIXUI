/**
 * A key-value list: the property rows an inspector reads.
 *
 * The measured rule (`inspector-lifecycle`) is a **fixed label column**: every
 * label cell holds one `x`, every value cell holds one `x`, and a value begins
 * at its label's right edge — so the list scans down its two columns instead
 * of drifting row by row.
 *
 * The list holds no state: the entries are the caller's, so a panel, a
 * preview and a card can all read the same object without a second copy of it.
 *
 * ```tsx
 * <KeyValue
 *   entries={[
 *     { key: "width", label: "Width", value: "120" },
 *     { key: "height", label: "Height", value: "80" },
 *   ]}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import type { ReactNode } from "react";
import { readable } from "../internal/readable.js";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { KEY_VALUE_LABEL, KEY_VALUE_ROW, KEY_VALUE_VALUE } from "./recipe.js";

/** One row of the list. */
export interface KeyValueEntry {
  /** The stable identity a row is addressed by. */
  readonly key: string;
  /** The label the value sits beside. */
  readonly label: string;
  /** The value, already rendered by the caller. */
  readonly value: ReactNode;
}

/** {@link KeyValue} props. */
export interface KeyValueProps extends Omit<Props, "children"> {
  /** The rows, in the order they paint. */
  readonly entries: ReadonlyArray<KeyValueEntry>;
  /** The label column's width, in pixels. Defaults to `120`. */
  readonly labelWidth?: number;
  /** The width of the value column, in pixels. Omit it to fill the row. */
  readonly valueWidth?: number;
  readonly className?: string;
  /**
   * The list's test id. Every cell derives from it:
   * `${testId}-label-${key}` and `${testId}-value-${key}`.
   */
  readonly testId?: string;
}

/** The label column's width when the caller names none. */
export const DEFAULT_LABEL_WIDTH = 120;

/**
 * A two-column list of labels and values.
 *
 * The label column is fixed, so every value begins at the same `x` — the
 * measured rule that lets a reader scan the column instead of the rows.
 *
 * A width is often computed — the widest label, a share of a pane, a measurement
 * taken before the first layout — and a track the layout cannot paint reads as
 * the default: `NaN` is dropped by the runtime, so the label column fell back to
 * each label's own text width and every value started somewhere else. A label
 * width that cannot paint is {@link DEFAULT_LABEL_WIDTH}; a `valueWidth` that
 * cannot paint fills the row like an omitted one. A fractional width is kept.
 */
export const KeyValue = ({
  entries,
  labelWidth = DEFAULT_LABEL_WIDTH,
  valueWidth,
  className,
  style,
  testId,
  ...rest
}: KeyValueProps) => {
  const theme = useTheme();
  const labelTrack =
    Number.isFinite(labelWidth) && labelWidth > 0
      ? labelWidth
      : DEFAULT_LABEL_WIDTH;
  const valueTrack =
    valueWidth !== undefined && Number.isFinite(valueWidth) && valueWidth > 0
      ? valueWidth
      : undefined;
  return (
    <div
      {...rest}
      role="list"
      style={mergeStyles(recipeStyle(cn("", className), theme), style)}
    >
      {entries.map((entry) => (
        <div
          key={entry.key}
          role="listitem"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            ...recipeStyle(KEY_VALUE_ROW, theme),
          }}
        >
          <text
            testId={
              testId === undefined ? undefined : `${testId}-label-${entry.key}`
            }
            style={{
              ...recipeStyle(KEY_VALUE_LABEL, theme),
              width: labelTrack,
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: labelTrack,
            }}
          >
            {entry.label}
          </text>
          {readable(entry.value, {
            testId:
              testId === undefined ? undefined : `${testId}-value-${entry.key}`,
            style: {
              ...recipeStyle(KEY_VALUE_VALUE, theme),
              ...(valueTrack === undefined
                ? { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }
                : {
                    width: valueTrack,
                    flexGrow: 0,
                    flexShrink: 0,
                    flexBasis: valueTrack,
                  }),
            },
          })}
        </div>
      ))}
    </div>
  );
};
