/**
 * The film's terminal takes: the command the film types (`nub run dev <block>
 * --terminal` in `examples/blocks`, or the calculator's own `terminal` script),
 * run in a pty by GPUix's terminal platform; its kitty-graphics frames decoded
 * and resampled to 30 fps.
 *
 * The pty answers no pixel-size query, so the harness sends the in-band resize
 * kitty terminals send (`CSI 48 ; rows ; cols ; height ; width t`) with a
 * 1024×576 pixel area. Each click is an SGR-pixel press and release (the
 * terminal's own report) on a `testId`, measured by laying the same block out in
 * a test window of the same size and theme; between clicks the pointer moves as a
 * hand would, reported as SGR motion. Every synchronized-update batch the
 * platform writes is one frame; its arrival time places it.
 *
 *   nub apps/playground/dist/film/terminal-take.js <outDir> <program> <[~]testId@seconds>…
 *
 * A hover stop (`~testId`) moves the pointer there without pressing.
 *
 * TODO: terminal mode paints a sidebar's collapse only with the next committing
 * press (a hover or a press on plain text does not), though a toast's arrival
 * paints alone. Measured here 2026-11-01; the collapse likely waits on a layout
 * event the terminal platform delivers with input. A runtime fix is owed.
 */
import { createTestRoot } from "@gpuix/react/testing";
import { Console } from "@gpuixui/blocks/console";
import { SettingsApp } from "@gpuixui/blocks/settings";
import { CalculatorApp } from "@gpuixui/calculator/app";
import { Pixels } from "@gpuixui/testing";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { MotionProvider } from "@gpuixui/motion/react";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { createElement, type ReactNode } from "react";
import { parseKittyStream, type KittyFrame } from "../terminal/kitty.js";
import { FPS, type PointerSample } from "./take.js";

const SIZE = { width: 1024, height: 576, columns: 128, rows: 36 } as const;
const END_OF_BATCH = "\x1b[?2026l";
/** Seconds of footage kept after the last click. */
const TAIL = 1.2;
/** Where the pointer starts, and how often it reports a move (ms). */
const REST = { x: 700, y: 420 } as const;
const MOVE_EVERY = 33;

/**
 * The pointer at `t` seconds: gliding to each click over the 0.6 s before it.
 * Terminal mode repaints on input, so the moves a real pointer makes are what
 * let an animation (the sidebar collapsing, a toast arriving) paint its frames.
 */
const pointerAt = (
  clicks: ReadonlyArray<Click>,
  t: number,
): { x: number; y: number } => {
  let from: { x: number; y: number } = REST;
  for (const click of clicks) {
    const start = click.at - 0.6;
    if (t < start) return from;
    if (t < click.at) {
      const k = (t - start) / 0.6;
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      return {
        x: Math.round(from.x + (click.x - from.x) * e),
        y: Math.round(from.y + (click.y - from.y) * e),
      };
    }
    from = click;
  }
  return from;
};

interface Program {
  /** The tree as the terminal run renders it, laid out to measure each click. */
  readonly tree: ReactNode;
  /** Where the command runs, relative to the repo root, and the command. */
  readonly dir: string;
  readonly command: string;
}

const block = (tree: ReactNode, name: string): Program => ({
  tree,
  dir: "examples/blocks",
  command: `nub run dev ${name} --terminal`,
});

/** The programs the film runs in a terminal. */
const programs: Readonly<Record<string, Program>> = {
  settings: block(
    createElement(SettingsApp, { initialLook: "linux" }),
    "settings",
  ),
  console: block(createElement(Console), "console"),
  calculator: {
    tree: createElement(CalculatorApp),
    dir: "examples/calculator",
    command: "nub run terminal",
  },
};

interface Click {
  readonly testId: string;
  /** A hover-only stop (`~testId@seconds`): the pointer arrives, nothing is pressed. */
  readonly hover: boolean;
  readonly at: number;
  readonly x: number;
  readonly y: number;
}

