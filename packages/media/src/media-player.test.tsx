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
} => {
  const toggle = vi.fn();
  const seek = vi.fn();
  return { toggle, seek, onToggle: toggle, onSeek: seek };
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

  it("paints no picture for a player with no frame source", () => {
    expect(findByTestId(tree(), "media-poster")).toStrictEqual(Option.none());
  });
});
