import {
  advancePlayhead,
  clampPlayhead,
  isFinished,
  MEDIA_LARGE_SEEK_STEP_MS,
  MEDIA_RATES,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  playerIntent,
  progressWidth,
  rateLabel,
  scrubPlayhead,
  timeLabel,
  volumeOf,
} from "@gpuixui/media/player/logic";
import { icons, type IconName } from "@gpuixui/icons";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { galleryMarkup } from "../../lib/icon-gallery";

/**
 * Browser preview for the MediaPlayer page.
 *
 * The runtime has no `video`/`audio` host and no playback verb, so the shipped
 * player is composition: the caller supplies each frame's bytes, and the
 * component owns the clock, the transport and the chrome. The preview plays
 * exactly that part — its clock, keys, played/buffered shares, rate and volume
 * are `player/logic`'s — over three illustrated frames standing in for the
 * caller's decoded bytes. The chrome is the same anatomy: a centred play
 * control, a bar that fades after idle, a timeline with a buffered range and a
 * thumb, the clock, mute and volume, rate, settings and fullscreen.
 */

/** The clip the preview plays, in milliseconds. */
export const PLAYER_DURATION = 180_000;

/** The part of the clip the app has in hand; the preview has most of it. */
export const PLAYER_BUFFERED = 120_000;

/** The frame's width in points, so the painted shares are the package's arithmetic. */
export const PLAYER_WIDTH = 520;

/** The timeline's width: the frame less the bar's two insets. */
export const PLAYER_TRACK = PLAYER_WIDTH - 16;

/** The rates and renditions the menus offer, as the component's props do. */
export const PLAYER_RATES = MEDIA_RATES;
export const PLAYER_QUALITIES: ReadonlyArray<string> = [
  "Auto",
  "1080p",
  "720p",
];

/** How long the chrome stays after the last activity. */
export const PLAYER_IDLE_MS = 3000;

type Popup = "volume" | "rate" | "settings" | null;

