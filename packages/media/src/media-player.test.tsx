/**
 * `MediaPlayer`'s resting tree: the chrome Mux's player composes.
 *
 * The bugs these guarded: a bar that stayed painted after the idle timer (or
 * vanished and came back with its controls still pressable), a timeline whose
 * played and buffered fills disagreed with the arithmetic, a clock that drifted
 * from the fill, a rate readout that printed something other than the state, a
 * mute control that lied about its state, and a key map that was not the
 * component's own.
 */

import { createRef, isValidElement, type ReactElement } from "react";
import type { ImgInstance } from "@gpuix/react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import {
  renderMediaPlayer,
  type MediaPlayerProps,
  type MediaPlayerSurface,
} from "./media-player.js";
import {
  bufferedWidth,
  progressWidth,
  restingState,
  timeLabel,
} from "./player/logic.js";
import {
  elementHandler,
  elementProp,
  expectSome,
  findByTestId,
  hostStyleNumber,
  hostStyleString,
} from "./testing/element.js";

const WIDTH = 400;
const HEIGHT = 300;

const props = (
  overrides: Partial<MediaPlayerProps> = {},
): MediaPlayerProps => ({
  duration: 4000,
  alt: "A clip's frame",
  label: "Preview",
  width: WIDTH,
  height: HEIGHT,
  testId: "player",
  ...overrides,
});

interface FakeSurface extends MediaPlayerSurface {
  readonly intent: ReturnType<typeof vi.fn>;
  readonly popup: ReturnType<typeof vi.fn>;
  readonly down: ReturnType<typeof vi.fn>;
  readonly move: ReturnType<typeof vi.fn>;
  readonly up: ReturnType<typeof vi.fn>;
  readonly activity: ReturnType<typeof vi.fn>;
  readonly key: ReturnType<typeof vi.fn>;
  readonly register: MediaPlayerSurface["registerTrack"];
  readonly registerRoot: MediaPlayerSurface["registerRoot"];
}

const surfaceOf = (): FakeSurface => {
  const intent = vi.fn();
  const rate = vi.fn();
  const quality = vi.fn();
  const volume = vi.fn();
  const popup = vi.fn();
  const down = vi.fn();
  const move = vi.fn();
  const up = vi.fn();
  const activity = vi.fn();
  const key = vi.fn();
  const register = vi.fn();
  const registerRoot = vi.fn();
  return {
    intent,
    popup,
    down,
    move,
    up,
    activity,
    key,
    register,
    onIntent: intent,
    onVolume: volume,
    onRate: rate,
    onQuality: quality,
    onPopup: popup,
    onTrackDown: down,
    onTrackMove: move,
    onTrackUp: up,
    onActivity: activity,
    onKey: key,
    registerRoot,
    registerTrack: register,
  };
};

const poster = createRef<ImgInstance>();

const tree = (
  overrides: Partial<MediaPlayerProps> = {},
  state = restingState({ duration: 4000, playhead: 1000 }),
  surface = surfaceOf(),
) => renderMediaPlayer(props(overrides), lightTheme, state, surface, poster);

const inset = lightTheme.spacing.md;
const barWidth = WIDTH - inset * 2;

/** Every string child of an element tree, so a menu's rows can be read. */
const wordsOf = (element: ReactElement): string =>
  Option.match(elementProp(element, "children"), {
    onNone: () => "",
    onSome: (children) =>
      typeof children === "string"
        ? children
        : Array.isArray(children)
          ? children
              .map((child) =>
                typeof child === "string"
                  ? child
                  : isValidElement(child)
                    ? wordsOf(child as ReactElement)
                    : "",
              )
              .join("")
          : isValidElement(children)
            ? wordsOf(children as ReactElement)
            : "",
  });

