import { createTestRoot } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { writeFileSync } from "node:fs";
import type { ReactNode } from "react";

export const FPS = 30;

export const DEVICE_SCALE = 2;

export type Aim =
  | { readonly testId: string; readonly dx?: number; readonly dy?: number }
  | { readonly x: number; readonly y: number };

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

  readonly pointer?: ReadonlyArray<Waypoint>;

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
