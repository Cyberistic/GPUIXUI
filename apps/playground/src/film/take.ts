import { createTestRoot } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
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
  readonly watch?: string;
  readonly pointer?: ReadonlyArray<Waypoint>;

  readonly keys?: ReadonlyArray<{
    readonly frame: number;
    readonly keys: string;
  }>;
  readonly boxes?: boolean;
}

export interface BlueprintBox {
  readonly kind: "box" | "text";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
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

const painted = (style: Record<string, unknown>): boolean =>
  (typeof style.backgroundColor === "string" &&
    style.backgroundColor !== "transparent") ||
  (typeof style.borderWidth === "number" && style.borderWidth > 0);

const blueprint = (
  renderer: ReturnType<typeof createTestRoot>["renderer"],
): ReadonlyArray<BlueprintBox> => {
  const of = (type: "div" | "text", kind: BlueprintBox["kind"]) =>
    Arr.flatMap(renderer.findByType(type), (element) =>
      Option.match(
        Option.fromNullishOr(renderer.getElementBounds(element.id)),
        {
          onNone: (): ReadonlyArray<BlueprintBox> => [],
          onSome: (b): ReadonlyArray<BlueprintBox> =>
            b.width < 3 ||
            b.height < 3 ||
            (kind === "box" && !painted(element.style))
              ? []
              : [
                  {
                    kind,
                    x: b.x * DEVICE_SCALE,
                    y: b.y * DEVICE_SCALE,
                    width: b.width * DEVICE_SCALE,
                    height: b.height * DEVICE_SCALE,
                    radius:
                      typeof element.style.borderRadius === "number"
                        ? element.style.borderRadius * DEVICE_SCALE
                        : 0,
                  },
                ],
        },
      ),
    );
  return Arr.sort(
    [...of("div", "box"), ...of("text", "text")],
    Order.mapInput(
      Order.Tuple([Order.Number, Order.Number]),
      (b: BlueprintBox) => [b.y, b.x] as const,
    ),
  );
};

/** Capture `take` into `outDir` as `0000.png…` and `cursor.json`. */
export const virtualTime = () => {
  const real = {
    now: performance.now.bind(performance),
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  const due = new Map<number, { at: number; run: () => void }>();
  let now = real.now();
  let nextId = 1;
  performance.now = () => now;
  // only a real wait is the capture's to advance.
  const schedule = (run: () => void, delay = 0) => {
    if (delay <= 0) return real.setTimeout(run, 0);
    const id = nextId;
    nextId += 1;
    due.set(id, { at: now + delay, run });
    const timer = {
      id,
      ref: () => timer,
      unref: () => timer,
      hasRef: () => true,
    };
    return timer;
  };
  const cancel = (timer?: unknown) => {
    if (typeof timer === "object" && timer !== null && "id" in timer)
      due.delete(timer.id as number);
    else real.clearTimeout(timer as NodeJS.Timeout);
  };
  Object.assign(globalThis, { setTimeout: schedule, clearTimeout: cancel });
  return {
    /** One real turn: zero-delay timers and the microtasks they start have run. */
    turn: (): Promise<void> =>
      new Promise((resolve) => real.setTimeout(resolve, 2)),
    advance: (ms: number): void => {
      const target = now + ms;
      for (;;) {
        const next = Arr.head(
          Arr.sort(
            Arr.filter([...due], ([, task]) => task.at <= target),
            Order.mapInput(
              Order.Number,
              ([, task]: [number, { at: number }]) => task.at,
            ),
          ),
        );
        if (Option.isNone(next)) break;
        const [id, task] = next.value;
        due.delete(id);
        now = Math.max(now, task.at);
        task.run();
      }
      now = target;
    },
    restore: (): void => {
      performance.now = real.now;
      Object.assign(globalThis, {
        setTimeout: real.setTimeout,
        clearTimeout: real.clearTimeout,
      });
    },
  };
};

export const capture = async (
  take: Take,
  outDir: string,
): Promise<ReadonlyArray<PointerSample>> => {
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
  const time = virtualTime();
  const origin = renderer.clockPause();
  const samples: PointerSample[] = [];
  const changes: number[] = [];
  let watched: unknown;
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
    await time.turn();
    renderer.flush();
    renderer.clockSet(origin + (frame * 1000) / FPS);
    time.advance(1000 / FPS);
    await time.turn();
    renderer.flush();
    if (take.watch !== undefined) {
      const value = renderer.findByTestId(take.watch)?.customProps?.[
        "aria-valuetext"
      ];
      if (frame > 0 && value !== watched) changes.push(frame);
      watched = value;
    }
    renderer.captureScreenshot(
      `${outDir}/${String(frame).padStart(4, "0")}.png`,
    );
    if (frame === 0 && take.boxes === true)
      writeFileSync(
        `${outDir}/boxes.json`,
        JSON.stringify(blueprint(renderer)),
      );
  }
  root.unmount();
  time.restore();
  writeFileSync(`${outDir}/cursor.json`, JSON.stringify(samples));
  if (take.watch !== undefined)
    writeFileSync(`${outDir}/changes.json`, JSON.stringify(changes));
  return samples;
};
