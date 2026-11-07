/** @jsxImportSource @gpuix/react */
import {
  useGpuix,
  type ImgInstance,
  type Props,
  type PublicInstance,
  type StyleDesc,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@gpuixui/components/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gpuixui/components/popover";
import { Icon } from "@gpuixui/icons";
import { Button, IconButton } from "@gpuixui/primitives/button";
import { Slider } from "@gpuixui/primitives/slider";
import { keyboardFocusRing, targetSize, textStyle } from "@gpuixui/tokens";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
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
  frameAtOf,
  isFinished,
  isFrame,
  isScrubPress,
  mediaPaint,
  MEDIA_LARGE_SEEK_STEP_MS,
  MEDIA_RATES,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  playerIntent,
  qualityOf,
  rateLabel,
  rateOf,
  restingState,
  scrubPlayhead,
  seekIntent,
  stepOf,
  toggleIntent,
  volumeOf,
  type MediaFrameAt,
  type MediaIntent,
  type MediaKey,
  type MediaPointer,
  type MediaPopup,
  type MediaState,
} from "./player/logic.js";

export type {
  MediaFrame,
  MediaFrameAt,
  MediaIntent,
  MediaPopup,
} from "./player/logic.js";

export interface MediaPlayerSurface {
  readonly onIntent: (intent: MediaIntent) => void;

  readonly onVolume: (level: number) => void;
  readonly onRate: (rate: number) => void;
  readonly onQuality: (quality: string) => void;

  readonly onPopup: (popup: MediaPopup | null) => void;

  readonly onTrackDown: (event: MediaPointer) => void;
  readonly onTrackMove: (event: MediaPointer) => void;
  readonly onTrackUp: () => void;

  readonly onActivity: () => void;

  readonly onKey: (event: MediaKey) => void;

  readonly registerRoot: (instance: PublicInstance | null) => void;
  readonly registerTrack: (instance: PublicInstance | null) => void;
}

export interface MediaPlayerProps extends Omit<Props, "children"> {
  readonly duration: number;

  readonly frameAt?: MediaFrameAt | null;

  readonly alt: string;

  readonly label?: string;

  readonly width?: number;

  readonly height?: number;

  readonly buffered?: number;

  readonly defaultPlayhead?: number;

  readonly onPlayheadChange?: (playhead: number) => void;

  readonly defaultPlaying?: boolean;

  readonly onPlayingChange?: (playing: boolean) => void;

  readonly defaultVolume?: number;

  readonly onVolumeChange?: (volume: number) => void;

  readonly defaultMuted?: boolean;

  readonly onMutedChange?: (muted: boolean) => void;

  readonly rates?: ReadonlyArray<number>;

  readonly defaultRate?: number;

  readonly onRateChange?: (rate: number) => void;

  readonly qualities?: ReadonlyArray<string>;

  readonly defaultQuality?: string;

  readonly onQualityChange?: (quality: string) => void;

  readonly tickMs?: number;

  readonly seekStep?: number;

  readonly largeSeekStep?: number;

  readonly idleMs?: number;

  readonly onFullscreenChange?: (fullscreen: boolean) => void;

  readonly playLabel?: string;

  readonly pauseLabel?: string;

  readonly disabled?: boolean;
  readonly className?: string;
}

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const DEFAULT_LABEL = "Media player";
const DEFAULT_PLAY_LABEL = "Play";
const DEFAULT_PAUSE_LABEL = "Pause";
const DEFAULT_IDLE_MS = 3000;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 12;
const CENTER_PLAY_SIZE = 56;
const VOLUME_MAX = 100;

const sideOf = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const trackWidthOf = (width: number, inset: number): number =>
  Math.max(width - inset * 2, 0);

const frameStyle = (
  theme: Theme,
  width: number,
  height: number,
): StyleDesc => ({
  position: "relative",
  width,
  height,
  borderRadius: theme.radius.md,
  backgroundColor: theme.colors.muted,
  overflow: "visible",
});

const posterStyle = (theme: Theme): StyleDesc => ({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  borderRadius: theme.radius.md,
  pointerEvents: "none",
});

