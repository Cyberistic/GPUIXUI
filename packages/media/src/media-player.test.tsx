/**
 * `MediaPlayer`'s resting tree: the names, the clock, the fill and the waveform.
 *
 * The bugs these guard: a transport whose seek pad looks enabled while disabled,
 * a clock and a fill that disagree about the playhead, an unnamed player, and a
 * waveform painted where the caller supplied no samples.
 */

import { createRef } from "react";
import type { ImgInstance } from "@gpuix/react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import {
  renderMediaPlayer,
  type MediaPlayerProps,
  type MediaPlayerSurface,
} from "./media-player.js";
import { waveformSvg } from "./player/logic.js";
import {
  elementHandler,
  elementProp,
  expectSome,
  findByTestId,
  hostProp,
} from "./testing/element.js";

const props = (
  overrides: Partial<MediaPlayerProps> = {},
): MediaPlayerProps => ({
  duration: 4000,
  alt: "A clip's frame",
  label: "Preview",
  testId: "player",
  ...overrides,
});

const surfaceOf = (): MediaPlayerSurface & {
  readonly toggle: ReturnType<typeof vi.fn>;
  readonly seek: ReturnType<typeof vi.fn>;
  readonly down: ReturnType<typeof vi.fn>;
  readonly move: ReturnType<typeof vi.fn>;
  readonly up: ReturnType<typeof vi.fn>;
  readonly register: ReturnType<typeof vi.fn>;
} => {
  const toggle = vi.fn();
  const seek = vi.fn();
  const down = vi.fn();
  const move = vi.fn();
  const up = vi.fn();
  const register = vi.fn();
  return {
    toggle,
    seek,
    down,
    move,
    up,
    register,
    onToggle: toggle,
    onSeek: seek,
    onTrackDown: down,
    onTrackMove: move,
    onTrackUp: up,
    registerTrack: register,
  };
};

const poster = createRef<ImgInstance>();

const tree = (
  overrides: Partial<MediaPlayerProps> = {},
  state = { playing: false, playhead: 1000 },
  surface = surfaceOf(),
) => renderMediaPlayer(props(overrides), lightTheme, state, surface, poster);

describe("renderMediaPlayer", () => {
  it("paints the player's names and the picture's own", () => {
    const root = tree({ frameAt: () => Option.none() });
    expect(expectSome(elementProp(root, "role"))).toBe("group");
    expect(expectSome(elementProp(root, "aria-label"))).toBe("Preview");
    const picture = expectSome(findByTestId(root, "media-poster"));
    expect(expectSome(elementProp(picture, "alt"))).toBe("A clip's frame");
  });

  it("prints the clock and the fill the playhead names", () => {
    const root = tree();
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(root, "media-seek")),
          "aria-valuetext",
        ),
      ),
    ).toBe("0:01 / 0:04");
    expect(
      expectSome(
        hostProp(expectSome(findByTestId(root, "media-fill")), "style"),
      ),
    ).toMatchObject({ width: 50 });
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
    expect(expectSome(findByTestId(root, "media-play"))).toBeDefined();
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-play")), "children"),
      ),
    ).toBeDefined();
  });

  it("paints the running action while the clip plays", () => {
    const root = tree({ pauseLabel: "Hold" }, { playing: true, playhead: 0 });
    expect(
      expectSome(
        elementProp(expectSome(findByTestId(root, "media-play")), "children"),
      ),
    ).toBe("Hold");
  });

  it("leaves the transport out of the tab order while disabled", () => {
    const root = tree({ disabled: true });
    const play = expectSome(findByTestId(root, "media-play"));
    expect(expectSome(elementProp(play, "disabled"))).toBe(true);
    const seek = expectSome(findByTestId(root, "media-seek"));
    expect(expectSome(elementProp(seek, "tabIndex"))).toBe(-1);
  });

  it("paints the waveform the samples name, and none without samples", () => {
    const withPeaks = tree({ peaks: [0.5, 1, 0.25] });
    const waveform = expectSome(findByTestId(withPeaks, "media-waveform"));
    expect(expectSome(elementProp(waveform, "source"))).toBe(
      waveformSvg([0.5, 1, 0.25], 200, 32),
    );
    expect(findByTestId(tree(), "media-waveform")).toStrictEqual(Option.none());
  });

  it("paints no waveform, and the whole player, for samples that are not a list", () => {
    // A clip's peaks are a decode's output or a saved record's field; a store
    // that carried an object, a number or a string reaches the render untyped.
    // The bug guarded: the drawing read `.length` and `.map` off that value and
    // threw out of the render, so the clock and the transport vanished with it.
    const stored = { 0: 0.5, 1: 1 } as unknown as ReadonlyArray<number>;
    const root = tree({ peaks: stored });
    expect(findByTestId(root, "media-waveform")).toStrictEqual(Option.none());
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(root, "media-seek")),
          "aria-valuetext",
        ),
      ),
    ).toBe("0:01 / 0:04");
    expect(expectSome(findByTestId(root, "media-play"))).toBeDefined();
  });

  it("forwards the transport's two handlers", () => {
    const surface = surfaceOf();
    const root = tree({}, { playing: false, playhead: 0 }, surface);
    const toggle = expectSome(
      elementHandler(
        expectSome(findByTestId(root, "media-play")),
        "onActivate",
      ),
    );
    toggle(undefined);
    const seek = expectSome(
      elementHandler(expectSome(findByTestId(root, "media-seek")), "onKeyDown"),
    );
    seek({ key: "end" });
    expect(surface.toggle).toHaveBeenCalledTimes(1);
    expect(surface.seek).toHaveBeenCalledWith({ key: "end" });
  });

  it("forwards the progress track's handlers and registers its box", () => {
    // The bug guarded: the track painted the played share but took no press,
    // so a reader could not seek to a point on the clip they could see.
    const surface = surfaceOf();
    const root = tree({}, { playing: false, playhead: 0 }, surface);
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
    // The visual track keeps its own box and fill inside the taller target.
    expect(
      expectSome(
        hostProp(expectSome(findByTestId(root, "media-track")), "style"),
      ),
    ).toMatchObject({ width: 200 });
    expect(
      expectSome(
        hostProp(expectSome(findByTestId(root, "media-fill")), "style"),
      ),
    ).toMatchObject({ width: 0 });
  });

  it("takes no press on the progress track while disabled", () => {
    const root = tree({ disabled: true });
    const hit = expectSome(findByTestId(root, "media-track-hit"));
    expect(elementHandler(hit, "onMouseDown")).toStrictEqual(Option.none());
    expect(elementHandler(hit, "onMouseMove")).toStrictEqual(Option.none());
    expect(expectSome(hostProp(hit, "style"))).toMatchObject({
      cursor: "default",
    });
  });

  it("paints no picture for a player with no frame source", () => {
    expect(findByTestId(tree(), "media-poster")).toStrictEqual(Option.none());
  });
});
