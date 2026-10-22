/**
 * The column configuration menu above a table.
 *
 * A reader's two decisions live here — which columns paint, and their order —
 * because both are app state and neither is a styling choice. The menu is the
 * `DropdownMenu` the component package already measured (keyboard open, focus
 * on a row, dismiss layering), not a second menu implementation: a data grid
 * owes the consequences, not the surface.
 *
 * The consequences are the `table-columns-lifecycle` probe's, and the grid owns
 * each one: hiding a column takes its width out of the content and shifts every
 * later column by exactly that width; a move changes the order and not the
 * width; the header and the cells read one list. The last visible column cannot
 * be hidden, and the menu disables that row rather than offering a change the
 * reducer refuses.
 *
 * A pinned (frozen) column is deliberately not a row: the runtime paints no
 * sticky position, so a frozen column is the measured two-pane composition,
 * not a flag in this menu.
 *
 * ```tsx
 * const columns = useColumns({ columns: FILE_COLUMNS });
 * <ColumnMenu
 *   state={columns.state}
 *   onChange={columns.apply}
 *   onReset={columns.reset}
 * />
 * ```
 */

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  moveColumn,
  setColumnVisible,
  visibleColumns,
  type Column,
  type ColumnState,
} from "./logic.js";

/** {@link ColumnMenu} props. */
export interface ColumnMenuProps {
  /** The configured columns, in paint order. */
  readonly state: ColumnState;
  /** Receives every complete next state. A controlled consumer stores it. */
  readonly onChange: (next: ColumnState) => void;
  /** Restores the definitions, order included. Omit to hide the row. */
  readonly onReset?: () => void;
  /** The trigger's label. Defaults to `Columns`. */
  readonly label?: string;
  /** The menu surface's accessible name. Defaults to the trigger's label. */
  readonly contentLabel?: string;
  readonly disabled?: boolean;
  /**
   * The trigger's test id. Every row derives from it:
   * `${testId}-toggle-${id}`, `${testId}-move-${id}` and
   * `${testId}-move-${id}-left` / `-right`.
   */
  readonly testId?: string;
}

/** The row that shows or hides one column. */
const VisibilityRow = ({
  column,
  state,
  onChange,
  canHide,
  testId,
}: {
  readonly column: Column;
  readonly state: ColumnState;
  readonly onChange: (next: ColumnState) => void;
  readonly canHide: boolean;
  readonly testId?: string;
}) => (
  <DropdownMenuCheckboxItem
    checked={column.visible}
    disabled={column.visible && !canHide}
    onCheckedChange={(visible) =>
      onChange(setColumnVisible(state, column.id, visible))
    }
    testId={testId === undefined ? undefined : `${testId}-toggle-${column.id}`}
  >
    {column.label}
  </DropdownMenuCheckboxItem>
);

/** The submenu that moves one visible column through the order. */
const MoveRow = ({
  column,
  at,
  count,
  state,
  onChange,
  testId,
}: {
  readonly column: Column;
  readonly at: number;
  readonly count: number;
  readonly state: ColumnState;
  readonly onChange: (next: ColumnState) => void;
  readonly testId?: string;
}) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger
      testId={testId === undefined ? undefined : `${testId}-move-${column.id}`}
    >
      {`Move ${column.label}`}
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent label={`Move ${column.label}`}>
      <DropdownMenuItem
        disabled={at === 0}
        onSelect={() => onChange(moveColumn(state, column.id, -1))}
        testId={
          testId === undefined ? undefined : `${testId}-move-${column.id}-left`
        }
      >
        Left
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={at === count - 1}
        onSelect={() => onChange(moveColumn(state, column.id, 1))}
        testId={
          testId === undefined ? undefined : `${testId}-move-${column.id}-right`
        }
      >
        Right
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

/** A menu that shows, hides, reorders and restores a table's columns. */
export const ColumnMenu = ({
  state,
  onChange,
  onReset,
  label = "Columns",
  contentLabel,
  disabled,
  testId,
}: ColumnMenuProps) => {
  const visible = visibleColumns(state);
  const canHide = visible.length > 1;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        variant="secondary"
        size="sm"
        disabled={disabled}
        testId={testId}
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent label={contentLabel ?? label}>
        {Arr.map(state.columns, (column) => (
          <VisibilityRow
            key={`visible-${column.id}`}
            column={column}
            state={state}
            onChange={onChange}
            canHide={canHide}
            testId={testId}
          />
        ))}
        <DropdownMenuSeparator />
        {Arr.map(visible, (column, at) => (
          <MoveRow
            key={`move-${column.id}`}
            column={column}
            at={at}
            count={visible.length}
            state={state}
            onChange={onChange}
            testId={testId}
          />
        ))}
        {Option.match(Option.fromNullishOr(onReset), {
          onNone: () => null,
          onSome: (reset) => (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={reset}
                testId={testId === undefined ? undefined : `${testId}-reset`}
              >
                Reset columns
              </DropdownMenuItem>
            </>
          ),
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
