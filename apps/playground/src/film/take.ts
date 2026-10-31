/**
 * The launch film's take runner: one real GPUix tree, driven by real input and a
 * paused motion clock, captured one PNG per frame.
 *
 * A take is a pure function of its frame index: the tree it renders and where
 * the pointer is. The runner moves the pointer through GPUI's own hit testing
 * (a press is a real mouse-down, a drag is real moves holding the button), sets
 * the motion clock to the frame's time, flushes and captures. The pointer path
 * is written to `cursor.json` in output pixels, so the composition draws its
 * cursor exactly where the input went (an offscreen window has no OS pointer).
 */
import { createTestRoot } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { writeFileSync } from "node:fs";
import type { ReactNode } from "react";

/** Frames per second of every take. */
export const FPS = 30;
/** The test renderer captures at 2× the window's logical size (measured). */
export const DEVICE_SCALE = 2;

/** Where the pointer aims: an element's centre (plus an offset) or a point. */
export type Aim =
  | { readonly testId: string; readonly dx?: number; readonly dy?: number }
  | { readonly x: number; readonly y: number };

/** The pointer at a frame: where it is aimed and whether the button is held. */
export interface Waypoint {
  readonly frame: number;
  readonly aim: Aim;
  readonly down?: boolean;
}

export interface Take {
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  readonly view: (frame: number) => ReactNode;
  /** Keyframes of the pointer, in frame order; it eases between them. */
  readonly pointer?: ReadonlyArray<Waypoint>;
  /** Keystrokes sent to the focused element on a frame (`"a b enter"`). */
  readonly keys?: ReadonlyArray<{
    readonly frame: number;
    readonly keys: string;
  }>;
}

export interface PointerSample {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly down: boolean;
}

type Bounds = { x: number; y: number; width: number; height: number };

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** The pointer at `frame`: eased between the waypoints around it. */
export const pointerAt = (
  path: ReadonlyArray<Waypoint>,
  frame: number,
  locate: (aim: Aim) => { x: number; y: number },
): Option.Option<{ x: number; y: number; down: boolean }> =>
  Option.map(
    Arr.findLastIndex(path, (point) => point.frame <= frame),
    (index) => {
      const from = path[index]!;
      const start = locate(from.aim);
      const down = from.down === true;
      return Option.match(Option.fromNullishOr(path[index + 1]), {
        onNone: () => ({ ...start, down }),
        onSome: (to) => {
          const end = locate(to.aim);
          const t = easeInOut((frame - from.frame) / (to.frame - from.frame));
          return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            down,
          };
        },
      });
    },
  );

/** Capture `take` into `outDir` as `0000.png…` and `cursor.json`. */
export const capture = (
  take: Take,
  outDir: string,
): ReadonlyArray<PointerSample> => {
  const root = createTestRoot({ width: take.width, height: take.height });
  const renderer = root.renderer;
  const locate = (aim: Aim): { x: number; y: number } => {
    if ("x" in aim) return aim;
    const bounds: Bounds | null = Option.getOrNull(
      Option.flatMapNullishOr(
        Option.fromNullishOr(renderer.findByTestId(aim.testId)),
        (element) => renderer.getElementBounds(element.id),
      ),
    );
    if (bounds === null) throw new Error(`take: no element "${aim.testId}"`);
    return {
      x: bounds.x + bounds.width / 2 + (aim.dx ?? 0),
      y: bounds.y + bounds.height / 2 + (aim.dy ?? 0),
    };
  };

  // Each aim is resolved once, when the pointer first needs it, and kept: a
  // press may remove its own target (a photo that opens full-screen).
  const resolved = new Map<Aim, { x: number; y: number }>();
  const located = (aim: Aim): { x: number; y: number } => {
    const point = resolved.get(aim) ?? locate(aim);
    resolved.set(aim, point);
    return point;
  };

  root.render(take.view(0));
  renderer.flush();
  const origin = renderer.clockPause();
  const samples: PointerSample[] = [];
  let held = false;

  for (let frame = 0; frame < take.frames; frame += 1) {
    root.render(take.view(frame));
    renderer.flush();
    // A measured layout (a grid sized by `onLayout`) appears once its layout
    // events are delivered, on the paint after.
    renderer.dispatchNativeEvents();
    renderer.flush();
    for (const { keys } of Arr.filter(
      take.keys ?? [],
      (k) => k.frame === frame,
    ))
      renderer.simulateKeystrokes(keys);
    Option.map(
      pointerAt(take.pointer ?? [], frame, located),
      ({ x, y, down }) => {
        renderer.nativeSimulateMouseMove(x, y, held ? 0 : undefined);
        if (down && !held) renderer.nativeSimulateMouseDown(x, y, 0);
        if (!down && held) renderer.nativeSimulateMouseUp(x, y, 0);
        held = down;
        samples.push({ frame, x: x * DEVICE_SCALE, y: y * DEVICE_SCALE, down });
      },
    );
    renderer.clockSet(origin + (frame * 1000) / FPS);
    renderer.flush();
    renderer.captureScreenshot(
      `${outDir}/${String(frame).padStart(4, "0")}.png`,
    );
  }
  root.unmount();
  writeFileSync(`${outDir}/cursor.json`, JSON.stringify(samples));
  return samples;
};
