/**
 * The player's pure part: a track's waveform from its seed, the clock, and the
 * two presses the block listens for (a row, the transport).
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Track } from "./data.js";

/** A stable pseudo-random in `[0, 1)` for one slot of one track. */
const noise = (seed: number, index: number): number => {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** `bars` heights in px, the shape of the track's waveform. */
export const waveform = (seed: number, bars: number): ReadonlyArray<number> =>
  Arr.map(Arr.range(0, bars - 1), (i) => 6 + Math.round(noise(seed, i) * 30));

/** `m:ss`. */
export const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The track a row opens; the current one stays if the id is unknown. */
export const trackOf = (
  tracks: ReadonlyArray<Track>,
  id: string,
): Option.Option<Track> =>
  Option.orElse(
    Arr.findFirst(tracks, (track) => track.id === id),
    () => Arr.head(tracks),
  );

/** Play/pause: a press on the playing track pauses it, another starts one. */
export const transport = (playing: boolean): boolean => !playing;
