/** @jsxImportSource @gpuix/react */
/**
 * The LCD. Two lines, the status indicators, and the error line — the part a
 * reader looks at. A Natural Display result is painted by `MathView`; linear
 * results and matrix/table rows stay text.
 */

import type { DisplayState } from "@gpuixui/calc";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Theme } from "@gpuixui/tokens";
import { MathView } from "./mathview.js";
import { lcdPalette } from "./theme.js";

export interface DisplayProps {
  readonly display: DisplayState;
  readonly dark: boolean;
  readonly theme: Theme;
  /** 0–10, the device's contrast wheel. */
  readonly contrast: number;
  readonly poweredOff: boolean;
}

export const Display = ({
  display,
  dark,
  theme,
  contrast,
  poweredOff,
}: DisplayProps) => {
  const lcd = lcdPalette(dark);
  const monospace = theme.typography.mono;
  const rows = Arr.take(display.resultRows, 7);
  if (poweredOff) {
    return (
      <div
        testId="calc-off"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 152,
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: lcd.edge,
          backgroundColor: lcd.panel,
          opacity: 0.72,
        }}
      >
        <div style={{ flexGrow: 1 }} />
        <text
          style={{
            fontFamily: monospace,
            fontSize: 11,
            lineHeight: 16,
            color: lcd.dim,
            textAlign: "right",
            paddingRight: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          }}
        >
          OFF
        </text>
      </div>
    );
  }
  return (
    <div
      testId="calc-display"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        minHeight: 152,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        borderWidth: theme.borderWidth.thin,
        borderColor: lcd.edge,
        backgroundColor: lcd.panel,
        boxShadow: {
          offsetX: 0,
          offsetY: 2,
          blurRadius: 12,
          spreadRadius: 0,
          color: lcd.glow,
          inset: true,
        },
      }}
    >
      <div
        testId="calc-lcd-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          flexGrow: 1,
          opacity: 0.58 + (contrast / 10) * 0.42,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 4,
            minHeight: 16,
            alignItems: "center",
          }}
        >
          {Arr.map(display.indicators, (indicator) => (
            <div
              key={indicator}
              style={{
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 1,
                paddingBottom: 1,
                borderRadius: theme.radius.sm,
                backgroundColor: lcd.glow,
              }}
            >
              <text
                style={{
                  fontFamily: monospace,
                  fontSize: 9,
                  lineHeight: 12,
                  fontWeight: 600,
                  color: lcd.dim,
                }}
              >
                {indicator}
              </text>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          {Option.isSome(display.inputLayout) ? (
            <MathView
              testId="calc-input-layout"
              node={display.inputLayout.value}
              size={20}
              color={lcd.ink}
              theme={theme}
            />
          ) : (
            <text
              testId="calc-expression"
              style={{
                fontFamily: monospace,
                fontSize: 20,
                lineHeight: 26,
                fontWeight: 400,
                color: lcd.ink,
                textAlign: "right",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {display.expression}
            </text>
          )}

          {Option.isSome(display.layout) ? (
            <MathView
              node={display.layout.value}
              size={38}
              color={lcd.ink}
              theme={theme}
            />
          ) : Arr.isReadonlyArrayEmpty(rows) ? (
            <text
              testId="calc-result"
              style={{
                fontFamily: monospace,
                fontSize: 38,
                lineHeight: 46,
                fontWeight: 300,
                color: lcd.ink,
                textAlign: "right",
              }}
            >
              {display.error._tag === "Some" ? display.error.value : "0"}
            </text>
          ) : (
            Arr.map(rows, (row, index) => (
              <text
                key={`${index}-${row}`}
                testId={
                  index === rows.length - 1
                    ? "calc-result"
                    : `calc-result-${index}`
                }
                style={{
                  fontFamily: monospace,
                  fontSize: rows.length > 2 ? 19 : 34,
                  lineHeight: rows.length > 2 ? 25 : 42,
                  fontWeight: rows.length > 2 ? 400 : 300,
                  color: lcd.ink,
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row}
              </text>
            ))
          )}

          {display.error._tag === "Some" ? (
            <text
              testId="calc-error"
              style={{
                fontFamily: monospace,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: 600,
                color: "#FF8A80",
                textAlign: "right",
              }}
            >
              {display.error.value}
            </text>
          ) : null}
        </div>
      </div>
    </div>
  );
};
