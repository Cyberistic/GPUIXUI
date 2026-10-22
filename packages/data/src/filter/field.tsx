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
import { useTheme } from "../theme.js";

/** {@link TableFilterField} props. */
export interface TableFilterFieldProps {
  /** The current query, owned by the table. */
  readonly value: string;
  /** Receives every edit. */
  readonly onValueChange: (next: string) => void;
  /** The accessible name. Defaults to `Filter rows`. */
  readonly label?: string;
  /** The hint a reader sees in the empty field. */
  readonly placeholder?: string;
  /** The field's width, in pixels. */
  readonly width?: number;
  readonly testId?: string;
}

/**
 * A labelled text field that narrows the table it sits above.
 *
 * The query is matched literally: no pattern syntax, and case is ignored.
 */
export const TableFilterField = ({
  value,
  onValueChange,
  label = "Filter rows",
  placeholder = "Filter…",
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
        gap: theme.spacing.sm,
        ...(width === undefined ? {} : { width }),
      }}
    >
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        onValueChange={onValueChange}
        size="sm"
        fullWidth
        testId={testId}
      />
    </div>
  );
};
