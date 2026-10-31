/**
 * The film's terminal take: the command the film types, `nub run dev settings
 * --terminal` in `examples/blocks`, run in a pty by GPUix's terminal platform; its
 * kitty-graphics frames decoded and resampled to 30 fps.
 *
 * The pty answers no pixel-size query, so the harness sends the in-band resize
 * kitty terminals send (`CSI 48 ; rows ; cols ; height ; width t`) with a
 * 1024×576 pixel area. One click (an SGR-pixel press and release, the
 * terminal's own report) lands on the Dark mode switch, found in the first
 * painted frame by the Linux look's own off-switch paint. Every synchronized-update
 * batch the platform writes is one frame; its arrival time places it.
 *
 *   nub apps/playground/dist/film/terminal-take.js <outDir>
 */
import { Pixels } from "@gpuixui/testing";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { parseKittyStream, type KittyFrame } from "../terminal/kitty.js";
import { FPS, type PointerSample } from "./take.js";
import { lightTheme, platformTheme } from "@gpuixui/tokens";

const SIZE = { width: 1024, height: 576, columns: 128, rows: 36 } as const;
/** Seconds of footage after the first full-size frame, and the click in it. */
const LENGTH = 3.4;
const CLICK_AT = 1.2;
const END_OF_BATCH = "\x1b[?2026l";

/** The Dark mode switch: the switch-on paint in the band above the sound card. */
const BAND = { x: 0, y: 0, width: 1024, height: 180 } as const;

const switchIn = (frame: KittyFrame): Option.Option<{ x: number; y: number }> =>
  Option.flatMap(
    Option.fromNullishOr(Pixels.crop(frame.pixels, BAND)),
    (band) =>
      Option.flatMap(
        Option.flatMapNullishOr(
          Option.fromNullishOr(platformTheme(lightTheme, "linux").switch),
          (paint) => Pixels.hexToRgba(paint.off),
        ),
        (on) =>
          Option.map(
            Option.fromNullishOr(Pixels.boundsOfColour(band, on)),
            (b) => ({
              x: Math.round(BAND.x + b.x + b.width / 2),
              y: Math.round(BAND.y + b.y + b.height / 2),
            }),
          ),
      ),
  );

interface Arrival {
  readonly ms: number;
  readonly end: number;
}

interface Recording {
  readonly bytes: Buffer;
  readonly arrivals: ReadonlyArray<Arrival>;
  readonly firstFull: number;
  readonly clickMs: number;
  readonly target: Option.Option<{ x: number; y: number }>;
}

const record = () =>
  Effect.callback<Recording>((resume) => {
    const command = `cd ${BLOCKS} && cat | /usr/bin/script -q /dev/null /bin/sh -c 'stty rows ${SIZE.rows} cols ${SIZE.columns}; exec nub run dev settings --terminal'`;
    const child = spawn("/bin/sh", ["-c", command], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    child.stdin.on("error", () => {});
    const chunks: Buffer[] = [];
    const arrivals: Arrival[] = [];
    const start = performance.now();
    let length = 0;
    let firstFull = -1;
    let clickMs = -1;
    let target: Option.Option<{ x: number; y: number }> = Option.none();
    const send = (bytes: string) => child.stdin.write(bytes);
    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      length += chunk.length;
      const ms = performance.now() - start;
      arrivals.push({ ms, end: length });
      if (firstFull < 0 && chunk.includes(`s=${SIZE.width},v=${SIZE.height}`)) {
        firstFull = ms;
        setTimeout(() => {
          const painted = parseKittyStream(
            Buffer.concat(chunks),
            inflateSync,
          ).frames;
          target = Option.flatMap(Arr.last(painted), switchIn);
          Option.map(target, ({ x, y }) => {
            clickMs = performance.now() - start;
            send(`\x1b[<0;${x};${y}M`);
            setTimeout(() => send(`\x1b[<0;${x};${y}m`), 120);
          });
        }, CLICK_AT * 1000);
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
                  clickMs,
                  target,
                }),
              );
            }, 800);
          },
          LENGTH * 1000 + 300,
        );
      }
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
    Arr.last(Arr.filter(frames, (f) => f.pixels.width === SIZE.width)).pipe(
      (last) =>
        last._tag === "Some" && arrival._tag === "Some"
          ? stamped.push({ ms: arrival.value.ms, frame: last.value })
          : 0,
    );
    from = end;
  }
  return stamped;
};

const [, , outDir = ""] = process.argv;
/** The blocks package: the film runs the command it types, in this directory. */
const BLOCKS = new URL("../../../../examples/blocks", import.meta.url).pathname;

Effect.runPromise(
  Effect.gen(function* () {
    const {
      bytes,
      arrivals,
      firstFull,
      clickMs,
      target: found,
    } = yield* record();
    if (Option.isNone(found))
      return yield* Effect.logError(
        "terminal take: no Dark mode switch painted; nothing was clicked",
      );
    const target = found.value;
    const stamped = framesOf(bytes, arrivals);
    yield* Effect.logInfo(
      `${stamped.length} painted frames, first at ${Math.round(firstFull)} ms, click at ${Math.round(clickMs)} ms`,
    );
    mkdirSync(outDir, { recursive: true });
    const frames = Math.round(LENGTH * FPS);
    const shownAt = (frame: number) =>
      Option.orElse(
        Arr.findLast(stamped, (s) => s.ms <= firstFull + (frame * 1000) / FPS),
        () => Arr.head(stamped),
      );
    const first = shownAt(0);
    const differs = (a: typeof first, b: typeof first) =>
      Option.isSome(a) &&
      Option.isSome(b) &&
      (Pixels.countDifferingPixels(
        a.value.frame.pixels,
        b.value.frame.pixels,
      ) ?? 0) > 0;
    // The repaint is placed by its arrival; this rig's pty pipe carries a
    // 2048×1152 frame as base64 zlib, so the press is drawn 3 frames before it.
    const repaint = Option.getOrElse(
      Arr.findFirstIndex(Arr.range(0, frames - 1), (frame) =>
        differs(shownAt(frame), first),
      ),
      () => frames,
    );
    const pointer: PointerSample[] = [];
    for (let frame = 0; frame < frames; frame += 1) {
      Option.map(shownAt(frame), (shown) => {
        const png = Pixels.encodePng(shown.frame.pixels, deflateSync);
        if (png instanceof Uint8Array)
          writeFileSync(`${outDir}/${String(frame).padStart(4, "0")}.png`, png);
      });
      pointer.push({
        frame,
        x: target.x,
        y: target.y,
        down: frame >= repaint - 3 && frame < repaint + 1,
      });
    }
    writeFileSync(`${outDir}/cursor.json`, JSON.stringify(pointer));
    writeFileSync(
      `${outDir}/timing.json`,
      JSON.stringify({
        clickFrame: Math.round(((clickMs - firstFull) / 1000) * FPS),
        repaintFrame: repaint,
      }),
    );
  }),
);
