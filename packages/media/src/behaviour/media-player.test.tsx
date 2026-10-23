/**
 * `MediaPlayer`'s transport, driven through the real GPUix renderer.
 *
 * The bugs these guard: a play button that reports a state but paints no clock;
 * a pause that lets the app's interval run on; a seek pad whose keys are not
 * the transport's; a playhead taken to the clip's end while playing that does
 * not stop the transport; a play from a finished clip that stays finished; and
 * a player disabled while running that keeps its clock. The frame source is
 * recorded on every call, so the suite also holds that the paint follows the
 * playhead the transport reports.
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { MediaPlayer, type MediaFrame } from "../media-player.js";

/** A 4×4 frame whose bytes are a whole buffer, so the paint path is exercised. */
const frameFor = (colour: number): MediaFrame => ({
  width: 4,
  height: 4,
  pixels: Uint8Array.from({ length: 64 }, (_, at) =>
    at % 4 === 3 ? 255 : colour,
  ),
});

/** How long a delivered key or press waits before the next read. */
const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 40);
  });

const waitUntil = async (
  ready: () => boolean,
  attempts = 40,
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

interface Page {
  readonly root: TestRoot;
  readonly frames: number[];
  readonly playheads: number[];
  readonly playing: boolean[];
  show: (disabled: boolean) => void;
}

const mount = (): Page => {
  const frames: number[] = [];
  const playheads: number[] = [];
  const playing: boolean[] = [];
  const root = createTestRoot({ width: 800, height: 600 });
  const show = (disabled: boolean): void => {
    root.render(
      <ThemeProvider theme={lightTheme}>
        <MediaPlayer
          testId="player"
          duration={4000}
          alt="A clip's frame"
          label="Preview"
          tickMs={20}
          seekStep={1000}
          width={160}
          height={90}
          trackWidth={200}
          peaks={[0.25, 0.75, 0.5, 1]}
          frameAt={(playhead) => {
            frames.push(playhead);
            return Option.some(frameFor(playhead % 256));
          }}
          onPlayheadChange={(playhead) => playheads.push(playhead)}
          onPlayingChange={(next) => playing.push(next)}
          disabled={disabled}
        />
      </ThemeProvider>,
    );
  };
  show(false);
  return { root, frames, playheads, playing, show };
};

const textOf = (root: TestRoot, testId: string): string => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) return "";
  // A `<text>` host holds its words in a text child, so the read walks the
  // subtree rather than reading the wrapper's own `text` field.
  const collect = (id: number): string => {
    const node = root.renderer.getElement(id);
    if (node === undefined) return "";
    return `${node.text ?? ""}${node.children.map(collect).join("")}`;
  };
  return collect(element.id);
};

const fillOf = (root: TestRoot): number =>
  root.renderer.getElementBounds(
    root.renderer.findByTestId("media-fill")?.id ?? -1,
  )?.width ?? -1;

const focusSeek = (root: TestRoot): void => {
  const seek = root.renderer.findByTestId("media-seek");
  if (seek === undefined) throw new Error("behaviour: the seek pad is missing");
  root.renderer.focusElement(seek.id);
};

const click = (root: TestRoot, testId: string): void => {
  const at = centreOf(root, testId);
  root.renderer.nativeSimulateClick(at.x, at.y);
};

describe("MediaPlayer transport", () => {
  it("runs its own clock while playing and holds it on pause", async () => {
    const page = mount();
    expect(textOf(page.root, "media-time")).toBe("0:00 / 0:04");
    click(page.root, "media-play");
    await waitUntil(() => (page.playheads.at(-1) ?? 0) >= 200);
    expect(page.playheads.length).toBeGreaterThan(0);
    expect(page.playheads.at(-1)).toBeGreaterThanOrEqual(200);
    expect(page.playing).toStrictEqual([true]);
    expect(textOf(page.root, "media-play")).toBe("Pause");
    expect(fillOf(page.root)).toBeGreaterThan(0);

    click(page.root, "media-play");
    await settle();
    const held = page.playheads.length;
    expect(page.playing).toStrictEqual([true, false]);
    expect(textOf(page.root, "media-play")).toBe("Play");
    await settle();
    expect(page.playheads.length).toBe(held);
    page.root.unmount();
  });

  it("seeks with Home, End, Left and Right and stops at the end", async () => {
    const page = mount();
    focusSeek(page.root);
    page.root.renderer.simulateKeystrokes("end");
    expect(textOf(page.root, "media-time")).toBe("0:04 / 0:04");
    expect(fillOf(page.root)).toBe(200);
    expect(page.playheads.at(-1)).toBe(4000);

    page.root.renderer.simulateKeystrokes("home");
    expect(textOf(page.root, "media-time")).toBe("0:00 / 0:04");
    Arr.forEach(Arr.range(1, 3), () => {
      page.root.renderer.simulateKeystrokes("right");
    });
    expect(textOf(page.root, "media-time")).toBe("0:03 / 0:04");
    expect(fillOf(page.root)).toBe(150);

    // A seek does not start the clip.
    expect(page.playing).toStrictEqual([]);
    click(page.root, "media-play");
    await waitUntil(() => page.playing.includes(true));
    focusSeek(page.root);
    page.root.renderer.simulateKeystrokes("end");
    await waitUntil(() => page.playing.at(-1) === false);
    expect(page.playing.at(-1)).toBe(false);
    expect(fillOf(page.root)).toBe(200);
    page.root.unmount();
  });

  it("restarts a finished clip when play is pressed", async () => {
    const page = mount();
    focusSeek(page.root);
    page.root.renderer.simulateKeystrokes("end");
    expect(page.playheads.at(-1)).toBe(4000);
    click(page.root, "media-play");
    await waitUntil(() => page.playing.includes(true));
    expect(page.playheads.at(-1)).toBe(0);
    expect(page.playing.at(-1)).toBe(true);
    click(page.root, "media-play");
    page.root.unmount();
  });

  it("stops a running clip when it is disabled and refuses its keys", async () => {
    const page = mount();
    click(page.root, "media-play");
    await waitUntil(() => page.playing.includes(true));
    page.show(true);
    await waitUntil(() => page.playing.at(-1) === false);
    expect(page.playing.at(-1)).toBe(false);

    const held = page.playheads.length;
    focusSeek(page.root);
    page.root.renderer.simulateKeystrokes("end");
    await settle();
    expect(page.playheads.length).toBe(held);
    expect(textOf(page.root, "media-time")).not.toBe("0:04 / 0:04");
    page.root.unmount();
  });

  it("asks for the frame the playhead stands on", async () => {
    const page = mount();
    focusSeek(page.root);
    page.root.renderer.simulateKeystrokes("end");
    expect(page.frames).toContain(4000);
    page.root.renderer.simulateKeystrokes("home");
    expect(page.frames).toContain(0);
    page.root.unmount();
  });
});