const scrimStyle = (theme: Theme, visible: boolean): StyleDesc => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: theme.spacing["5xl"],
  borderBottomLeftRadius: theme.radius.md,
  borderBottomRightRadius: theme.radius.md,
  backgroundColor: theme.colors.background,
  opacity: visible ? 0.82 : 0,
  pointerEvents: "none",
});

const centerStyle = (visible: boolean): StyleDesc => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: visible ? 1 : 0,
  pointerEvents: "none",
});

const barStyle = (theme: Theme, visible: boolean): StyleDesc => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.xs,
  padding: theme.spacing.md,
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? "auto" : "none",
});

const rowStyle = (theme: Theme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.xs,
});

const trackStyle = (theme: Theme, width: number): StyleDesc => ({
  position: "relative",
  width,
  height: TRACK_HEIGHT,
  borderRadius: TRACK_HEIGHT,
  backgroundColor: theme.colors.muted,
  pointerEvents: "none",
});

const fillStyle = (
  color: string,
  width: number,
  height: number,
): StyleDesc => ({
  position: "absolute",
  top: 0,
  left: 0,
  width,
  height,
  borderRadius: height,
  backgroundColor: color,
  pointerEvents: "none",
});

const rateRows = (
  rate: number,
  rates: ReadonlyArray<number>,
  onRate: (rate: number) => void,
): ReactElement => (
  <DropdownMenuRadioGroup
    label="Playback speed"
    value={String(rate)}
    onValueChange={(value) => onRate(rateOf(Number(value)))}
  >
    {rates.map((value) => (
      <DropdownMenuRadioItem key={value} value={String(value)}>
        {rateLabel(value)}
      </DropdownMenuRadioItem>
    ))}
  </DropdownMenuRadioGroup>
);