/** Where each `testId` lays out in a 1024×576 window: the terminal's frame. */
const measure = (block: ReactNode, wanted: ReadonlyArray<string>) => {
  const root = createTestRoot({ width: SIZE.width, height: SIZE.height });
  root.render(
    createElement(
      MotionProvider,
      { preference: "reduced" },
      createElement(
        ThemeProvider,
        { theme: platformTheme(lightTheme, "darwin") },
        block,
      ),
    ),
  );
  root.renderer.flush();
  root.renderer.dispatchNativeEvents();
  root.renderer.flush();
  const points = R.fromEntries(
    Arr.map(wanted, (testId) => {
      const element = root.renderer.findByTestId(testId);
      const b =
        element === undefined
          ? null
          : root.renderer.getElementBounds(element.id);
      return [
        testId,
        b === null
          ? null
          : {
              x: Math.round(b.x + b.width / 2),
              y: Math.round(b.y + b.height / 2),
            },
      ] as const;
    }),
  );
  root.unmount();
  return points;
};

interface Arrival {
  readonly ms: number;
  readonly end: number;
}

const record = (
  program: Program,
  clicks: ReadonlyArray<Click>,
  length: number,
) =>
  Effect.callback<{
    bytes: Buffer;
    arrivals: ReadonlyArray<Arrival>;
    firstFull: number;
    sent: ReadonlyArray<number>;
  }>((resume) => {
    const command = `cd ${ROOT}${program.dir} && cat | /usr/bin/script -q /dev/null /bin/sh -c 'stty rows ${SIZE.rows} cols ${SIZE.columns}; exec ${program.command}'`;
    const child = spawn("/bin/sh", ["-c", command], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    child.stdin.on("error", () => {});
    const chunks: Buffer[] = [];
    const arrivals: Arrival[] = [];
    const sent: number[] = [];
    const start = performance.now();
    let length_ = 0;
    let firstFull = -1;
    const send = (bytes: string) => child.stdin.write(bytes);
    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      length_ += chunk.length;
      const ms = performance.now() - start;
      arrivals.push({ ms, end: length_ });
      if (firstFull >= 0 || !chunk.includes(`s=${SIZE.width},v=${SIZE.height}`))
        return;
      firstFull = ms;
      const moves = setInterval(() => {
        const { x, y } = pointerAt(
          clicks,
          (performance.now() - start - firstFull) / 1000,
        );
        send(`\x1b[<35;${x};${y}M`);
      }, MOVE_EVERY);
      setTimeout(() => clearInterval(moves), length * 1000);
      for (const { x, y, at } of Arr.filter(clicks, (c) => !c.hover))
        setTimeout(() => {
          sent.push(performance.now() - start);
          send(`\x1b[<0;${x};${y}M`);
          setTimeout(() => send(`\x1b[<0;${x};${y}m`), 120);
        }, at * 1000);
      setTimeout(
        () => {
          send("\u0003");
          setTimeout(() => {
            child.kill("SIGKILL");
            resume(
              Effect.succeed({
                bytes: Buffer.concat(chunks),
                arrivals,
                firstFull,
                sent,
              }),
            );
          }, 800);
        },
        length * 1000 + 300,
      );
    });
    setTimeout(
      () =>
        send(
          `\x1b[48;${SIZE.rows};${SIZE.columns};${SIZE.height};${SIZE.width}t`,
        ),
      7000,
    );
  });

/** Each batch's last full-size frame, stamped with the time its batch closed. */
const framesOf = (bytes: Buffer, arrivals: ReadonlyArray<Arrival>) => {
  const text = bytes.toString("latin1");
  const stamped: Array<{ ms: number; frame: KittyFrame }> = [];
  let from = 0;
  for (
    let at = text.indexOf(END_OF_BATCH);
    at >= 0;
    at = text.indexOf(END_OF_BATCH, from)
  ) {
    const end = at + END_OF_BATCH.length;
    const frames = parseKittyStream(
      bytes.subarray(from, end),
      inflateSync,
    ).frames;
    const arrival = Arr.findFirst(arrivals, (a) => a.end >= end);
    const last = Arr.last(
      Arr.filter(frames, (f) => f.pixels.width === SIZE.width),
    );
    if (Option.isSome(last) && Option.isSome(arrival))
      stamped.push({ ms: arrival.value.ms, frame: last.value });
    from = end;
  }
  return stamped;
};

