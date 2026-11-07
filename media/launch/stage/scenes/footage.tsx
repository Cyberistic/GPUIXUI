import { useEffect, useState, type CSSProperties } from "react";
import { clock } from "../kit/clock";

const takes = import.meta.glob("../../takes/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const framesOf = (take: string): ReadonlyArray<string> =>
  Object.keys(takes)
    .filter((path) => path.includes(`/takes/${take}/`))
    .sort()
    .map((path) => takes[path] as string);

export interface FootageProps {
  readonly take: string;
  /** Starts playing when true; before, it holds its first frame. */
  readonly play: boolean;
  /** The take's size in output pixels, and how much of it to show. */
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  /** The output-pixel point placed at the box's top-left. */
  readonly at?: { readonly x: number; readonly y: number };
  readonly style?: CSSProperties;
}

export function Footage({
  take,
  play,
  width,
  height,
  scale,
  at = { x: 0, y: 0 },
  style,
}: FootageProps) {
  const frames = framesOf(take);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!play) return;
    const start = clock.now();
    let id = 0;
    const tick = () => {
      setIndex(
        Math.min(
          frames.length - 1,
          Math.floor(((clock.now() - start) * 30) / 1000),
        ),
      );
      id = clock.raf(tick);
    };
    id = clock.raf(tick);
    return () => clock.cancelRaf(id);
  }, [play, frames.length]);
  return (
    <img
      alt=""
      src={frames[index]}
      style={{
        position: "absolute",
        left: -at.x * scale,
        top: -at.y * scale,
        width: width * scale,
        height: height * scale,
        maxWidth: "none",
        ...style,
      }}
    />
  );
}