const qualityRows = (
  quality: string,
  qualities: ReadonlyArray<string>,
  onQuality: (quality: string) => void,
): ReactElement | null =>
  qualities.length === 0 ? null : (
    <DropdownMenuRadioGroup
      label="Quality"
      value={quality}
      onValueChange={onQuality}
    >
      {qualities.map((value) => (
        <DropdownMenuRadioItem key={value} value={value}>
          {value}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );

const popupOf = (state: MediaState, popup: MediaPopup): boolean =>
  state.popup === popup;

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
    buffered,
    defaultPlayhead: _defaultPlayhead,
    onPlayheadChange: _onPlayheadChange,
    defaultPlaying: _defaultPlaying,
    onPlayingChange: _onPlayingChange,
    defaultVolume: _defaultVolume,
    onVolumeChange: _onVolumeChange,
    defaultMuted: _defaultMuted,
    onMutedChange: _onMutedChange,
    rates = MEDIA_RATES,
    defaultRate: _defaultRate,
    onRateChange: _onRateChange,
    qualities = [],
    defaultQuality: _defaultQuality,
    onQualityChange: _onQualityChange,
    tickMs: _tickMs,
    seekStep = MEDIA_SEEK_STEP_MS,
    largeSeekStep: _largeSeekStep,
    idleMs: _idleMs,
    onFullscreenChange: _onFullscreenChange,
    playLabel,
    pauseLabel,
    disabled = false,
    className,
    style,
    testId = "media-player",
    ...rest
  } = props;
  const end = durationOf(duration);
  const playhead = clampPlayhead(state.playhead, end);
  const boxWidth = sideOf(width, DEFAULT_WIDTH);
  const boxHeight = sideOf(height, DEFAULT_HEIGHT);
  const barWidth = trackWidthOf(boxWidth, theme.spacing.md);
  const paint = mediaPaint(
    { ...state, playhead },
    buffered ?? end,
    end,
    barWidth,
    THUMB_SIZE,
  );
  const name = accessibleName(label, DEFAULT_LABEL);
  const pictureName = accessibleName(alt, name);
  const playWord = accessibleName(playLabel, DEFAULT_PLAY_LABEL);
  const pauseWord = accessibleName(pauseLabel, DEFAULT_PAUSE_LABEL);
  const frameSource = frameAtOf(frameAt);
  const { playing } = state;
  const visible = state.controls;
  const muted = state.muted || state.volume === 0;
  const level = Math.round(state.volume * VOLUME_MAX);
  const quality = qualityOf(state.quality, qualities);
  const ratesOffered = rates.length === 0 ? MEDIA_RATES : rates;
  const onActivity = surface.onActivity;
  const action = (intent: MediaIntent) => () => surface.onIntent(intent);

  return (
    <div
      {...rest}
      testId={testId}
      ref={surface.registerRoot}
      role="group"
      aria-label={name}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => surface.onKey(event)}
      onFocus={onActivity}
      onMouseMove={onActivity}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn("flex flex-col", className), theme), {
          ...frameStyle(theme, boxWidth, boxHeight),
          ...(disabled ? {} : keyboardFocusRing(theme)),
        }),
        style,
      )}
    >
      {frameSource === undefined ? null : (
        <img
          testId="media-poster"
          ref={poster}
          alt={pictureName}
          objectFit="cover"
          style={posterStyle(theme)}
        />
      )}
      <div testId="media-scrim" style={scrimStyle(theme, visible)} />
      {!playing || visible ? (
        <div style={centerStyle(!playing || visible)} onMouseMove={onActivity}>
          {}
          <div
            style={{
              position: "absolute",
              width: CENTER_PLAY_SIZE,
              height: CENTER_PLAY_SIZE,
              borderRadius: CENTER_PLAY_SIZE / 2,
              backgroundColor: theme.colors.secondary,
              pointerEvents: "none",
            }}
          />
          <IconButton
            testId="media-play"
            label={playing ? pauseWord : playWord}
            icon={
              <Icon
                name={playing ? "pause" : "play"}
                color={theme.colors.secondaryForeground}
                size={24}
              />
            }
            size="lg"
            disabled={disabled}
            onFocus={onActivity}
            onActivate={action(toggleIntent)}
            style={{
              width: CENTER_PLAY_SIZE,
              height: CENTER_PLAY_SIZE,
              borderRadius: CENTER_PLAY_SIZE / 2,
              hover: { backgroundColor: theme.colors.hover },
              active: { backgroundColor: theme.colors.active },
            }}
          />
        </div>
      ) : null}
      <div
        testId="media-controls"
        onMouseMove={onActivity}
        style={barStyle(theme, visible)}
      >
        <div
          testId="media-track-hit"
          ref={surface.registerTrack}
          role="slider"
          aria-label={`${name} position`}
          aria-valuetext={paint.clock}
          tabIndex={disabled ? -1 : 0}
          onFocus={onActivity}
          onMouseDown={
            disabled ? undefined : (event) => surface.onTrackDown(event)
          }
          onMouseMove={
            disabled ? undefined : (event) => surface.onTrackMove(event)
          }
          onMouseUp={() => surface.onTrackUp()}
          onMouseLeave={() => surface.onTrackUp()}
          style={{
            display: "flex",
            alignItems: "center",
            height: targetSize.minimum,
            cursor: disabled ? "default" : "pointer",
            ...(disabled ? {} : keyboardFocusRing(theme)),
          }}
        >
          <div testId="media-track" style={trackStyle(theme, barWidth)}>
            <div
              testId="media-buffered"
              style={fillStyle(
                theme.colors.mutedForeground,
                paint.buffered,
                TRACK_HEIGHT,
              )}
            />
            <div
              testId="media-fill"
              style={fillStyle(
                theme.colors.primary,
                paint.played,
                TRACK_HEIGHT,
              )}
            />
            <div
              testId="media-thumb"
              style={{
                position: "absolute",
                top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
                left: paint.thumb,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: theme.colors.primary,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
        <div style={rowStyle(theme)}>
          <IconButton
            testId="media-play-bar"
            label={playing ? pauseWord : playWord}
            icon={
              <Icon
                name={playing ? "pause" : "play"}
                color={theme.colors.foreground}
                size={16}
              />
            }
            size="sm"
            disabled={disabled}
            onFocus={onActivity}
            onActivate={action(toggleIntent)}
          />
          <Button
            testId="media-back"
            variant="ghost"
            size="sm"
            label="Seek back one second"
            disabled={disabled}
            onFocus={onActivity}
            onActivate={action(seekIntent(-seekStep))}
          >
            −1s
          </Button>
          <Button
            testId="media-forward"
            variant="ghost"
            size="sm"
            label="Seek forward one second"
            disabled={disabled}
            onFocus={onActivity}
            onActivate={action(seekIntent(seekStep))}
          >
            +1s
          </Button>
          <text
            testId="media-time"
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
              fontFamily: theme.typography.mono,
            }}
          >
            {paint.clock}
          </text>
          <div style={{ flexGrow: 1 }} />
          <IconButton
            testId="media-mute"
            label={muted ? "Unmute" : "Mute"}
            icon={
              <Icon
                name={muted ? "volume-x" : "volume-2"}
                color={theme.colors.foreground}
                size={16}
              />
            }
            size="sm"
            disabled={disabled}
            onFocus={onActivity}
            onActivate={action({ kind: "mute" })}
          />
          <Popover
            open={popupOf(state, "volume")}
            onOpenChange={(open) => surface.onPopup(open ? "volume" : null)}
          >
            <PopoverTrigger
              testId="media-volume"
              variant="ghost"
              size="sm"
              square
              label="Volume"
              disabled={disabled}
              onFocus={onActivity}
              leading={
                <Icon
                  name="sliders-horizontal"
                  color={theme.colors.foreground}
                  size={16}
                />
              }
            />
            <PopoverContent
              testId="media-volume-popover"
              side="top"
              align="center"
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.spacing.sm,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.mutedForeground,
                  }}
                >
                  Volume {level}%
                </text>
                <Slider
                  label="Volume"
                  value={level}
                  min={0}
                  max={VOLUME_MAX}
                  step={1}
                  formatValue={(value) => `${value}%`}
                  disabled={disabled}
                  onValueChange={(value) => surface.onVolume(value)}
                />
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu
            open={popupOf(state, "rate")}
            onOpenChange={(open) => surface.onPopup(open ? "rate" : null)}
          >
            <DropdownMenuTrigger
              testId="media-rate"
              variant="ghost"
              size="sm"
              aria-label="Playback rate"
              disabled={disabled}
              onFocus={onActivity}
            >
              {rateLabel(state.rate)}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              testId="media-rate-menu"
              side="top"
              align="end"
              label="Playback speed"
            >
              <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
              {rateRows(state.rate, ratesOffered, surface.onRate)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            open={popupOf(state, "settings")}
            onOpenChange={(open) => surface.onPopup(open ? "settings" : null)}
          >
            <DropdownMenuTrigger
              testId="media-settings"
              variant="ghost"
              size="sm"
              aria-label="Settings"
              disabled={disabled}
              onFocus={onActivity}
              leading={
                <Icon
                  name="settings"
                  color={theme.colors.foreground}
                  size={16}
                />
              }
            />
            <DropdownMenuContent
              testId="media-settings-menu"
              side="top"
              align="end"
              label="Settings"
            >
              {qualityRows(quality, qualities, surface.onQuality)}
              <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
              {rateRows(state.rate, ratesOffered, surface.onRate)}
            </DropdownMenuContent>
          </DropdownMenu>
          <IconButton
            testId="media-fullscreen"
            label={state.fullscreen ? "Exit fullscreen" : "Fullscreen"}
            icon={
              <Icon
                name={state.fullscreen ? "minimize" : "maximize"}
                color={theme.colors.foreground}
                size={16}
              />
            }
            size="sm"
            disabled={disabled}
            onFocus={onActivity}
            onActivate={action({ kind: "fullscreen" })}
          />
        </div>
      </div>
    </div>
  );
};

