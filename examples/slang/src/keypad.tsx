/** @jsxImportSource @gpuix/react */
import type {
  DirectionPad,
  Keypad as KeypadModel,
  KeypadKey,
  KeypadRow,
} from "@gpuixui/calc";
import { Button } from "@gpuixui/primitives";
import type { Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { device, keyPaint, labelInk } from "./theme.js";

export interface KeypadProps {
  readonly keypad: KeypadModel;
  readonly shift: boolean;
  readonly alpha: boolean;
  readonly hyp: boolean;
  readonly theme: Theme;

  readonly u: number;
  readonly press: (key: string) => void;
}

type Size = "small" | "large";

const CAP = {
  small: { height: 24, font: 11 },
  large: { height: 38, font: 17 },
};
const LEGEND = 9;
const GAP = { small: 8, large: 10 };

interface KeyProps {
  readonly held: KeypadKey;
  readonly size: Size;
  readonly latched: boolean;
  readonly theme: Theme;
  readonly u: number;
  readonly press: (key: string) => void;
}

const Legend = ({
  text,
  color,
  u,
  font,
}: {
  readonly text: string;
  readonly color: string;
  readonly u: number;
  readonly font: string;
}) => (
  <text
    style={{
      fontFamily: font,
      fontSize: LEGEND * u,
      lineHeight: (LEGEND + 2) * u,
      fontWeight: 600,
      color,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </text>
);

const Key = ({ held, size, latched, theme, u, press }: KeyProps) => {
  const paint = keyPaint(held.tone ?? "function");
  const font = theme.typography.sans;
  const cap = CAP[size];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        gap: u,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent:
            held.shift !== undefined && held.alpha !== undefined
              ? "space-between"
              : "center",
          height: (LEGEND + 2) * u,
          paddingLeft: u,
          paddingRight: u,
        }}
      >
        {held.shift === undefined ? null : (
          <Legend text={held.shift} color={device.shift} u={u} font={font} />
        )}
        {held.alpha === undefined ? null : (
          <Legend text={held.alpha} color={device.alpha} u={u} font={font} />
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        testId={`calc-key-${held.id}`}
        label={held.label ?? held.primary}
        tabIndex={-1}
        onActivate={() => press(held.id)}
        style={{
          height: cap.height * u,
          padding: 0,
          borderRadius: (size === "small" ? 7 : 8) * u,
          backgroundColor: paint.background,
          borderWidth: Math.max(1, 1.5 * u),
          borderColor: latched ? labelInk(held.id, paint) : paint.edge,
          boxShadow: {
            offsetX: 0,
            offsetY: 2 * u,
            blurRadius: 0,
            spreadRadius: 0,
            color: device.bodyEdge,
          },
        }}
      >
        <text
          style={{
            fontFamily: font,
            fontSize: cap.font * u,
            lineHeight: (cap.font + 4) * u,
            fontWeight: size === "large" ? 500 : 600,
            color: labelInk(held.id, paint),
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {held.primary}
        </text>
      </Button>
    </div>
  );
};

const Rows = ({
  rows,
  size,
  ...rest
}: { readonly rows: ReadonlyArray<KeypadRow>; readonly size: Size } & Omit<
  KeyProps,
  "held" | "size" | "latched"
> & { readonly latchedIds: ReadonlyArray<string> }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: (size === "small" ? 4 : 6) * rest.u,
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
    }}
  >
    {Arr.map(rows, (row, index) => (
      <div
        key={index}
        style={{
          display: "flex",
          flexDirection: "row",
          gap: GAP[size] * rest.u,
        }}
      >
        {Arr.map(row.keys, (held) => (
          <Key
            key={held.id}
            held={held}
            size={size}
            latched={Arr.contains(rest.latchedIds, held.id)}
            theme={rest.theme}
            u={rest.u}
            press={rest.press}
          />
        ))}
      </div>
    ))}
  </div>
);

const Pad = ({
  pad,
  u,
  press,
}: {
  readonly pad: DirectionPad;
  readonly u: number;
  readonly press: (key: string) => void;
}) => {
  const arm = (held: KeypadKey, w: number, h: number) => (
    <Button
      variant="ghost"
      size="sm"
      testId={`calc-key-${held.id}`}
      label={held.label ?? held.primary}
      tabIndex={-1}
      onActivate={() => press(held.id)}
      style={{
        width: w * u,
        height: h * u,
        padding: 0,
        backgroundColor: device.pad,
        borderRadius: 4 * u,
      }}
    >
      <text
        style={{ fontSize: 9 * u, lineHeight: 11 * u, color: device.padInk }}
      >
        {held.primary}
      </text>
    </Button>
  );
  return (
    <div
      style={{
        width: 84 * u,
        height: 66 * u,
        marginTop: 8 * u,
        borderRadius: 33 * u,
        backgroundColor: device.pad,
        borderWidth: Math.max(1, 1.5 * u),
        borderColor: device.padEdge,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 3 * u,
        paddingBottom: 3 * u,
      }}
    >
      {arm(pad.up, 30, 18)}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          width: 76 * u,
        }}
      >
        {arm(pad.left, 22, 20)}
        {arm(pad.right, 22, 20)}
      </div>
      {arm(pad.down, 30, 18)}
    </div>
  );
};

export const Keypad = ({
  keypad,
  shift,
  alpha,
  hyp,
  theme,
  u,
  press,
}: KeypadProps) => {
  const latchedIds = [
    ...(shift ? ["SHIFT"] : []),
    ...(alpha ? ["ALPHA"] : []),
    ...(hyp ? ["hyp"] : []),
  ];
  const common = { theme, u, press, latchedIds };
  return (
    <div
      testId="calc-keypad"
      style={{ display: "flex", flexDirection: "column", gap: 6 * u }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8 * u,
          alignItems: "flex-start",
        }}
      >
        <Rows rows={keypad.cluster.left} size="small" {...common} />
        <Pad pad={keypad.cluster.pad} u={u} press={press} />
        <Rows rows={keypad.cluster.right} size="small" {...common} />
      </div>
      <Rows rows={keypad.functions} size="small" {...common} />
      <div style={{ height: 4 * u }} />
      <Rows rows={keypad.main} size="large" {...common} />
    </div>
  );
};
