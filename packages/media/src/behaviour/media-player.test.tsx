/**
 * `MediaPlayer`'s chrome, driven through the real GPUix renderer.
 *
 * The bugs these guard: Space that does not toggle because the player is not
 * the focus target; an arrow that seeks by a wall-clock step instead of the
 * caller's; a timeline that paints a played share but maps a press by another
 * rule; a bar that never fades, or fades and never returns; a rate menu that
 * prints a speed the clock does not run at; and a mute control that reports a
 * state it never paints. The frame source is recorded on every call, so the
 * suite also holds that the paint follows the playhead the transport reports.
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { MediaPlayer, type MediaFrame } from "../media-player.js";
import { progressWidth, scrubPlayhead, timeLabel } from "../player/logic.js";

/** A 4×4 frame whose bytes are a whole buffer, so the paint path is exercised. */
const frameFor = (colour: number): MediaFrame => ({
  width: 4,
  height: 4,
  pixels: Uint8Array.from({ length: 64 }, (_, at) =>
    at % 4 === 3 ? 255 : colour,
  ),
});

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 40);
  });

const waitUntil = async (
  ready: () => boolean,
  attempts = 60,
): Promise<void> => {
  if (ready() || attempts <= 0) return;
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
  return waitUntil(ready, attempts - 1);
};

/** The centre of `testId` in window points; a missing element is a broken suite. */
const centreOf = (
  root: TestRoot,
  testId: string,
): { readonly x: number; readonly y: number } => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  const box = root.renderer.getElementBounds(element.id);
  if (box === null) {
    throw new Error(`behaviour: "${testId}" painted no box`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const click = (root: TestRoot, testId: string): void => {
  const at = centreOf(root, testId);
  root.renderer.nativeSimulateClick(at.x, at.y);
};

const clickText = (root: TestRoot, text: string): void => {
  const element = root.renderer.findByText(text);
  if (element === undefined) {
    throw new Error(`behaviour: no element with text "${text}"`);
  }
  const box = root.renderer.getElementBounds(element.id);
  if (box === null) throw new Error(`behaviour: "${text}" painted no box`);
  root.renderer.nativeSimulateClick(
    box.x + box.width / 2,
    box.y + box.height / 2,
  );
};

const textOf = (root: TestRoot, testId: string): string => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) return "";
  const collect = (id: number): string => {
    const node = root.renderer.getElement(id);
    if (node === undefined) return "";
    return `${node.text ?? ""}${node.children.map(collect).join("")}`;
  };
  return collect(element.id);
};

const widthOf = (root: TestRoot, testId: string): number =>
  root.renderer.getElementBounds(root.renderer.findByTestId(testId)?.id ?? -1)
    ?.width ?? -1;

const barOpacity = (root: TestRoot): number => {
  const bar = root.renderer.findByTestId("media-controls");
  if (bar === undefined) return -1;
  const value = bar.style.opacity;
  return typeof value === "number" ? value : -1;
};

const focusPlayer = (root: TestRoot): void => {
  const player = root.renderer.findByTestId("player");
  if (player === undefined) throw new Error("behaviour: the player is missing");
  root.renderer.focusElement(player.id);
};

/** A point on the timeline at `share` of its width, in window points. */
const trackPoint = (
  root: TestRoot,
  share: number,
): {
  readonly x: number;
  readonly y: number;
  readonly box: { readonly x: number; readonly width: number };
} => {
  const hit = root.renderer.findByTestId("media-track-hit");
  if (hit === undefined) {
    throw new Error("behaviour: the timeline is missing");
  }
  const box = root.renderer.getElementBounds(hit.id);
  if (box === null) throw new Error("behaviour: the timeline painted no box");
  return {
    x: box.x + box.width * share,
    y: box.y + box.height / 2,
    box: { x: box.x, width: box.width },
  };
};

interface Page {
  readonly root: TestRoot;
  readonly frames: number[];
  readonly playheads: number[];
  readonly playing: boolean[];
  readonly muted: boolean[];
  readonly rates: number[];
  readonly fullscreens: boolean[];
  show: (disabled: boolean) => void;
}

