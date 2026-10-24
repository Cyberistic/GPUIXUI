/** @jsxImportSource @gpuix/react */
/**
 * The filter field above a table's rows.
 *
 * It is the primitives' `Input`, so the field keeps the platform text session
 * while the table narrows underneath it — the `table-filter-lifecycle` probe
 * measured that the reader can keep typing after the set changes. The field
 * owns no query state and clears nothing itself: narrowing, releasing a hidden
 * selection and returning to the top are the grid's rules, and they live in
 * `useTable` (the core's global filter) and `selection/logic`.
 */

import { Input } from "@gpuixui/primitives";
import { spaceValue, spokenText, visibleCopy } from "@gpuixui/primitives/core";
import * as Option from "effect/Option";
import { useTheme } from "../theme.js";

/** {@link TableFilterField} props. */
export interface TableFilterFieldProps {
  /** The current query, owned by the table. */
  readonly value: string;
  /** Receives every edit. */
  readonly onValueChange: (next: string) => void;
  /**
   * The accessible name. Defaults to `Filter rows`; a blank name is the
   * default, because a default only covers an absent prop.
   */
  readonly label?: string;
  /** The hint a reader sees in the empty field. Defaults to `Filter…`; a blank hint is that default too, because a default only covers an absent prop. */
  readonly placeholder?: string;
  /** The field's width, in pixels. */
  readonly width?: number;
  readonly testId?: string;
}

/** The words a filter field is named by. */
export const DEFAULT_FILTER_LABEL = "Filter rows";

/** The hint a filter field shows when the caller names none. */
export const DEFAULT_FILTER_PLACEHOLDER = "Filter…";

/**
 * A labelled text field that narrows the table it sits above.
 *
 * The query is matched literally: no pattern syntax, and case is ignored.
 *
 * A label is often copy from an i18n table or a saved preference, and a missing
 * row answers `""`: publishing that would leave the field unnamed while the
 * documented default sat unused, so a blank name reads as the default.
 */
export const TableFilterField = ({
  value,
  onValueChange,
  label,
  placeholder,
  width,
  testId,
}: TableFilterFieldProps) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: spaceValue(theme, "sm"),
        ...(width === undefined ? {} : { width }),
      }}
    >
      <Input
        label={spokenText(Option.fromNullishOr(label), DEFAULT_FILTER_LABEL)}
        placeholder={visibleCopy(placeholder) ?? DEFAULT_FILTER_PLACEHOLDER}
        value={value}
        onValueChange={onValueChange}
        size="sm"
        fullWidth
        testId={testId}
      />
    </div>
  );
};
