import {
  advancePlayhead,
  clampPlayhead,
  isFinished,
  MEDIA_TICK_MS,
  progressWidth,
  seekPlayhead,
  timeLabel,
  waveformSvg,
} from "@gpuixui/media/player/logic";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useEffect, useState } from "react";

/**
 * Browser preview for the MediaPlayer page.
 *
 * The runtime has no `video`/`audio` host and no playback verb, so the shipped
 * player is composition: the caller supplies each frame's bytes and the clip's
 * amplitude samples, and the component owns the clock, the transport and the
 * waveform. The preview plays exactly that part — its clock, keys, painted
 * share and waveform silhouette are `player/logic`'s — over three illustrated
 * frames standing in for the caller's decoded bytes.
 */

/** The clip the preview plays, in milliseconds. */
export const PLAYER_DURATION = 24_000;

/** The track's width in points, so the painted share is the package's arithmetic. */
export const PLAYER_TRACK = 360;

/** The clip's amplitude samples; the preview's own, drawn by `waveformSvg`. */
export const PLAYER_PEAKS: ReadonlyArray<number> = [
  0.18, 0.42, 0.3, 0.66, 0.5, 0.82, 0.44, 0.6, 0.28, 0.72, 0.54, 0.36, 0.9,
  0.48, 0.62, 0.34, 0.7, 0.46, 0.24, 0.58, 0.78, 0.4, 0.56, 0.32,
];

/** Three frames the caller "decodes"; the playhead picks the one on screen. */
const FRAMES: ReadonlyArray<string> = ["#2E2370", "#20405A", "#3F2A52"].map(
  (fill, index) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 135"><rect width="240" height="135" fill="${fill}"/><circle cx="${70 + index * 30}" cy="${54 - index * 8}" r="14" fill="#A7A9FF"/><path d="M0 120 L60 96 L120 108 L180 72 L240 86 L240 135 L0 135 Z" fill="#11131A"/></svg>`,
    )}`,
);

/** The frame a playhead stands on. */
export const frameAt = (playhead: number): string =>
  FRAMES[
    Math.min(
      FRAMES.length - 1,
      Math.floor(
        (clampPlayhead(playhead, PLAYER_DURATION) / PLAYER_DURATION) *
          FRAMES.length,
      ),
    )
  ] ?? "";

/** The arrow a browser key names, in the package's spelling. */
const transportKey = (key: string): string =>
  Match.value(key).pipe(
    Match.when("ArrowLeft", () => "left"),
    Match.when("ArrowRight", () => "right"),
    Match.when("Home", () => "home"),
    Match.when("End", () => "end"),
    Match.orElse(() => ""),
  );

const waveMask = (): string => {
  const source = waveformSvg(PLAYER_PEAKS, PLAYER_TRACK, 48);
  return `url("data:image/svg+xml,${encodeURIComponent(source)}")`;
};

export const MediaPlayerDemo = () => {
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const mask = waveMask();

  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(
      () =>
        setPlayhead((current) =>
          advancePlayhead(current, MEDIA_TICK_MS, PLAYER_DURATION),
        ),
      MEDIA_TICK_MS,
    );
    return () => clearInterval(tick);
  }, [playing]);

  // The transport stops itself at the clip's end, as the component's does.
  useEffect(() => {
    if (playing && isFinished(playhead, PLAYER_DURATION)) setPlaying(false);
  }, [playing, playhead]);

  const seek = (key: string): void => {
    Option.match(seekPlayhead(playhead, key, 1000, PLAYER_DURATION), {
      onNone: () => undefined,
      onSome: (next) => {
        setPlayhead(next);
        if (isFinished(next, PLAYER_DURATION)) setPlaying(false);
      },
    });
  };

  const finished = isFinished(playhead, PLAYER_DURATION);

  return (
    <div className="gx-player">
      <div className="gx-player-frame">
        <img alt="The clip's current frame" src={frameAt(playhead)} />
      </div>
      <div className="gx-player-wave" style={{ maskImage: mask }} />
      <div className="gx-player-track">
        <span
          className="gx-player-fill"
          style={{
            width: `${progressWidth(playhead, PLAYER_DURATION, PLAYER_TRACK)}px`,
          }}
        />
      </div>
      <div
        aria-label="Transport"
        className="gx-player-pad"
        onKeyDown={(event) => {
          const key = transportKey(event.key);
          if (key === "") return;
          event.preventDefault();
          seek(key);
        }}
        role="group"
        tabIndex={0}
      >
        <button
          aria-label="Go to start"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={() => seek("home")}
          type="button"
        >
          ⏮
        </button>
        <button
          aria-label="Seek back one second"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={() => seek("left")}
          type="button"
        >
          −1s
        </button>
        <button
          aria-label={playing ? "Pause" : finished ? "Replay" : "Play"}
          aria-pressed={playing}
          className="gx-btn gx-btn-primary gx-btn-sm"
          onClick={() => {
            if (finished) setPlayhead(0);
            setPlaying((current) => !current);
          }}
          type="button"
        >
          {playing ? "Pause" : finished ? "Replay" : "Play"}
        </button>
        <button
          aria-label="Seek forward one second"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={() => seek("right")}
          type="button"
        >
          +1s
        </button>
        <button
          aria-label="Go to end"
          className="gx-btn gx-btn-secondary gx-btn-sm"
          onClick={() => seek("end")}
          type="button"
        >
          ⏭
        </button>
        <span className="gx-player-clock" role="status">
          {timeLabel(playhead, PLAYER_DURATION)}
        </span>
      </div>
    </div>
  );
};

export const mediaPlayerDemoSource = `import * as Option from "effect/Option";
import { MediaPlayer } from "@gpuixui/media";

<MediaPlayer
  duration={clip.duration}
  frameAt={(playhead) => Option.some(frames[Math.floor(playhead / 1000)] ?? first)}
  alt="A clip's frame"
  label={clip.label}
  peaks={clip.peaks}
  seekStep={500}
  onPlayheadChange={(playhead) => savePosition(playhead)}
/>;`;
