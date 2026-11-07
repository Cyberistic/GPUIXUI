/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { Button as Action } from "@gpuixui/primitives/button";
import { useTheme } from "./internal/theme.js";

export interface ColorSwatchesProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly colors: ReadonlyArray<string>;

  readonly value?: string;

  readonly onValueChange?: (color: string) => void;

  readonly size?: number;
}

export const ColorSwatches = ({
  label,
  colors,
  value,
  onValueChange,
  size = 16,
  testId,
  style,
  ...rest
}: ColorSwatchesProps): ReactNode => {
  const theme = useTheme();
  const ring = size + 8;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      testId={testId}
      {...rest}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {Arr.map(colors, (color) => {
        const selected = color === value;
        return (
          <Action
            key={color}
            variant="ghost"
            label={color}
            tabIndex={selected ? 0 : -1}
            aria-checked={selected}
            {...(testId === undefined ? {} : { testId: `${testId}-${color}` })}
            onActivate={() => onValueChange?.(color)}
            style={{
              width: ring,
              height: ring,
              minWidth: ring,
              flexShrink: 0,
              paddingLeft: 0,
              paddingRight: 0,
              borderRadius: ring / 2,
              borderWidth: selected ? theme.borderWidth.strong : 0,
              borderColor: color,
            }}
          >
            <div
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                flexShrink: 0,
                pointerEvents: "none",
                backgroundColor: color,
              }}
            />
          </Action>
        );
      })}
    </div>
  );
};

export const colorSwatchesMeta = {
  name: "Color swatches",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
  docs: "docs/color-swatches.mdx",
  example: "examples/color-swatches.example.tsx",
  testFile: "src/behaviour/color-swatches.test.tsx",
} as const;
