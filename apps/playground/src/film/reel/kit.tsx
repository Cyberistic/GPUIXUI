/** @jsxImportSource @gpuix/react */
import { Text } from "@gpuixui/primitives";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { pressed, sp, track } from "./motion.js";

export const W = 960,
  H = 540;
export const BG = "#0b0b0d",
  PANEL = "#141417",
  TEXT = "#ededef",
  MUTED = "#9a9aa3",
  FAINT = "#5f5f68",
  HAIR = "#ffffff14";
export const SANS = "Inter",
  MONO = "IBM Plex Mono";

export { ShaderLayer as FxView } from "@gpuixui/fx/shader-layer";
export const RawShader = "gpuixui-shader" as unknown as (
  props: Record<string, unknown>,
) => ReactNode;

export const alpha = (hex: string, a: number): string =>
  `${hex}${Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, "0")}`;

export const T = ({
  s,
  size,
  weight = 400,
  color = TEXT,
  a = 1,
  mono = false,
  style,
}: {
  readonly s: string;
  readonly size: number;
  readonly weight?: number;
  readonly color?: string;
  readonly a?: number;
  readonly mono?: boolean;
  readonly style?: Record<string, unknown>;
}): ReactNode => (
  <Text
    style={{
      fontFamily: mono ? MONO : SANS,
      fontSize: size,
      lineHeight: Math.round(size * 1.21),
      fontWeight: weight,
      color: alpha(color, a),
      ...style,
    }}
  >
    {s}
  </Text>
);

export const at = (x: number, y: number, w?: number, h?: number) =>
  ({
    position: "absolute",
    left: x,
    top: y,
    ...(w === undefined ? {} : { width: w }),
    ...(h === undefined ? {} : { height: h }),
  }) as const;
export const row = (gap = 0) =>
  ({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap,
  }) as const;
export const col = (gap = 0) =>
  ({ display: "flex", flexDirection: "column", gap }) as const;
export const center = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

export const REEL_THEME = {
  ...darkTheme,
  colors: {
    ...darkTheme.colors,
    background: BG,
    card: "#161618",
    popover: "#161618",
    muted: "#222226",
    secondary: "#28282c",
    accent: "#2a2a2e",
    selected: "#434347",
    hover: "#ffffff0d",
    border: "#ffffff14",
    input: "#ffffff1a",
    primary: "#f2f2f4",
    primaryForeground: "#0e0e10",
    foreground: TEXT,
    mutedForeground: MUTED,
  },
};
export const Root = ({
  fill,
  children,
}: {
  readonly fill: string;
  readonly children: ReactNode;
}): ReactNode => (
  <ThemeProvider theme={REEL_THEME}>
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        overflow: "hidden",
        backgroundColor: fill,
      }}
    >
      {children}
    </div>
  </ThemeProvider>
);

export const Pointer = ({
  x,
  y,
  press,
}: {
  readonly x: number;
  readonly y: number;
  readonly press: number;
}): ReactNode => {
  const r = 9 * (1 - 0.22 * press);
  return (
    <div
      style={{
        ...at(x - r, y - r, 2 * r, 2 * r),
        borderRadius: r,
        backgroundColor: "#f4f4f6eb",
        borderWidth: 1,
        borderColor: "#00000059",
        boxShadow: {
          offsetX: 0,
          offsetY: 2,
          blurRadius: 8,
          spreadRadius: 0,
          color: "#00000073",
        },
      }}
    />
  );
};

export const PointerAt = ({
  t,
  start,
  path,
  taps,
}: {
  readonly t: number;
  readonly start: readonly [number, number];
  readonly path: ReadonlyArray<readonly [number, number, number]>;
  readonly taps: ReadonlyArray<number>;
}): ReactNode => {
  const s = sp(0.55, 0);
  const x = track(
    t,
    start[0],
    path.map(([tk, px]) => [tk, px, s] as const),
  );
  const y = track(
    t,
    start[1],
    path.map(([tk, , py]) => [tk, py, s] as const),
  );
  const k = taps.flatMap(
    (tp) =>
      [
        [tp, 1, sp(0.12, 0)],
        [tp + 0.14, 0, sp(0.3, 0.4)],
      ] as const,
  );
  return <Pointer x={x} y={y} press={track(t, 0, k)} />;
};

export const Dot = ({
  color,
  size,
  style,
}: {
  readonly color: string;
  readonly size: number;
  readonly style?: Record<string, unknown>;
}): ReactNode => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      flexShrink: 0,
      ...style,
    }}
  />
);

export { pressed };
