/** @jsxImportSource @gpuix/react */
import type { EventPayload, KeyEvent, Props } from "@gpuix/react";
import { useRef, useState } from "react";
import { disabledFade, useTheme } from "./internal/theme.js";
import { knobDot, knobDrag, knobKey } from "./knob/logic.js";

export interface KnobProps extends Omit<Props, "children" | "role"> {
  readonly label: string;
  readonly value?: number;
  readonly defaultValue?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly size?: number;
  readonly disabled?: boolean;
  readonly indicatorColor?: string;
  readonly onValueChange?: (value: number) => void;
}

interface Grip {
  readonly y: number;
  readonly value: number;
}

export const Knob = ({
  label,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  size = 48,
  disabled = false,
  indicatorColor,
  onValueChange,
  style,
  ...rest
}: KnobProps) => {
  const theme = useTheme();
  const [stored, setStored] = useState(defaultValue ?? min);
  const grip = useRef<Grip | null>(null);
  const range = { min, max, step };
  const shown = value ?? stored;
  const dot = Math.max(4, Math.round(size / 8));
  const [dx, dy] = knobDot(shown, range, size / 2 - dot);

  const change = (next: number): void => {
    if (next === shown) return;
    setStored(next);
    onValueChange?.(next);
  };
  const onKeyDown = (event: KeyEvent): void => {
    if (disabled) return;
    const next = knobKey(event.key ?? "", shown, range);
    if (next !== null) change(next);
  };
  const onMouseDown = (event: EventPayload): void => {
    if (disabled) return;
    grip.current = { y: event.y ?? 0, value: shown };
  };
  const onMouseMove = (event: EventPayload): void => {
    const held = grip.current;
    if (held === null) return;
    if (event.pressedButton !== 0) {
      grip.current = null;
      return;
    }
    change(knobDrag(held.value, held.y - (event.y ?? held.y), range));
  };

  return (
    <div
      {...rest}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={() => {
        grip.current = null;
      }}
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size / 2,
        backgroundColor: theme.colors.muted,
        ...disabledFade(disabled),
        ...style,
      }}
    >
      <div
        testId="knob-indicator"
        style={{
          position: "absolute",
          left: size / 2 + dx - dot / 2,
          top: size / 2 + dy - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          pointerEvents: "none",
          backgroundColor: indicatorColor ?? theme.colors.primary,
        }}
      />
    </div>
  );
};

export const knobMeta = {
  name: "Knob",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
  docs: "docs/knob.mdx",
  example: "examples/knob.example.tsx",
  testFile: "src/behaviour/knob.test.tsx",
} as const;