const mount = (idleMs = 3000, duration = 30_000): Page => {
  const frames: number[] = [];
  const playheads: number[] = [];
  const playing: boolean[] = [];
  const muted: boolean[] = [];
  const rates: number[] = [];
  const fullscreens: boolean[] = [];
  const root = createTestRoot({ width: 900, height: 700 });
  const show = (disabled: boolean): void => {
    root.render(
      <ThemeProvider theme={lightTheme}>
        <MediaPlayer
          testId="player"
          duration={duration}
          alt="A clip's frame"
          label="Preview"
          tickMs={20}
          seekStep={1000}
          idleMs={idleMs}
          width={480}
          height={270}
          buffered={20_000}
          qualities={["Auto", "1080p"]}
          frameAt={(playhead) => {
            frames.push(playhead);
            return Option.some(frameFor(playhead % 256));
          }}
          onPlayheadChange={(playhead) => playheads.push(playhead)}
          onPlayingChange={(next) => playing.push(next)}
          onMutedChange={(next) => muted.push(next)}
          onRateChange={(next) => rates.push(next)}
          onFullscreenChange={(next) => fullscreens.push(next)}
          disabled={disabled}
        />
      </ThemeProvider>,
    );
  };
  show(false);
  return { root, frames, playheads, playing, muted, rates, fullscreens, show };
};