/** Three frames the caller "decodes"; the playhead picks the one on screen. */
const FRAMES: ReadonlyArray<string> = ["#2E2370", "#20405A", "#3F2A52"].map(
  (fill, index) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="${fill}"/><circle cx="${96 + index * 40}" cy="${72 - index * 10}" r="18" fill="#A7A9FF"/><path d="M0 160 L80 128 L160 144 L240 96 L320 116 L320 180 L0 180 Z" fill="#11131A"/></svg>`,
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

/** A glyph from the icon set, painted in the page's ink. */
const Glyph = ({ name }: { readonly name: IconName }) => (
  <span
    aria-hidden
    className="gx-player-glyph"
    dangerouslySetInnerHTML={{ __html: galleryMarkup(icons[name]) }}
  />
);

const percent = (width: number, track: number): string =>
  `${track === 0 ? 0 : (width / track) * 100}%`;

/** The three boxes the timeline paints for a playhead, in points. */
export const sharesAt = (
  playhead: number,
  track: number = PLAYER_TRACK,
): {
  readonly played: number;
  readonly buffered: number;
  readonly thumb: number;
} => {
  const played = progressWidth(playhead, PLAYER_DURATION, track);
  const buffered = Math.max(
    progressWidth(PLAYER_BUFFERED, PLAYER_DURATION, track),
    played,
  );
  return {
    played,
    buffered,
    thumb: Math.min(Math.max(played - 6, 0), Math.max(track - 12, 0)),
  };
};

export const MediaPlayerDemo = () => {
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [quality, setQuality] = useState(PLAYER_QUALITIES[0] ?? "Auto");
  const [popup, setPopup] = useState<Popup>(null);
  const [controls, setControls] = useState(true);
  const [activity, setActivity] = useState(0);
  const scrubbing = useRef(false);
  const track = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);

  const wake = (): void => {
    setControls(true);
    setActivity((current) => current + 1);
  };

  // The app's clock, scaled by the rate the menus report.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(
      () =>
        setPlayhead((current) =>
          advancePlayhead(current, MEDIA_TICK_MS * rate, PLAYER_DURATION),
        ),
      MEDIA_TICK_MS,
    );
    return () => clearInterval(timer);
  }, [playing, rate]);

  // The transport stops itself at the clip's end, as the component's does.
  useEffect(() => {
    if (playing && isFinished(playhead, PLAYER_DURATION)) setPlaying(false);
  }, [playing, playhead]);

  // The bar fades after the last activity; a popup owns it while open.
  useEffect(() => {
    if (popup !== null || !controls) return undefined;
    const timer = setTimeout(() => setControls(false), PLAYER_IDLE_MS);
    return () => clearTimeout(timer);
  }, [popup, controls, activity]);

  const seekTo = (next: number): void => {
    setPlayhead(clampPlayhead(next, PLAYER_DURATION));
    if (isFinished(next, PLAYER_DURATION)) setPlaying(false);
  };

  const toggle = (): void => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (isFinished(playhead, PLAYER_DURATION)) setPlayhead(0);
    setPlaying(true);
  };

  const scrub = (clientX: number): void => {
    const box = track.current?.getBoundingClientRect();
    if (box === undefined) return;
    Option.match(
      scrubPlayhead(clientX, { x: box.x, width: box.width }, PLAYER_DURATION),
      { onNone: () => undefined, onSome: seekTo },
    );
  };

  const intent = (key: string, shift: boolean): void => {
    Option.match(
      playerIntent(key, shift, MEDIA_SEEK_STEP_MS, MEDIA_LARGE_SEEK_STEP_MS),
      {
        onNone: () => undefined,
        onSome: (value) =>
          Match.value(value).pipe(
            Match.discriminatorsExhaustive("kind")({
              toggle,
              seek: (move) => seekTo(playhead + move.delta),
              seekTo: (move) =>
                seekTo(move.edge === "start" ? 0 : PLAYER_DURATION),
              volume: (move) => {
                setVolume((current) => volumeOf(current + move.delta));
                if (move.delta > 0) setMuted(false);
              },
              mute: () => setMuted((current) => !current),
              fullscreen: () => {
                const surface = card.current;
                if (surface === null) return;
                if (document.fullscreenElement === null) {
                  void surface.requestFullscreen?.();
                } else {
                  void document.exitFullscreen?.();
                }
              },
            }),
          ),
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key.toLowerCase();
    const target = event.target as HTMLElement;
    // A field owns its keys, and a control owns Space: the player only takes
    // the key when its own surface or timeline holds the focus.
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    const transport =
      target === event.currentTarget ||
      target.classList.contains("gx-player-timeline");
    if (key === "space" && !transport) return;
    if (
      Option.isNone(
        playerIntent(
          key,
          event.shiftKey,
          MEDIA_SEEK_STEP_MS,
          MEDIA_LARGE_SEEK_STEP_MS,
        ),
      )
    )
      return;
    event.preventDefault();
    intent(key, event.shiftKey);
  };

  const level = Math.round(volume * 100);
  const silent = muted || volume === 0;
  const shares = sharesAt(playhead);
  const popupClass = (name: Popup): string =>
    popup === name ? "gx-player-menu gx-player-menu-open" : "gx-player-menu";

  return (
    <div className="gx-player-scene">
      <div
        aria-label="Preview"
        className="gx-player"
        data-controls={controls ? "true" : "false"}
        onFocus={wake}
        onKeyDown={onKeyDown}
        onMouseMove={wake}
        ref={card}
        role="group"
        style={{ width: PLAYER_WIDTH, maxWidth: "100%" }}
        tabIndex={0}
      >
        <img
          alt="A clip's frame"
          className="gx-player-poster"
          src={frameAt(playhead)}
        />
        <div className="gx-player-scrim" />
        {!playing || controls ? (
          <div className="gx-player-center">
            <span className="gx-player-disc" />
            <button
              aria-label={playing ? "Pause" : "Play"}
              className="gx-player-big"
              onClick={() => {
                wake();
                toggle();
              }}
              type="button"
            >
              <Glyph name={playing ? "pause" : "play"} />
            </button>
          </div>
        ) : null}
        <div className="gx-player-bar" onMouseMove={wake}>
          <div
            aria-label="Preview position"
            aria-valuetext={timeLabel(playhead, PLAYER_DURATION)}
            className="gx-player-timeline"
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              scrubbing.current = true;
              wake();
              scrub(event.clientX);
            }}
            onMouseLeave={() => {
              scrubbing.current = false;
            }}
            onMouseMove={(event) => {
              wake();
              if (scrubbing.current && event.buttons === 1) {
                scrub(event.clientX);
              }
            }}
            onMouseUp={() => {
              scrubbing.current = false;
            }}
            ref={track}
            role="slider"
            tabIndex={0}
          >
            <div className="gx-player-rail">
              <span
                className="gx-player-buffered"
                style={{ width: percent(shares.buffered, PLAYER_TRACK) }}
              />
              <span
                className="gx-player-fill"
                style={{ width: percent(shares.played, PLAYER_TRACK) }}
              />
              <span
                className="gx-player-thumb"
                style={{ left: percent(shares.thumb, PLAYER_TRACK) }}
              />
            </div>
          </div>
          <div className="gx-player-row">
            <button
              aria-label={playing ? "Pause" : "Play"}
              className="gx-player-action"
              onClick={() => {
                wake();
                toggle();
              }}
              type="button"
            >
              <Glyph name={playing ? "pause" : "play"} />
            </button>
            <button
              aria-label="Seek back one second"
              className="gx-player-action gx-player-step"
              onClick={() => {
                wake();
                seekTo(playhead - MEDIA_SEEK_STEP_MS);
              }}
              type="button"
            >
              −1s
            </button>
            <button
              aria-label="Seek forward one second"
              className="gx-player-action gx-player-step"
              onClick={() => {
                wake();
                seekTo(playhead + MEDIA_SEEK_STEP_MS);
              }}
              type="button"
            >
              +1s
            </button>
            <span className="gx-player-clock" role="status">
              {timeLabel(playhead, PLAYER_DURATION)}
            </span>
            <span className="gx-player-spacer" />
            <button
              aria-label={silent ? "Unmute" : "Mute"}
              className="gx-player-action"
              onClick={() => {
                wake();
                setMuted((current) => !current);
              }}
              type="button"
            >
              <Glyph name={silent ? "volume-x" : "volume-2"} />
            </button>
            <div className="gx-player-anchor">
              <button
                aria-expanded={popup === "volume"}
                aria-label="Volume"
                className="gx-player-action"
                onClick={() => {
                  wake();
                  setPopup(popup === "volume" ? null : "volume");
                }}
                type="button"
              >
                <Glyph name="sliders-horizontal" />
              </button>
              <div className={popupClass("volume")}>
                <span className="gx-player-menu-label">Volume {level}%</span>
                <input
                  aria-label="Volume"
                  className="gx-player-volume"
                  max={100}
                  min={0}
                  onChange={(event) => {
                    wake();
                    setVolume(volumeOf(Number(event.target.value) / 100));
                    setMuted(false);
                  }}
                  step={1}
                  type="range"
                  value={level}
                />
              </div>
            </div>
            <div className="gx-player-anchor">
              <button
                aria-expanded={popup === "rate"}
                aria-label="Playback rate"
                className="gx-player-action gx-player-step"
                onClick={() => {
                  wake();
                  setPopup(popup === "rate" ? null : "rate");
                }}
                type="button"
              >
                {rateLabel(rate)}
              </button>
              <div className={popupClass("rate")} role="menu">
                <span className="gx-player-menu-label">Playback speed</span>
                {PLAYER_RATES.map((value) => (
                  <button
                    aria-checked={rate === value}
                    className="gx-player-menu-item"
                    key={value}
                    onClick={() => {
                      setRate(value);
                      setPopup(null);
                      wake();
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    {rateLabel(value)}
                  </button>
                ))}
              </div>
            </div>
            <div className="gx-player-anchor">
              <button
                aria-expanded={popup === "settings"}
                aria-label="Settings"
                className="gx-player-action"
                onClick={() => {
                  wake();
                  setPopup(popup === "settings" ? null : "settings");
                }}
                type="button"
              >
                <Glyph name="settings" />
              </button>
              <div className={popupClass("settings")} role="menu">
                <span className="gx-player-menu-label">Quality</span>
                {PLAYER_QUALITIES.map((value) => (
                  <button
                    aria-checked={quality === value}
                    className="gx-player-menu-item"
                    key={value}
                    onClick={() => {
                      setQuality(value);
                      setPopup(null);
                      wake();
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    {value}
                  </button>
                ))}
                <span className="gx-player-menu-label">Playback speed</span>
                {PLAYER_RATES.map((value) => (
                  <button
                    aria-checked={rate === value}
                    className="gx-player-menu-item"
                    key={value}
                    onClick={() => {
                      setRate(value);
                      setPopup(null);
                      wake();
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    {rateLabel(value)}
                  </button>
                ))}
              </div>
            </div>
            <button
              aria-label="Fullscreen"
              className="gx-player-action"
              onClick={() => {
                wake();
                intent("f", false);
              }}
              type="button"
            >
              <Glyph
                name={
                  typeof document !== "undefined" && document.fullscreenElement
                    ? "minimize"
                    : "maximize"
                }
              />
            </button>
          </div>
        </div>
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
  buffered={clip.buffered}
  qualities={["Auto", "1080p", "720p"]}
  seekStep={1000}
  onPlayheadChange={(playhead) => savePosition(playhead)}
/>;`;
