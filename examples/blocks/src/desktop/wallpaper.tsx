import type { LinearGradientBackground, StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import type { DesktopLook } from "./data.js";

export const gradient = (
  angle: number,
  from: string,
  to: string,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle,
  stops: [
    { color: from, position: 0 },
    { color: to, position: 1 },
  ],
});

const fill = (style: StyleDesc): StyleDesc => ({
  position: "absolute",
  ...style,
});

const disc = (
  x: number,
  y: number,
  size: number,
  style: StyleDesc,
): StyleDesc =>
  fill({
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  });

const clouds: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.12, 0.12, 0.22, 0.05],
  [0.2, 0.17, 0.16, 0.04],
  [0.55, 0.08, 0.26, 0.055],
  [0.66, 0.14, 0.18, 0.04],
  [0.84, 0.22, 0.2, 0.045],
];

const Hill = ({ width, height }: { width: number; height: number }) => (
  <>
    <div
      style={fill({
        left: 0,
        top: 0,
        width,
        height,
        background: gradient(180, "#1D5FD0", "#9CCBF6"),
      })}
    />
    {Arr.map(clouds, ([x, y, w, h], i) => (
      <div
        key={i}
        style={fill({
          left: x * width,
          top: y * height,
          width: w * width,
          height: h * height,
          borderRadius: h * height,
          background: gradient(180, "#FFFFFFEE", "#FFFFFF99"),
        })}
      />
    ))}
    <div
      style={disc(width * 0.62, height * 0.62 + width * 1.5, width * 3.1, {
        background: gradient(180, "#4F9A2E", "#2F6E17"),
      })}
    />
    <div
      style={disc(width * 0.4, height * 0.58 + width * 1.4, width * 2.9, {
        background: gradient(180, "#7FC444", "#3E8A1E"),
      })}
    />
  </>
);

const Bloom = ({ width, height }: { width: number; height: number }) => (
  <>
    <div
      style={fill({
        left: 0,
        top: 0,
        width,
        height,
        background: gradient(160, "#0B2F6B", "#2A7FD4"),
      })}
    />
    <div
      style={disc(width * 0.78, height * 0.18, width * 0.9, {
        background: gradient(180, "#9FD3FF55", "#9FD3FF00"),
      })}
    />
    <div
      style={disc(width * 0.2, height * 0.95, width * 0.8, {
        background: gradient(0, "#4FB0FF66", "#4FB0FF00"),
      })}
    />
    <div
      style={disc(width * 0.55, height * 0.55, width * 0.35, {
        background: gradient(135, "#FFFFFF2E", "#FFFFFF00"),
      })}
    />
  </>
);

export const Wallpaper = ({
  look,
  width,
  height,
}: {
  look: DesktopLook;
  width: number;
  height: number;
}) => (
  <div style={fill({ left: 0, top: 0, width, height, overflow: "hidden" })}>
    {look === "luna" ? (
      <Hill width={width} height={height} />
    ) : (
      <Bloom width={width} height={height} />
    )}
  </div>
);
