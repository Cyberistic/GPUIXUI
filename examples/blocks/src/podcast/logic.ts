import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Episode } from "./data.js";

const noise = (seed: number, index: number): number => {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const waveform = (seed: number, bars: number): ReadonlyArray<number> =>
  Arr.map(Arr.range(0, bars - 1), (i) => 6 + Math.round(noise(seed, i) * 30));

/** `h:mm:ss` past the hour, `m:ss` under it. */
export const clock = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours === 0
    ? `${minutes}:${rest}`
    : `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
};

/** The episode a row opens; the current one stays if the id is unknown. */
export const episodeOf = (
  list: ReadonlyArray<Episode>,
  id: string,
): Option.Option<Episode> =>
  Option.orElse(
    Arr.findFirst(list, (episode) => episode.id === id),
    () => Arr.head(list),
  );

/** Play/pause: a press on the playing episode pauses it, another starts one. */
export const transport = (playing: boolean): boolean => !playing;
