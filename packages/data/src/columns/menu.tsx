/** @jsxImportSource @gpuix/react */
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
import { spokenText } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { columnName } from "../sort/logic.js";
import {
  moveColumn,
  setColumnVisible,
  visibleColumns,
  type Column,
  type ColumnState,
} from "./logic.js";

export const DEFAULT_COLUMN_MENU_LABEL = "Columns";

export interface ColumnMenuProps {
  readonly state: ColumnState;

  readonly onChange: (next: ColumnState) => void;

  readonly onReset?: () => void;

  readonly label?: string;

  readonly contentLabel?: string;
  readonly disabled?: boolean;

  readonly testId?: string;
}

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
    {columnName(column.label, column.id)}
  </DropdownMenuCheckboxItem>
);

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
      {`Move ${columnName(column.label, column.id)}`}
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent
      label={`Move ${columnName(column.label, column.id)}`}
    >
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

export const ColumnMenu = ({
  state,
  onChange,
  onReset,
  label,
  contentLabel,
  disabled,
  testId,
}: ColumnMenuProps) => {
  const visible = visibleColumns(state);
  const canHide = visible.length > 1;

  const menuLabel = spokenText(
    Option.fromNullishOr(label),
    DEFAULT_COLUMN_MENU_LABEL,
  );
  const surfaceLabel = spokenText(
    Option.fromNullishOr(contentLabel),
    menuLabel,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        variant="secondary"
        size="sm"
        disabled={disabled}
        testId={testId}
      >
        {menuLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent label={surfaceLabel}>
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
