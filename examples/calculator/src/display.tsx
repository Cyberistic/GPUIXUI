/** @jsxImportSource @gpuix/react */
/**
 * The LCD: reflective grey-green glass with dark segments, the indicator row
 * along the top, the entry on the first line and the result right-aligned on
 * the second — the fx-991ES Plus's Natural Display. A Natural Display result is
 * painted by `MathView`; linear results and matrix/table rows stay text. The
 * MODE menu paints here too, as it does on the device.
 */

import type { DisplayState } from "@gpuixui/calc";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Theme } from "@gpuixui/tokens";
import { MathView } from "./mathview.js";
import { device } from "./theme.js";

/** The device's segment for each indicator; a mode the LCD has no segment for is absent. */
const SEGMENT: Readonly<Record<string, string>> = {
  SHIFT: "S",
  ALPHA: "A",
  Deg: "D",
  Rad: "R",
  Gra: "G",
  MATRIX: "MAT",
  VECTOR: "VCT",
  "↑": "▲",
  COMP: "",
  EQN: "",
  TABLE: "",
};

export interface DisplayProps {
  readonly display: DisplayState;
  readonly theme: Theme;
  /** 0–10, the device's contrast wheel. */
  readonly contrast: number;
  readonly poweredOff: boolean;
  /** The MODE menu's lines, when it is open. */
  readonly menu: Option.Option<ReadonlyArray<string>>;
  /** The device unit: 1 at the design size. */
  readonly u: number;
}

export const Display = ({
  display,
  theme,
  contrast,
  poweredOff,
  menu,
  u,
}: DisplayProps) => {
  const mono = theme.typography.mono;
  const ink = device.lcdInk;
  const line = (
    size: number,
    align: "left" | "right",
    text: string,
    testId?: string,
  ) => (
    <text
      testId={testId}
      style={{
        fontFamily: mono,
        fontSize: size * u,
        lineHeight: (size + 5) * u,
        color: ink,
        textAlign: align,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {text}
    </text>
  );
  const rows = Arr.take(display.resultRows, 4);
  const segments = Arr.filter(
    Arr.map(display.indicators, (indicator) => SEGMENT[indicator] ?? indicator),
    (segment) => segment !== "",
  );
  return (
    <div
      testId={poweredOff ? "calc-off" : "calc-display"}
      style={{
        display: "flex",
        flexDirection: "column",
        height: 104 * u,
        paddingTop: 5 * u,
        paddingBottom: 6 * u,
        paddingLeft: 8 * u,
        paddingRight: 8 * u,
        borderRadius: 4 * u,
        borderWidth: Math.max(1, 2 * u),
        borderColor: device.lcdEdge,
        backgroundColor: device.lcd,
      }}
    >
      {poweredOff ? null : (
        <div
          testId="calc-lcd-content"
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            opacity: 0.45 + (contrast / 10) * 0.55,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 7 * u,
              height: 11 * u,
            }}
          >
            {Arr.map(segments, (segment) => (
              <text
                key={segment}
                style={{
                  fontFamily: mono,
                  fontSize: 8 * u,
                  lineHeight: 11 * u,
                  fontWeight: 700,
                  color: ink,
                }}
              >
                {segment}
              </text>
            ))}
          </div>
          {Option.match(menu, {
            onSome: (lines) => (
              <div
                testId="calc-mode-menu"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  paddingTop: 3 * u,
                }}
              >
                {Arr.map(lines, (entry) => (
                  <div key={entry} style={{ width: "50%" }}>
                    {line(13, "left", entry)}
                  </div>
                ))}
              </div>
            ),
            onNone: () => (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  justifyContent: "space-between",
                }}
              >
                {Option.isSome(display.inputLayout) ? (
                  <MathView
                    testId="calc-input-layout"
                    node={display.inputLayout.value}
                    size={15 * u}
                    color={ink}
                    theme={theme}
                  />
                ) : (
                  line(15, "left", display.expression, "calc-expression")
                )}
                {Option.isSome(display.error) ? (
                  line(18, "left", display.error.value, "calc-error")
                ) : Option.isSome(display.layout) ? (
                  <MathView
                    node={display.layout.value}
                    size={24 * u}
                    color={ink}
                    theme={theme}
                  />
                ) : Arr.isReadonlyArrayEmpty(rows) ? (
                  line(24, "right", "0", "calc-result")
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {Arr.map(rows, (row, index) => (
                      <div key={`${index}-${row}`}>
                        {line(
                          rows.length > 1 ? 12 : 24,
                          "right",
                          row,
                          index === rows.length - 1
                            ? "calc-result"
                            : `calc-result-${index}`,
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          })}
        </div>
      )}
    </div>
  );
};