describe("renderMediaPlayer", () => {
  it("paints the player's names and the picture's own", () => {
    const root = tree({ frameAt: () => Option.none() });
    expect(expectSome(elementProp(root, "role"))).toBe("group");
    expect(expectSome(elementProp(root, "aria-label"))).toBe("Preview");
    const picture = expectSome(findByTestId(root, "media-poster"));
    expect(expectSome(elementProp(picture, "alt"))).toBe("A clip's frame");
    expect(expectSome(elementProp(picture, "objectFit"))).toBe("cover");
  });

  it("prints the clock and paints the played and buffered shares", () => {
    const root = tree({ buffered: 2000 });
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(root, "media-track-hit")),
          "aria-valuetext",
        ),
      ),
    ).toBe(timeLabel(1000, 4000));
    expect(
      expectSome(
        hostStyleNumber(expectSome(findByTestId(root, "media-fill")), "width"),
      ),
    ).toBe(progressWidth(1000, 4000, barWidth));
    expect(
      expectSome(
        hostStyleNumber(
          expectSome(findByTestId(root, "media-buffered")),
          "width",
        ),
      ),
    ).toBe(bufferedWidth(2000, 4000, barWidth));
    expect(
      expectSome(
        hostStyleNumber(expectSome(findByTestId(root, "media-track")), "width"),
      ),
    ).toBe(barWidth);
  });

  it("keeps the scrub thumb inside the rail at both ends", () => {
    const start = tree({}, restingState({ duration: 4000 }));
    expect(
      expectSome(
        hostStyleNumber(expectSome(findByTestId(start, "media-thumb")), "left"),
      ),
    ).toBe(0);
    const end = tree({}, restingState({ duration: 4000, playhead: 4000 }));
    expect(
      expectSome(
        hostStyleNumber(expectSome(findByTestId(end, "media-thumb")), "left"),
      ),
    ).toBe(barWidth - 12);
  });

  it("paints a centred play control and a bar control, both named by the action", () => {
    const paused = tree();
    const centered = expectSome(findByTestId(paused, "media-play"));
    expect(expectSome(elementProp(centered, "label"))).toBe("Play");
    expect(expectSome(findByTestId(paused, "media-play-bar"))).toBeDefined();

    const running = tree(
      {},
      restingState({ duration: 4000, playing: true, controls: false }),
    );
    // The large control is hidden while a running clip's chrome is idle.
    expect(findByTestId(running, "media-play")).toStrictEqual(Option.none());
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(running, "media-play-bar")),
          "label",
        ),
      ),
    ).toBe("Pause");
  });

  it("reads a blank name or action as its documented default", () => {
    const root = tree({
      label: "   ",
      alt: "",
      playLabel: " ",
      frameAt: () => Option.none(),
    });
    expect(expectSome(elementProp(root, "aria-label"))).toBe("Media player");
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-poster")), "alt"),
      ),
    ).toBe("Media player");
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-play")), "label"),
      ),
    ).toBe("Play");
  });

  it("prints the rate and tells mute from unmute", () => {
    const root = tree({}, restingState({ duration: 4000, rate: 1.5 }));
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-rate")), "children"),
      ),
    ).toBe("1.5×");
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-mute")), "label"),
      ),
    ).toBe("Mute");

    const muted = tree({}, restingState({ duration: 4000, muted: true }));
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(muted, "media-mute")), "label"),
      ),
    ).toBe("Unmute");
  });

  it("fades the bar out and refuses its presses while idle", () => {
    // The bug guarded: the bar was painted at rest whatever the idle timer
    // said, so a pointer over a faded bar still hit its controls.
    const visible = tree();
    const bar = expectSome(findByTestId(visible, "media-controls"));
    expect(expectSome(hostStyleNumber(bar, "opacity"))).toBe(1);
    expect(expectSome(hostStyleString(bar, "pointerEvents"))).toBe("auto");

    const idle = tree({}, restingState({ duration: 4000, controls: false }));
    const faded = expectSome(findByTestId(idle, "media-controls"));
    expect(expectSome(hostStyleNumber(faded, "opacity"))).toBe(0);
    expect(expectSome(hostStyleString(faded, "pointerEvents"))).toBe("none");
    expect(
      expectSome(
        hostStyleNumber(
          expectSome(findByTestId(idle, "media-scrim")),
          "opacity",
        ),
      ),
    ).toBe(0);
  });

  it("leaves every control out of the tab order while disabled", () => {
    const root = tree({ disabled: true });
    expect(expectSome(elementProp(root, "tabIndex"))).toBe(-1);
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(root, "media-track-hit")),
          "tabIndex",
        ),
      ),
    ).toBe(-1);
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-play")), "disabled"),
      ),
    ).toBe(true);
    expect(
      elementHandler(
        expectSome(findByTestId(root, "media-track-hit")),
        "onMouseDown",
      ),
    ).toStrictEqual(Option.none());
  });

  it("forwards every control through one intent vocabulary", () => {
    const surface = surfaceOf();
    const root = tree({}, restingState({ duration: 4000 }), surface);
    const play = expectSome(
      elementHandler(
        expectSome(findByTestId(root, "media-play")),
        "onActivate",
      ),
    );
    play(undefined);
    const back = expectSome(
      elementHandler(
        expectSome(findByTestId(root, "media-back")),
        "onActivate",
      ),
    );
    back(undefined);
    const mute = expectSome(
      elementHandler(
        expectSome(findByTestId(root, "media-mute")),
        "onActivate",
      ),
    );
    mute(undefined);
    const fullscreen = expectSome(
      elementHandler(
        expectSome(findByTestId(root, "media-fullscreen")),
        "onActivate",
      ),
    );
    fullscreen(undefined);
    expect(surface.intent.mock.calls.map(([intent]) => intent)).toStrictEqual([
      { kind: "toggle" },
      { kind: "seek", delta: -1000 },
      { kind: "mute" },
      { kind: "fullscreen" },
    ]);
  });

  it("hands every key to the surface that reads the focused control", () => {
    // The bug guarded: the player mapped Space itself, so a focused mute button
    // toggled the clip as well as its own action. The surface sees the key and
    // its target, and decides.
    const surface = surfaceOf();
    const root = tree({}, restingState({ duration: 4000 }), surface);
    const keyDown = expectSome(elementHandler(root, "onKeyDown"));
    const event = { key: "space", elementId: 7, preventDefault: vi.fn() };
    keyDown(event);
    expect(surface.key).toHaveBeenCalledWith(event);
  });

  it("forwards the timeline's pointer gesture and registers its box", () => {
    const surface = surfaceOf();
    const root = tree({}, restingState({ duration: 4000 }), surface);
    const hit = expectSome(findByTestId(root, "media-track-hit"));
    const down = expectSome(elementHandler(hit, "onMouseDown"));
    down({ x: 160, button: 0 });
    const move = expectSome(elementHandler(hit, "onMouseMove"));
    move({ x: 180, pressedButton: 0 });
    const up = expectSome(elementHandler(hit, "onMouseUp"));
    up(undefined);
    expect(surface.down).toHaveBeenCalledWith({ x: 160, button: 0 });
    expect(surface.move).toHaveBeenCalledWith({ x: 180, pressedButton: 0 });
    expect(surface.up).toHaveBeenCalledTimes(1);
  });

  it("paints no picture for a player with no frame source", () => {
    expect(findByTestId(tree(), "media-poster")).toStrictEqual(Option.none());
  });

  it("marks the popup that is open and offers the app's qualities", () => {
    const root = tree(
      { qualities: ["Auto", "1080p"], defaultQuality: "1080p" },
      restingState({
        duration: 4000,
        qualities: ["Auto", "1080p"],
        quality: "1080p",
        popup: "settings",
      }),
    );
    expect(findByTestId(root, "media-settings")).not.toStrictEqual(
      Option.none(),
    );
    const menu = expectSome(findByTestId(root, "media-settings-menu"));
    expect(expectSome(elementProp(menu, "side"))).toBe("top");
    const words = wordsOf(menu);
    expect(words).toContain("Playback speed");
    expect(words).toContain("1080p");
    expect(words).toContain("Auto");
  });
});
