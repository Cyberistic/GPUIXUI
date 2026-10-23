/**
 * `MediaPlayer`: a clip's frames and a transport, composed from what this
 * runtime actually gives a player.
 *
 * There is no `video` or `audio` intrinsic element and no playback verb — the
 * typings declare twelve elements and neither is one — so nothing decodes or
 * plays audio here. The player owns the two halves a window can paint: the
 * **picture**, which the caller supplies as straight-RGBA bytes for a playhead
 * and which is pushed through `setImagePixels` from a layout effect (the route
 * `media-frame-lifecycle` measured), and the **transport**, a clock the app
 * owns, a progress track and a seek pad the runtime can focus.
 *
 * The clip's frames are the caller's because decoding is theirs: a file, a
 * network stream or a generated sequence all answer the same `MediaFrame`.
 * The waveform is drawn from amplitude samples as one tinted `<svg>` mask —
 * the runtime's one drawing route.
 */

import type { ImgInstance, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Button } from "@gpuixui/primitives/button";
import { keyboardFocusRing, textStyle } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import { accessibleName } from "./name.js";
import {
  advancePlayhead,
  clampPlayhead,
  durationOf,
  isFinished,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  progressWidth,
  seekPlayhead,
  stepOf,
  timeLabel,
  waveformSvg,
  type MediaKey,
  type MediaState,
} from "./player/logic.js";

/** One frame of the clip: the bytes the picture paints and their box. */
export interface MediaFrame {
  readonly width: number;
  readonly height: number;
  /** Straight RGBA bytes, `width * height * 4` of them. */
  readonly pixels: Uint8Array;
}

/** The frame a playhead stands on; `None` paints no new picture. */
export type MediaFrameAt = (playhead: number) => Option.Option<MediaFrame>;

/** The handler side of the transport, owned by the React wrapper. */
export interface MediaPlayerSurface {
  readonly onToggle: () => void;
  readonly onSeek: (event: MediaKey) => void;
}

/** {@link MediaPlayer} props. */
export interface MediaPlayerProps extends Omit<Props, "children"> {
  /** The clip's length in milliseconds; a value that is not a positive number reads as zero. */
  readonly duration: number;
  /**
   * The frame each playhead stands on. Omit it for an audio-style player: the
   * waveform and the transport still paint, with no picture.
   */
  readonly frameAt?: MediaFrameAt;
  /** The picture's accessible name. A blank one reads as the player's name. */
  readonly alt: string;
  /** The player's accessible name. Default `"Media player"`; a blank name reads as the default. */
  readonly label?: string;
  /** The picture's width in points. Default `240`. */
  readonly width?: number;
  /** The picture's height in points. Default `135`. */
  readonly height?: number;
  /** The progress track's width in points. Default `200`. */
  readonly trackWidth?: number;
  /** The clip's amplitude samples, `0…1`, drawn as a waveform. */
  readonly peaks?: ReadonlyArray<number>;
  /** The playhead to start from. Default `0`. */
  readonly defaultPlayhead?: number;
  /** Reports every playhead the player moves to. */
  readonly onPlayheadChange?: (playhead: number) => void;
  /** Start playing. Default `false`. */
  readonly defaultPlaying?: boolean;
  /** Reports every change of state the transport makes. */
  readonly onPlayingChange?: (playing: boolean) => void;
  /** The clock's interval in milliseconds. Default `100`; an unreadable value reads as the default. */
  readonly tickMs?: number;
  /** How far Left and Right seek, in milliseconds. Default `1000`. */
  readonly seekStep?: number;
  /** The resting action's words. Default `"Play"`; a blank label reads as the default. */
  readonly playLabel?: string;
  /** The running action's words. Default `"Pause"`; a blank label reads as the default. */
  readonly pauseLabel?: string;
  /** Refuse the transport; the picture and the waveform keep painting. */
  readonly disabled?: boolean;
  readonly className?: string;
}

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 135;
const DEFAULT_TRACK_WIDTH = 200;
const DEFAULT_LABEL = "Media player";
const DEFAULT_PLAY_LABEL = "Play";
const DEFAULT_PAUSE_LABEL = "Pause";
const WAVEFORM_HEIGHT = 32;
const TRACK_HEIGHT = 6;

