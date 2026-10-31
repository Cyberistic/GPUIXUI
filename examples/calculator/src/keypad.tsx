/** @jsxImportSource @gpuix/react */
/**
 * The keypad, painted from the model's key table.
 *
 * There is no second layout in the app: `fx991es.keypad` is the authority, and
 * a TI-84 model will paint its own rows through the same component. Every key is
 * a real `Button` with an accessible name, but sits out of the Tab order —
 * 60 stops would make the calculator hostile to keyboard users, and the whole
 * calculator is already reachable from the computer keyboard and ⌘K.
 */

import type { KeypadKey, KeypadRow } from "@gpuixui/calc";
import { Button } from "@gpuixui/primitives";
import type { Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { keyPaint } from "./theme.js";

export interface KeypadProps {
  readonly rows: ReadonlyArray<KeypadRow>;
  readonly shift: boolean;
  readonly alpha: boolean;
  readonly hyp: boolean;
  readonly theme: Theme;
  readonly press: (key: string) => void;
}

const legend = (
  text: string,
  color: string,
  size: number,
  weight: number,
  mono: string,
) => (
  <text
    style={{
      fontFamily: mono,
      fontSize: size,
      lineHeight: size + 3,
      fontWeight: weight,
      color,
      textAlign: "center",
    }}
  >
    {text}
  </text>
);

const Key = ({
  held,
  shift,
  alpha,
  hyp,
  theme,
  press,
}: {
  readonly held: KeypadKey;
  readonly shift: boolean;
  readonly alpha: boolean;
  readonly hyp: boolean;
  readonly theme: Theme;
  readonly press: (key: string) => void;
}) => {
  const active =
    (held.id === "SHIFT" && shift) ||
    (held.id === "ALPHA" && alpha) ||
    (held.id === "hyp" && hyp);
  const paint = keyPaint(theme, held.tone ?? "function", active);
  const mono = theme.typography.mono;
  const upper = shift ? held.shift : alpha ? held.alpha : undefined;
  return (
    <Button
      variant="secondary"
      size="sm"
      fullWidth
      testId={`calc-key-${held.id}`}
      label={held.label ?? held.primary}
      tabIndex={-1}
      onActivate={() => press(held.id)}
      style={{
        height: 38,
        padding: 0,
        borderRadius: theme.radius.md,
        backgroundColor: paint.background,
        borderWidth: theme.borderWidth.thin,
        borderColor: paint.border,
        boxShadow: {
          offsetX: 0,
          offsetY: 1,
          blurRadius: 2,
          spreadRadius: 0,
          color: paint.border,
        },
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          width: "100%",
        }}
      >
        {upper === undefined
          ? null
          : legend(upper, theme.colors.mutedForeground, 8, 500, mono)}
        {legend(held.primary, paint.foreground, 13, 500, mono)}
      </div>
    </Button>
  );
};

export const Keypad = ({
  rows,
  shift,
  alpha,
  hyp,
  theme,
  press,
}: KeypadProps) => (
  <div
    testId="calc-keypad"
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
    }}
  >
    {Arr.map(rows, (row, rowIndex) => (
      <div
        key={`row-${rowIndex}`}
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 3,
          alignItems: "stretch",
        }}
      >
        {Arr.map(row.keys, (held) => (
          <div
            key={held.id}
            style={{ display: "flex", flexGrow: held.span ?? 1, flexBasis: 0 }}
          >
            <div style={{ display: "flex", flexGrow: 1 }}>
              <Key
                held={held}
                shift={shift}
                alpha={alpha}
                hyp={hyp}
                theme={theme}
                press={press}
              />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);
