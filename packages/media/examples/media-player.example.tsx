/** @jsxImportSource @gpuix/react */
/**
 * MediaPlayer example: a four-frame clip with Mux's chrome over it.
 *
 * The frames are generated here because the runtime has no playback host: the
 * caller owns decoding, and this screen hands the player one colour per second.
 * The same player without `frameAt` is the poster-less form. Press the timeline
 * to seek to that share of the clip, drag it while the primary button is held,
 * or use Space, the arrows, `M` and `F` on the player.
 */

import * as Option from "effect/Option";
import { MediaPlayer, type MediaFrame } from "../src/media-player.js";

const FRAMES: ReadonlyArray<readonly [number, number, number]> = [
  [30, 58, 138],
  [124, 58, 237],
  [180, 83, 9],
  [4, 120, 87],
];

/** One second per frame, as straight RGBA bytes. */
const frameAt = (playhead: number): Option.Option<MediaFrame> => {
  const colour =
    FRAMES[Math.min(FRAMES.length - 1, Math.floor(playhead / 1000))];
  if (colour === undefined) return Option.none();
  const [r, g, b] = colour;
  return Option.some({
    width: 160,
    height: 90,
    pixels: Uint8Array.from({ length: 160 * 90 * 4 }, (_, at) =>
      at % 4 === 3 ? 255 : ([r, g, b][at % 4] ?? 0),
    ),
  });
};

export const MediaPlayerExample = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <MediaPlayer
      duration={4000}
      alt="A generated clip's frame"
      label="Generated clip"
      width={480}
      height={270}
      buffered={3000}
      qualities={["Auto", "1080p", "720p"]}
      frameAt={frameAt}
    />
    <MediaPlayer
      duration={4000}
      alt=""
      label="Poster-less clip"
      width={480}
      height={270}
      qualities={["Auto", "1080p"]}
    />
  </div>
);
