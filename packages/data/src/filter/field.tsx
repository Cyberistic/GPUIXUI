/** @jsxImportSource @gpuix/react */
import { Input } from "@gpuixui/primitives";
import { spaceValue, spokenText, visibleCopy } from "@gpuixui/primitives/core";
import * as Option from "effect/Option";
import { useTheme } from "../theme.js";

export interface TableFilterFieldProps {
  readonly value: string;

  readonly onValueChange: (next: string) => void;

  readonly label?: string;

  readonly placeholder?: string;

  readonly width?: number;
  readonly testId?: string;
}

export const DEFAULT_FILTER_LABEL = "Filter rows";

export const DEFAULT_FILTER_PLACEHOLDER = "Filter…";

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