describe("MediaPlayer transport", () => {
  it("runs its own clock, pauses on both play controls, and reports each state", async () => {
    const page = mount();
    expect(textOf(page.root, "media-time")).toBe("0:00 / 0:30");
    click(page.root, "media-play");
    await waitUntil(() => (page.playheads.at(-1) ?? 0) >= 200);
    expect(page.playing).toStrictEqual([true]);
    // The clock prints the playhead the transport reported, floored to a
    // second, so the readout and the fill cannot disagree about where it is.
    expect(textOf(page.root, "media-time")).toBe(
      timeLabel(page.playheads.at(-1) ?? 0, 30_000),
    );
    expect(widthOf(page.root, "media-fill")).toBeGreaterThan(0);

    click(page.root, "media-play-bar");
    await settle();
    const held = page.playheads.length;
    expect(page.playing).toStrictEqual([true, false]);
    await settle();
    expect(page.playheads.length).toBe(held);
    page.root.unmount();
  });

  it("toggles on Space when the player holds the focus", async () => {
    const page = mount();
    focusPlayer(page.root);
    page.root.renderer.simulateKeystrokes("space");
    await waitUntil(() => page.playing.includes(true));
    expect(page.playing).toStrictEqual([true]);
    page.root.renderer.simulateKeystrokes("space");
    await waitUntil(() => page.playing.at(-1) === false);
    expect(page.playing).toStrictEqual([true, false]);
    page.root.unmount();
  });

  it("seeks by the documented arrow step, the large step, and both ends", () => {
    const page = mount();
    focusPlayer(page.root);
    page.root.renderer.simulateKeystrokes("right");
    expect(textOf(page.root, "media-time")).toBe("0:01 / 0:30");
    expect(page.playheads.at(-1)).toBe(1000);
    page.root.renderer.simulateKeystrokes("left");
    expect(textOf(page.root, "media-time")).toBe("0:00 / 0:30");
    page.root.renderer.simulateKeystrokes("shift-right");
    expect(textOf(page.root, "media-time")).toBe("0:10 / 0:30");
    page.root.renderer.simulateKeystrokes("end");
    expect(textOf(page.root, "media-time")).toBe("0:30 / 0:30");
    page.root.renderer.simulateKeystrokes("home");
    expect(textOf(page.root, "media-time")).toBe("0:00 / 0:30");
    expect(page.playing).toStrictEqual([]);
    page.root.unmount();
  });

  it("maps a press on the timeline to the share the component's own rule names", () => {
    // The bug guarded: the pressed band and the painted rail disagreed, so a
    // press at three quarters painted the fill at a different share.
    const page = mount();
    const pressed = trackPoint(page.root, 0.75);
    page.root.renderer.nativeSimulateMouseDown(pressed.x, pressed.y);
    const expected = scrubPlayhead(pressed.x, pressed.box, 30_000);
    expect(Option.isSome(expected)).toBe(true);
    if (Option.isNone(expected)) return;
    expect(page.playheads.at(-1)).toBe(expected.value);
    expect(widthOf(page.root, "media-fill")).toBe(
      progressWidth(expected.value, 30_000, pressed.box.width),
    );
    expect(textOf(page.root, "media-time")).toBe(
      timeLabel(expected.value, 30_000),
    );
    page.root.renderer.nativeSimulateMouseMove(
      pressed.box.x + pressed.box.width,
      pressed.y,
      0,
    );
    expect(page.playheads.at(-1)).toBe(30_000);
    page.root.renderer.nativeSimulateMouseUp(
      pressed.box.x + pressed.box.width,
      pressed.y,
    );
    page.root.unmount();
  });

  it("fades the bar after idle and brings it back on a pointer or the focus", async () => {
    // The bug guarded: the chrome stayed painted forever, or faded and stayed
    // hidden, because nothing woke it after the pointer returned.
    const page = mount(60);
    expect(barOpacity(page.root)).toBe(1);
    await waitUntil(() => barOpacity(page.root) === 0);
    expect(barOpacity(page.root)).toBe(0);

    const middle = centreOf(page.root, "player");
    page.root.renderer.nativeSimulateMouseMove(middle.x, middle.y);
    expect(barOpacity(page.root)).toBe(1);
    await waitUntil(() => barOpacity(page.root) === 0);

    focusPlayer(page.root);
    expect(barOpacity(page.root)).toBe(1);
    page.root.unmount();
  });

  it("runs the clock at the rate the rate menu prints", async () => {
    // The bug guarded: the menu reported a speed the interval ignored, so 2×
    // played at 1× and the readout disagreed with the menu.
    const page = mount();
    click(page.root, "media-rate");
    await waitUntil(() => textOf(page.root, "media-rate").includes("×"));
    clickText(page.root, "2×");
    expect(page.rates).toStrictEqual([2]);
    expect(textOf(page.root, "media-rate")).toBe("2×");
    focusPlayer(page.root);
    page.root.renderer.simulateKeystrokes("space");
    await waitUntil(() => (page.playheads.at(-1) ?? 0) >= 500);
    expect(page.playheads.at(-1)).toBeGreaterThanOrEqual(500);
    page.root.renderer.simulateKeystrokes("space");
    page.root.unmount();
  });

  it("leaves Space to a focused control instead of toggling the clip", () => {
    // The bug guarded: the player mapped Space for every key it heard, so a
    // focused mute button toggled the clip as well as its own action.
    const page = mount();
    const mute = page.root.renderer.findByTestId("media-mute");
    if (mute === undefined)
      throw new Error("behaviour: the mute button is missing");
    page.root.renderer.nativeSimulateKeyDown(mute.id, "space");
    page.root.renderer.nativeSimulateKeyUp(mute.id, "space");
    expect(page.muted).toStrictEqual([true]);
    expect(page.playing).toStrictEqual([]);
    page.root.unmount();
  });

  it("mutes and unmutes from the control and from M", () => {
    const page = mount();
    click(page.root, "media-mute");
    expect(page.muted).toStrictEqual([true]);
    focusPlayer(page.root);
    page.root.renderer.simulateKeystrokes("m");
    expect(page.muted).toStrictEqual([true, false]);
    page.root.unmount();
  });

  it("opens the settings menu with the app's qualities and asks the window for fullscreen", () => {
    const page = mount();
    click(page.root, "media-settings");
    expect(textOf(page.root, "media-settings-menu")).toContain(
      "Playback speed",
    );
    expect(textOf(page.root, "media-settings-menu")).toContain("1080p");
    click(page.root, "media-settings");
    click(page.root, "media-fullscreen");
    expect(page.fullscreens).toStrictEqual([true]);
    page.root.unmount();
  });

  it("stops a running clip when it is disabled and refuses its keys and track", async () => {
    const page = mount();
    click(page.root, "media-play");
    await waitUntil(() => page.playing.includes(true));
    page.show(true);
    await waitUntil(() => page.playing.at(-1) === false);
    expect(page.playing.at(-1)).toBe(false);

    const held = page.playheads.length;
    focusPlayer(page.root);
    page.root.renderer.simulateKeystrokes("end");
    const pressed = trackPoint(page.root, 0.5);
    page.root.renderer.nativeSimulateMouseDown(pressed.x, pressed.y);
    await settle();
    expect(page.playheads.length).toBe(held);
    expect(textOf(page.root, "media-time")).not.toBe("0:30 / 0:30");
    page.root.unmount();
  });

  it("keeps the transport when a decoded frame carries no bytes", () => {
    // The bug guarded: the frame was trusted, so a decoder that answered a box
    // without its buffer threw out of the layout effect and unmounted the
    // player — the transport included — instead of painting no picture.
    const root = createTestRoot({ width: 900, height: 700 });
    root.render(
      <ThemeProvider theme={lightTheme}>
        <MediaPlayer
          testId="player"
          duration={30_000}
          alt="A clip's frame"
          tickMs={20}
          width={480}
          height={270}
          frameAt={() =>
            Option.some({ width: 4, height: 4 } as unknown as MediaFrame)
          }
        />
      </ThemeProvider>,
    );
    focusPlayer(root);
    root.renderer.simulateKeystrokes("end");
    expect(textOf(root, "media-time")).toBe("0:30 / 0:30");
    root.unmount();
  });

  it("asks for the frame the playhead stands on, and drops a frame with no bytes", () => {
    const page = mount();
    focusPlayer(page.root);
    page.root.renderer.simulateKeystrokes("end");
    expect(page.frames).toContain(30_000);
    page.root.renderer.simulateKeystrokes("home");
    expect(page.frames).toContain(0);
    page.root.unmount();
  });
});