/** The repo root: each program runs the command the film types, in its directory. */
const ROOT = new URL("../../../../", import.meta.url).pathname;
const [, , outDir = "", name = "", ...specs] = process.argv;

Effect.runPromise(
  Effect.gen(function* () {
    const program = programs[name];
    if (program === undefined)
      return yield* Effect.logError(
        `terminal take: no program "${name}" (${Object.keys(programs).join(", ")})`,
      );
    const wanted = Arr.map(
      specs,
      (spec) => spec.replace(/^~/, "").split("@") as [string, string],
    );
    const points = measure(
      program.tree,
      Arr.map(wanted, ([testId]) => testId),
    );
    const clicks: Click[] = [];
    for (const [i, [testId, at]] of wanted.entries()) {
      const point = points[testId];
      if (point === null || point === undefined)
        return yield* Effect.logError(
          `terminal take: "${testId}" did not lay out`,
        );
      clicks.push({
        testId,
        at: Number(at),
        hover: specs[i]!.startsWith("~"),
        ...point,
      });
    }
    const length = Math.max(...Arr.map(clicks, (c) => c.at)) + TAIL;
    const { bytes, arrivals, firstFull } = yield* record(
      program,
      clicks,
      length,
    );
    const stamped = framesOf(bytes, arrivals);
    yield* Effect.logInfo(
      `${stamped.length} painted frames, first at ${Math.round(firstFull)} ms`,
    );
    mkdirSync(outDir, { recursive: true });
    const frames = Math.round(length * FPS);
    const shownAt = (frame: number) =>
      Option.orElse(
        Arr.findLast(stamped, (s) => s.ms <= firstFull + (frame * 1000) / FPS),
        () => Arr.head(stamped),
      );
    const differs = (a: number, b: number) =>
      Option.flatMap(shownAt(a), (x) =>
        Option.map(
          shownAt(b),
          (y) =>
            Pixels.countDifferingPixels(x.frame.pixels, y.frame.pixels) ?? 0,
        ),
      ).pipe(Option.getOrElse(() => 0)) > 0;
    // Each click's repaint is the first changed frame after it is sent; this rig's
    // pty pipe delays it, so the press is drawn 3 frames before its repaint.
    const presses = Arr.filter(clicks, (c) => !c.hover);
    const repaints = Arr.map(presses, (click) => {
      const from = Math.round(click.at * FPS);
      return Option.getOrElse(
        Arr.findFirst(Arr.range(from, frames - 1), (f) => differs(f, f - 1)),
        () => from,
      );
    });
    const pointer: PointerSample[] = [];
    for (let frame = 0; frame < frames; frame += 1) {
      Option.map(shownAt(frame), (shown) => {
        const png = Pixels.encodePng(shown.frame.pixels, deflateSync);
        if (png instanceof Uint8Array)
          writeFileSync(`${outDir}/${String(frame).padStart(4, "0")}.png`, png);
      });
      const { x, y } = pointerAt(clicks, frame / FPS);
      pointer.push({
        frame,
        x,
        y,
        down: Arr.some(repaints, (r) => frame >= r - 3 && frame < r + 1),
      });
    }
    writeFileSync(`${outDir}/cursor.json`, JSON.stringify(pointer));
    writeFileSync(
      `${outDir}/timing.json`,
      JSON.stringify(
        Arr.map(presses, (c, i) => ({
          testId: c.testId,
          x: c.x,
          y: c.y,
          clickFrame: Math.round(c.at * FPS),
          repaintFrame: repaints[i],
        })),
      ),
    );
  }),
);