/** A side, or the default when the value cannot be laid out. */
const sideOf = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const isFrame = (frame: MediaFrame): boolean =>
  Number.isFinite(frame.width) &&
  frame.width > 0 &&
  Number.isFinite(frame.height) &&
  frame.height > 0 &&
  frame.pixels.length >= frame.width * frame.height * 4;

const frameStyle = (
  theme: Theme,
  width: number,
  height: number,
): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width,
  height,
  borderRadius: theme.radius.md,
  overflow: "hidden",
  backgroundColor: theme.colors.muted,
});

const trackStyle = (theme: Theme, width: number): StyleDesc => ({
  width,
  height: TRACK_HEIGHT,
  borderRadius: TRACK_HEIGHT,
  backgroundColor: theme.colors.muted,
});

/** The element `MediaPlayer` renders. Pure in its arguments. */
export const renderMediaPlayer = (
  props: MediaPlayerProps,
  theme: Theme,
  state: MediaState,
  surface: MediaPlayerSurface,
  poster: RefObject<ImgInstance | null>,
): ReactElement => {
  const {
    duration,
    frameAt,
    alt,
    label,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    trackWidth = DEFAULT_TRACK_WIDTH,
    peaks,
    defaultPlayhead: _defaultPlayhead,
    onPlayheadChange: _onPlayheadChange,
    defaultPlaying: _defaultPlaying,
    onPlayingChange: _onPlayingChange,
    tickMs: _tickMs,
    seekStep: _seekStep,
    playLabel,
    pauseLabel,
    disabled = false,
    className,
    style,
    ...rest
  } = props;
  const end = durationOf(duration);
  const playhead = clampPlayhead(state.playhead, end);
  const clock = timeLabel(playhead, end);
  const name = accessibleName(label, DEFAULT_LABEL);
  const pictureName = accessibleName(alt, name);
  const playWord = accessibleName(playLabel, DEFAULT_PLAY_LABEL);
  const pauseWord = accessibleName(pauseLabel, DEFAULT_PAUSE_LABEL);
  const boxWidth = sideOf(width, DEFAULT_WIDTH);
  const boxHeight = sideOf(height, DEFAULT_HEIGHT);
  const barWidth = sideOf(trackWidth, DEFAULT_TRACK_WIDTH);
  const waveform = waveformSvg(peaks ?? [], barWidth, WAVEFORM_HEIGHT);

  return (
    <div
      {...rest}
      role="group"
      aria-label={name}
      style={mergeStyles(
        recipeStyle(cn("flex flex-col gap-2", className), theme),
        style,
      )}
    >
      {frameAt === undefined ? null : (
        <img
          testId="media-poster"
          ref={poster}
          alt={pictureName}
          objectFit="fill"
          style={frameStyle(theme, boxWidth, boxHeight)}
        />
      )}
      {waveform === "" ? null : (
        <svg
          testId="media-waveform"
          source={waveform}
          style={{
            width: barWidth,
            height: WAVEFORM_HEIGHT,
            color: theme.colors.mutedForeground,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          testId="media-play"
          disabled={disabled}
          onActivate={surface.onToggle}
        >
          {state.playing ? pauseWord : playWord}
        </Button>
        <div testId="media-track" style={trackStyle(theme, barWidth)}>
          <div
            testId="media-fill"
            style={{
              width: progressWidth(playhead, end, barWidth),
              height: TRACK_HEIGHT,
              borderRadius: TRACK_HEIGHT,
              backgroundColor: theme.colors.primary,
            }}
          />
        </div>
        <text
          testId="media-time"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          {clock}
        </text>
      </div>
      <div
        testId="media-seek"
        role="slider"
        aria-label={`${name} position`}
        aria-valuetext={clock}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => surface.onSeek(event)}
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.card,
          ...(disabled ? {} : keyboardFocusRing(theme)),
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Seek: Home, End, Left, Right
        </text>
      </div>
    </div>
  );
};

/** A clip's picture and transport, with an app-owned clock. */
export const MediaPlayer = (props: MediaPlayerProps): ReactElement => {
  const theme = useTheme();
  const duration = durationOf(props.duration);
  const tick = stepOf(props.tickMs ?? MEDIA_TICK_MS, MEDIA_TICK_MS);
  const seekStep = stepOf(
    props.seekStep ?? MEDIA_SEEK_STEP_MS,
    MEDIA_SEEK_STEP_MS,
  );
  const poster = useRef<ImgInstance | null>(null);
  const [state, setState] = useState<MediaState>(() => ({
    playing: props.defaultPlaying === true && duration > 0,
    playhead: clampPlayhead(props.defaultPlayhead ?? 0, duration),
  }));
  const stateRef = useRef(state);

  /**
   * The only writer: every move is clamped once, the paint and the reports read
   * the same settled state, and a move that changes nothing reports nothing.
   */
  const commit = (next: MediaState): void => {
    const current = stateRef.current;
    const settled: MediaState = {
      playing: next.playing && duration > 0,
      playhead: clampPlayhead(next.playhead, duration),
    };
    if (
      settled.playing === current.playing &&
      settled.playhead === current.playhead
    ) {
      return;
    }
    stateRef.current = settled;
    setState(settled);
    if (settled.playhead !== current.playhead) {
      props.onPlayheadChange?.(settled.playhead);
    }
    if (settled.playing !== current.playing) {
      props.onPlayingChange?.(settled.playing);
    }
  };

  // The app's clock: a clip is not a host feature, so the interval is the
  // player's and it advances the playhead in its own ticks.
  useEffect(() => {
    if (!state.playing || props.disabled === true) return undefined;
    const timer = setInterval(() => {
      const current = stateRef.current;
      commit({
        playing: true,
        playhead: advancePlayhead(current.playhead, tick, duration),
      });
    }, tick);
    return () => clearInterval(timer);
  }, [state.playing, props.disabled, tick, duration]);

  // The clip ran out: the transport stops itself where the picture ends.
  useEffect(() => {
    if (state.playing && isFinished(state.playhead, duration)) {
      commit({ playing: false, playhead: state.playhead });
    }
  }, [state.playing, state.playhead, duration]);

  // A player disabled while running stops: its clock is not a background job.
  useEffect(() => {
    if (props.disabled === true && stateRef.current.playing) {
      commit({ ...stateRef.current, playing: false });
    }
  }, [props.disabled]);

  // A shorter clip than the stored playhead clamps it once and reports it, so
  // a restored position cannot leave the transport at a point the clip lacks.
  useEffect(() => {
    const current = stateRef.current;
    if (current.playhead !== clampPlayhead(current.playhead, duration)) {
      commit({
        ...current,
        playhead: clampPlayhead(current.playhead, duration),
      });
    }
  }, [duration]);

  // Every playhead move paints the frame it stands on, from the bytes in hand:
  // the layout effect puts them on the element before the frame that shows it.
  useLayoutEffect(() => {
    const instance = poster.current;
    const frameAt = props.frameAt;
    if (instance === null || frameAt === undefined) return;
    Option.match(Option.filter(frameAt(state.playhead), isFrame), {
      onNone: () => undefined,
      onSome: (frame) =>
        instance.setImagePixels(frame.width, frame.height, frame.pixels),
    });
  }, [state.playhead, props.frameAt]);

  const surface: MediaPlayerSurface = {
    onToggle: () => {
      if (props.disabled === true) return;
      const current = stateRef.current;
      if (current.playing) {
        commit({ ...current, playing: false });
        return;
      }
      if (duration <= 0) return;
      // Play from a finished clip restarts it, the way a player's own button does.
      commit({
        playing: true,
        playhead: isFinished(current.playhead, duration) ? 0 : current.playhead,
      });
    },
    onSeek: (event) => {
      if (props.disabled === true) return;
      Option.match(
        seekPlayhead(
          stateRef.current.playhead,
          event.key ?? "",
          seekStep,
          duration,
        ),
        {
          onNone: () => undefined,
          onSome: (next) => {
            event.preventDefault?.();
            commit({ ...stateRef.current, playhead: next });
          },
        },
      );
    },
  };

  return renderMediaPlayer(props, theme, state, surface, poster);
};