export const MediaPlayer = (props: MediaPlayerProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const duration = durationOf(props.duration);
  const tick = stepOf(props.tickMs ?? MEDIA_TICK_MS, MEDIA_TICK_MS);
  const seekStep = stepOf(
    props.seekStep ?? MEDIA_SEEK_STEP_MS,
    MEDIA_SEEK_STEP_MS,
  );
  const largeStep = stepOf(
    props.largeSeekStep ?? MEDIA_LARGE_SEEK_STEP_MS,
    MEDIA_LARGE_SEEK_STEP_MS,
  );
  const idle = stepOf(props.idleMs ?? DEFAULT_IDLE_MS, DEFAULT_IDLE_MS);
  const qualities = props.qualities ?? [];
  const poster = useRef<ImgInstance | null>(null);
  const rootId = useRef<number | null>(null);
  const trackId = useRef<number | null>(null);
  const scrubbing = useRef(false);
  const [state, setState] = useState<MediaState>(() =>
    restingState({
      duration,
      playhead: props.defaultPlayhead,
      playing: props.defaultPlaying,
      volume: props.defaultVolume,
      muted: props.defaultMuted,
      rate: props.defaultRate,
      quality: props.defaultQuality,
      qualities,
      controls: true,
    }),
  );
  const stateRef = useRef(state);
  const [activity, setActivity] = useState(0);

  const reports = useRef({
    onPlayheadChange: props.onPlayheadChange,
    onPlayingChange: props.onPlayingChange,
    onVolumeChange: props.onVolumeChange,
    onMutedChange: props.onMutedChange,
    onRateChange: props.onRateChange,
    onQualityChange: props.onQualityChange,
    onFullscreenChange: props.onFullscreenChange,
  });
  useEffect(() => {
    reports.current = {
      onPlayheadChange: props.onPlayheadChange,
      onPlayingChange: props.onPlayingChange,
      onVolumeChange: props.onVolumeChange,
      onMutedChange: props.onMutedChange,
      onRateChange: props.onRateChange,
      onQualityChange: props.onQualityChange,
      onFullscreenChange: props.onFullscreenChange,
    };
  });

  const wake = (): void => {
    if (!stateRef.current.controls) {
      stateRef.current = { ...stateRef.current, controls: true };
      setState(stateRef.current);
    }
    setActivity((current) => current + 1);
  };

  const commit = (next: MediaState): void => {
    const current = stateRef.current;
    const settled = restingState({
      duration,
      playhead: next.playhead,
      playing: next.playing,
      volume: next.volume,
      muted: next.muted,
      rate: next.rate,
      quality: next.quality,
      qualities,
      fullscreen: next.fullscreen,
      controls: next.controls,
      popup: next.popup,
    });
    if (
      settled.playing === current.playing &&
      settled.playhead === current.playhead &&
      settled.volume === current.volume &&
      settled.muted === current.muted &&
      settled.rate === current.rate &&
      settled.quality === current.quality &&
      settled.fullscreen === current.fullscreen &&
      settled.controls === current.controls &&
      settled.popup === current.popup
    ) {
      return;
    }
    stateRef.current = settled;
    setState(settled);
    const report = reports.current;
    if (settled.playhead !== current.playhead) {
      report.onPlayheadChange?.(settled.playhead);
    }
    if (settled.playing !== current.playing) {
      report.onPlayingChange?.(settled.playing);
    }
    if (settled.volume !== current.volume) {
      report.onVolumeChange?.(settled.volume);
    }
    if (settled.muted !== current.muted) {
      report.onMutedChange?.(settled.muted);
    }
    if (settled.rate !== current.rate) {
      report.onRateChange?.(settled.rate);
    }
    if (settled.quality !== current.quality) {
      report.onQualityChange?.(settled.quality);
    }
    if (settled.fullscreen !== current.fullscreen) {
      report.onFullscreenChange?.(settled.fullscreen);
    }
  };

  useEffect(() => {
    if (!state.playing || props.disabled === true) return undefined;
    const timer = setInterval(() => {
      const current = stateRef.current;
      commit({
        ...current,
        playhead: advancePlayhead(
          current.playhead,
          tick * current.rate,
          duration,
        ),
      });
    }, tick);
    return () => clearInterval(timer);
  }, [state.playing, props.disabled, tick, duration]);

  useEffect(() => {
    if (state.playing && isFinished(state.playhead, duration)) {
      commit({ ...stateRef.current, playing: false });
    }
  }, [state.playing, state.playhead, duration]);

  useEffect(() => {
    if (props.disabled === true && stateRef.current.playing) {
      commit({ ...stateRef.current, playing: false });
    }
    if (props.disabled === true) scrubbing.current = false;
  }, [props.disabled]);

  useEffect(() => {
    const current = stateRef.current;
    const clamped = clampPlayhead(current.playhead, duration);
    if (current.playhead !== clamped) {
      commit({ ...current, playhead: clamped });
    }
  }, [duration]);

  useEffect(() => {
    if (state.popup !== null || !state.controls || props.disabled === true) {
      return undefined;
    }
    const timer = setTimeout(
      () => commit({ ...stateRef.current, controls: false }),
      idle,
    );
    return () => clearTimeout(timer);
  }, [state.controls, state.popup, activity, idle, props.disabled]);

  useLayoutEffect(() => {
    const instance = poster.current;
    const frameAt = frameAtOf(props.frameAt);
    if (instance === null || frameAt === undefined) return;
    Option.match(Option.filter(frameAt(state.playhead), isFrame), {
      onNone: () => undefined,
      onSome: (frame) =>
        instance.setImagePixels(frame.width, frame.height, frame.pixels),
    });
  }, [state.playhead, props.frameAt]);

  const scrub = (event: MediaPointer): void => {
    if (trackId.current === null) return;
    const box = renderer?.getElementBounds?.(trackId.current);
    if (box === null || box === undefined) return;
    Option.match(
      scrubPlayhead(event.x ?? box.x, { x: box.x, width: box.width }, duration),
      {
        onNone: () => undefined,
        onSome: (next) => commit({ ...stateRef.current, playhead: next }),
      },
    );
  };

  const apply = (intent: MediaIntent): void => {
    if (props.disabled === true) return;
    wake();
    const current = stateRef.current;
    Match.value(intent).pipe(
      Match.discriminatorsExhaustive("kind")({
        toggle: () => {
          if (current.playing) {
            commit({ ...current, playing: false });
            return;
          }
          if (duration <= 0) return;

          commit({
            ...current,
            playing: true,
            playhead: isFinished(current.playhead, duration)
              ? 0
              : current.playhead,
          });
        },
        seek: (move) => {
          commit({
            ...current,
            playhead: advancePlayhead(current.playhead, move.delta, duration),
          });
        },
        seekTo: (move) => {
          commit({
            ...current,
            playhead: move.edge === "start" ? 0 : duration,
          });
        },
        volume: (move) => {
          commit({
            ...current,
            volume: volumeOf(current.volume + move.delta),
            muted: move.delta > 0 ? false : current.muted,
          });
        },
        mute: () => {
          commit({ ...current, muted: !current.muted });
        },
        fullscreen: () => {
          renderer?.toggleFullscreen?.();
          commit({ ...current, fullscreen: !current.fullscreen });
        },
      }),
    );
  };

  const surface: MediaPlayerSurface = {
    onIntent: apply,
    onVolume: (level) => {
      wake();
      commit({ ...stateRef.current, volume: volumeOf(level / VOLUME_MAX) });
    },
    onRate: (rate) => {
      wake();
      commit({ ...stateRef.current, rate: rateOf(rate) });
    },
    onQuality: (quality) => {
      wake();
      commit({ ...stateRef.current, quality: qualityOf(quality, qualities) });
    },
    onPopup: (popup) => {
      wake();
      commit({ ...stateRef.current, popup, controls: true });
    },

    onTrackDown: (event) => {
      if (props.disabled === true || !isScrubPress(event.button)) return;
      wake();
      scrubbing.current = true;
      scrub(event);
    },

    onTrackMove: (event) => {
      if (props.disabled === true) return;
      wake();
      if (!scrubbing.current) return;
      if (event.pressedButton !== 0) {
        scrubbing.current = false;
        return;
      }
      scrub(event);
    },
    onTrackUp: () => {
      scrubbing.current = false;
    },
    onActivity: wake,
    onKey: (event) => {
      const key = (event.key ?? "").toLowerCase();

      const focused = renderer?.getFocusedElementId?.() ?? null;
      const transport =
        focused === rootId.current || focused === trackId.current;
      if (key === "space" && !transport) return;
      Option.match(
        playerIntent(key, event.modifiers?.shift === true, seekStep, largeStep),
        {
          onNone: () => undefined,
          onSome: (intent) => {
            event.preventDefault?.();
            apply(intent);
          },
        },
      );
    },
    registerRoot: (instance) => {
      rootId.current = instance?.id ?? null;
    },
    registerTrack: (instance) => {
      trackId.current = instance?.id ?? null;
    },
  };

  return renderMediaPlayer(props, theme, state, surface, poster);
};
