import {
  Clock,
  Console,
  Duration,
  Effect,
  FileSystem,
  Option,
  Path,
  Schedule,
} from "effect";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import type * as PlatformError from "effect/PlatformError";
import { NodeServices } from "@effect/platform-node";
import { spawn } from "node:child_process";
import { deflateSync, inflateSync } from "node:zlib";
import { Pixels, Report, Smoke } from "@gpuixui/testing";
import { EXIT, formatMissing, parseArgs, type ExitCode } from "../smoke/run.js";
import {
  parseKittyStream,
  type KittyFrame,
  type KittyStream,
} from "./kitty.js";
import {
  TERMINAL_CLICK_INK,
  TERMINAL_INK,
  TERMINAL_NO_TERMINAL,
  TERMINAL_PRESSED,
  TERMINAL_REST,
} from "./logic.js";

export const TERMINAL_GRID = { columns: 100, rows: 40 } as const;

export const TERMINAL_CELL = { width: 8, height: 16 } as const;

export const PAGE_SHARE = 0.9;

export const KEY_T = "\x1b[116u";

export const CTRL_C = "\u0003";

export const POINTER_AT = {
  x: (TERMINAL_GRID.columns * TERMINAL_CELL.width) / 2,
  y: (TERMINAL_GRID.rows * TERMINAL_CELL.height) / 2,
} as const;

export const RESIZED_GRID = { columns: 50, rows: 20 } as const;

export const RESIZE_SEQUENCE = `\x1b[48;${RESIZED_GRID.rows};${RESIZED_GRID.columns};0;0t`;

export const POINTER_CLICK = `\x1b[<0;${POINTER_AT.x};${POINTER_AT.y}M\x1b[<0;${POINTER_AT.x};${POINTER_AT.y}m`;

const FIRST_FRAME_ATTEMPTS = 150;
const KEY_FRAME_ATTEMPTS = 100;
const POLL = Schedule.spaced(Duration.millis(100));
const EXIT_TIMEOUT = Duration.seconds(20);

class TerminalError extends Schema.TaggedError<TerminalError>()(
  "TerminalError",
  {
    stage: Schema.Literals(["spawn", "frame", "exit", "decode"]),
    detail: Schema.String,
  },
) {}

export interface TerminalScenarioMeta {
  readonly id: string;
  readonly title: string;
  readonly capability: Smoke.Capability;
}

export const terminalRegistry: ReadonlyArray<TerminalScenarioMeta> = [
  {
    id: "terminal-render",
    title:
      "Terminal: the runtime paints an app into a pty through the kitty graphics protocol",
    capability: "content",
  },
  {
    id: "terminal-resize",
    title:
      "Terminal: the terminal's in-band resize repaints the app at the new grid",
    capability: "layout",
  },
  {
    id: "terminal-pointer",
    title:
      "Terminal: a pointer press reaches the app and repaints the word, not the page",
    capability: "input",
  },
  {
    id: "terminal-input",
    title:
      "Terminal: a kitty key reaches the app, repaints the page, and ctrl-c restores the terminal",
    capability: "input",
  },
];

export const selectScenarios = (
  only: ReadonlyArray<string>,
): ReadonlyArray<TerminalScenarioMeta> =>
  Arr.match(only, {
    onEmpty: () => terminalRegistry,
    onNonEmpty: (ids) =>
      Arr.filter(terminalRegistry, (scenario) =>
        Arr.contains(ids, scenario.id),
      ),
  });

export const usage: string = Arr.join(
  [
    "usage:",
    "  --only <scenario-id>  run only these scenarios (repeatable)",
    "  --list                print the scenario ids and exit",
    "  --json                print the JSON report after the run",
    "  --artifacts <dir>     report and capture directory",
    "exit 2: the terminal probe produced no evidence",
  ],
  "\n",
);

const concat = (chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(
    Arr.reduce(chunks, 0, (total, chunk) => total + chunk.length),
  );
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
};

export const shareOf = (frame: KittyFrame, colour: Pixels.Rgba): number =>
  Pixels.countColour(frame.pixels, colour) /
  (frame.pixels.width * frame.pixels.height);

const inkPixelsOf = (frame: KittyFrame, colour: Pixels.Rgba): number =>
  Pixels.countColour(frame.pixels, colour);

export const firstPainted = (
  frames: ReadonlyArray<KittyFrame>,
  colour: Pixels.Rgba,
  share: number,
): Option.Option<KittyFrame> =>
  Arr.findFirst(frames, (frame) => shareOf(frame, colour) >= share);

export interface Painted {
  readonly rest: KittyFrame;
  readonly clicked: Option.Option<KittyFrame>;
  readonly resized: Option.Option<KittyFrame>;
  readonly pressed: Option.Option<KittyFrame>;
}

export const paintedOf = (
  frames: ReadonlyArray<KittyFrame>,
): Option.Option<Painted> =>
  Option.flatMap(
    Arr.findFirstIndex(
      frames,
      (frame) => shareOf(frame, TERMINAL_REST) >= PAGE_SHARE,
    ),
    (index) =>
      Option.map(Arr.get(frames, index), (rest) => ({
        rest,

        clicked: Arr.findFirst(
          Arr.drop(frames, index + 1),
          (frame) => inkPixelsOf(frame, TERMINAL_CLICK_INK) > 100,
        ),
        resized: Arr.findFirst(
          Arr.drop(frames, index + 1),
          (frame) =>
            frame.pixels.width === RESIZED_GRID.columns * TERMINAL_CELL.width &&
            frame.pixels.height === RESIZED_GRID.rows * TERMINAL_CELL.height &&
            shareOf(frame, TERMINAL_REST) >= PAGE_SHARE,
        ),
        pressed: firstPainted(
          Arr.drop(frames, index + 1),
          TERMINAL_PRESSED,
          PAGE_SHARE,
        ),
      })),
  );

export const evidenceOf = (
  frames: ReadonlyArray<KittyFrame>,
): Option.Option<Painted> =>
  Option.map(Arr.head(frames), (first) =>
    Option.getOrElse(paintedOf(frames), () => ({
      rest: first,
      clicked: Option.none(),
      resized: Option.none(),
      pressed: Option.none(),
    })),
  );

const snapshot = (
  output: () => ReadonlyArray<Uint8Array>,
): Effect.Effect<KittyStream, TerminalError> =>
  Effect.gen(function* () {
    const chunks = output();
    return yield* Effect.try({
      try: () =>
        parseKittyStream(concat(chunks), (bytes) => inflateSync(bytes)),
      catch: (cause) =>
        new TerminalError({
          stage: "decode",
          detail: Option.match(Option.fromNullishOr(cause), {
            onNone: () => "unknown decode error",
            onSome: (error) => `${error}`,
          }),
        }),
    });
  });

const settle = (
  output: () => ReadonlyArray<Uint8Array>,
  ready: (stream: KittyStream) => boolean,
  attempts: number,
): Effect.Effect<KittyStream, TerminalError> =>
  snapshot(output).pipe(
    Effect.repeat({ schedule: POLL, times: attempts, until: ready }),
  );

const text = (chunks: ReadonlyArray<Uint8Array>): string =>
  new TextDecoder().decode(concat(chunks));

export const plainText = (chunks: ReadonlyArray<Uint8Array>): string => {
  /* oxlint-disable no-control-regex -- the value being stripped is a terminal stream */
  const stripped = text(chunks)
    .replace(/\x1b_G[^\x1b]*\x1b\\/g, "")
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-9;?<>=]*[A-Za-z]/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\r/g, "");

  return stripped.trim().length <= 300
    ? stripped.trim()
    : `…${stripped.trim().slice(-300)}`;
};

const rgbaText = (value: Pixels.Rgba): string =>
  `#${[value.r, value.g, value.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

interface Verdict {
  readonly label: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

const check = (verdict: Verdict): Smoke.CheckResult =>
  new Smoke.CheckResult({
    label: verdict.label,
    outcome: verdict.holds
      ? new Smoke.Passed({})
      : new Smoke.Failed({
          detail: `expected ${verdict.expected}, got ${verdict.actual}`,
        }),
  });

const inkOffset = (
  frame: KittyFrame,
): Option.Option<{ readonly x: number; readonly y: number }> =>
  Option.map(
    Option.fromNullishOr(Pixels.boundsOfColour(frame.pixels, TERMINAL_INK)),
    (bounds) => ({
      x: bounds.x + bounds.width / 2 - frame.pixels.width / 2,
      y: bounds.y + bounds.height / 2 - frame.pixels.height / 2,
    }),
  );

const shellWord = (value: string): string =>
  `'${Str.replaceAll("'", "'\\''")(value)}'`;

export const terminalCommand = (main: string): string =>
  Arr.join(
    [
      `stty rows ${TERMINAL_GRID.rows} cols ${TERMINAL_GRID.columns}`,
      `exec nub ${shellWord(main)}`,
    ],
    "; ",
  );

export const ptyCommand = (main: string): string =>
  `cat | /usr/bin/script -q /dev/null /bin/sh -c ${shellWord(terminalCommand(main))}`;

export interface TerminalProcess {
  readonly output: () => ReadonlyArray<Uint8Array>;

  readonly errors: () => ReadonlyArray<Uint8Array>;

  readonly diagnostics: () => ReadonlyArray<string>;
  readonly write: (bytes: Uint8Array) => Effect.Effect<void>;

  readonly close: Effect.Effect<void>;
  readonly exitCode: Effect.Effect<number>;
  readonly stop: Effect.Effect<void>;
}

const spawnTerminal = (
  main: string,
): Effect.Effect<TerminalProcess, TerminalError> =>
  Effect.try({
    try: () => {
      const child = spawn("/bin/sh", ["-c", ptyCommand(main)], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      child.stdin.on("error", () => {});

      const output: Uint8Array[] = [];
      const errors: Uint8Array[] = [];
      const diagnostics: string[] = [`spawned pid=${child.pid ?? "none"}`];
      child.on("spawn", () => diagnostics.push("spawn event"));
      child.on("error", (error) => {
        diagnostics.push(`spawn error: ${error.message}`);
      });
      child.on("exit", (code, signal) => {
        diagnostics.push(`exit code=${code} signal=${signal}`);
      });
      child.stdout.on("data", (chunk: Uint8Array) => {
        output.push(Uint8Array.from(chunk));
      });
      child.stderr.on("data", (chunk: Uint8Array) => {
        errors.push(Uint8Array.from(chunk));
      });
      return {
        output: () => output,
        errors: () => errors,
        diagnostics: () => diagnostics,
        write: (bytes) =>
          Effect.sync(() => {
            child.stdin.write(bytes);
          }),
        close: Effect.sync(() => {
          child.stdin.end();
        }),
        exitCode: Effect.callback<number>((resume) => {
          const onExit = (code: number | null) =>
            resume(Effect.succeed(code ?? -1));
          child.once("exit", onExit);
          return Effect.sync(() => {
            child.off("exit", onExit);
          });
        }),
        stop: Effect.sync(() => {
          if (child.exitCode === null) child.kill("SIGKILL");
        }),
      };
    },
    catch: (cause) => new TerminalError({ stage: "spawn", detail: `${cause}` }),
  });

interface Checks {
  readonly render: ReadonlyArray<Verdict>;
  readonly resize: ReadonlyArray<Verdict>;
  readonly pointer: ReadonlyArray<Verdict>;
  readonly input: ReadonlyArray<Verdict>;
}

const checksOf = (
  stream: KittyStream,
  exitCode: number,
  painted: Painted,
): Checks => {
  const handshake = stream.handshake;
  const frames = stream.frames;
  const first = Arr.head(frames);
  const width = Option.match(first, {
    onNone: () => 0,
    onSome: (frame) => frame.pixels.width,
  });
  const height = Option.match(first, {
    onNone: () => 0,
    onSome: (frame) => frame.pixels.height,
  });
  const placements = Arr.dedupe(
    Arr.map(frames, (frame) => `${frame.id}:${frame.placement}`),
  );
  const restShare = shareOf(painted.rest, TERMINAL_REST);
  const nativeShare = shareOf(painted.rest, TERMINAL_NO_TERMINAL);
  const inkPixels = Pixels.countColour(painted.rest.pixels, TERMINAL_INK);
  const offset = inkOffset(painted.rest);
  const centered = Option.match(offset, {
    onNone: () => false,
    onSome: (value) => Math.abs(value.x) <= 2 && Math.abs(value.y) <= 8,
  });
  const press = Option.match(painted.pressed, {
    onNone: () => ({ present: false, rest: -1 }),
    onSome: (frame) => ({
      present: true,
      rest: shareOf(frame, TERMINAL_REST),
    }),
  });
  const resize = Option.match(painted.resized, {
    onNone: () => ({ present: false, size: "none", rest: -1 }),
    onSome: (frame) => ({
      present: true,
      size: `${frame.pixels.width}x${frame.pixels.height}`,
      rest: shareOf(frame, TERMINAL_REST),
    }),
  });
  const click = Option.match(painted.clicked, {
    onNone: () => ({ present: false, rest: -1, ink: 0, white: -1 }),
    onSome: (frame) => ({
      present: true,
      rest: shareOf(frame, TERMINAL_REST),
      ink: inkPixelsOf(frame, TERMINAL_CLICK_INK),
      white: inkPixelsOf(frame, TERMINAL_INK),
    }),
  });
  const restored = Arr.every(
    [
      handshake.alternateScreenLeft,
      handshake.cursorShown,
      handshake.mouseOff,
      handshake.bracketedPasteOff,
      handshake.inBandResizeOff,
      handshake.keyboardPopped,
    ],
    (held) => held,
  );
  return {
    render: [
      {
        label: "the platform enters the alternate screen and hides the cursor",
        holds: handshake.alternateScreen && handshake.cursorHidden,
        expected: "the alternate screen entered with the cursor hidden",
        actual: `${handshake.alternateScreen}/${handshake.cursorHidden}`,
      },
      {
        label:
          "the terminal enables the mouse, keyboard, paste and resize protocols",
        holds:
          handshake.mouse &&
          handshake.mousePixel &&
          handshake.keyboard &&
          handshake.bracketedPaste &&
          handshake.inBandResize,
        expected:
          "mouse, pixel mouse, kitty keyboard, paste and in-band resize enabled",
        actual: `${handshake.mouse}/${handshake.mousePixel}/${handshake.keyboard}/${handshake.bracketedPaste}/${handshake.inBandResize}`,
      },
      {
        label: "the window is titled GPUIX",
        holds: Option.contains(handshake.title, "GPUIX"),
        expected: "GPUIX",
        actual: Option.getOrElse(handshake.title, () => "none"),
      },
      {
        label: "a frame arrives through the kitty graphics protocol",
        holds: Arr.isReadonlyArrayNonEmpty(frames),
        expected: "at least one frame",
        actual: `${Arr.length(frames)} frames`,
      },
      {
        label: "the frame is the pty grid at one cell per character",
        holds:
          width === TERMINAL_GRID.columns * TERMINAL_CELL.width &&
          height === TERMINAL_GRID.rows * TERMINAL_CELL.height,
        expected: `${TERMINAL_GRID.columns * TERMINAL_CELL.width}x${TERMINAL_GRID.rows * TERMINAL_CELL.height}`,
        actual: `${width}x${height}`,
      },
      {
        label: "every frame is wrapped in a synchronized update",
        holds: handshake.syncBatches >= Arr.length(frames),
        expected: `at least ${Arr.length(frames)} batches`,
        actual: `${handshake.syncBatches}`,
      },
      {
        label: "each frame replaces one image placement",
        holds: Arr.length(placements) === 1,
        expected: "one image id and placement",
        actual:
          Arr.length(placements) === 0
            ? "no frames"
            : Arr.join(placements, ", "),
      },
      {
        label: "the app fills the frame with its terminal page",
        holds: restShare >= PAGE_SHARE,
        expected: `at least ${PAGE_SHARE} of the frame in ${rgbaText(TERMINAL_REST)}`,
        actual: `${restShare.toFixed(3)} in ${rgbaText(TERMINAL_REST)}`,
      },
      {
        label: "the app reads isTerminal() as true",
        holds: nativeShare === 0,
        expected: "no pixels of the native-window page",
        actual: `${nativeShare.toFixed(3)} of ${rgbaText(TERMINAL_NO_TERMINAL)}`,
      },
      {
        label: "the word's glyphs are rasterised into the frame",
        holds: inkPixels > 100,
        expected: "more than 100 ink pixels",
        actual: `${inkPixels} ink pixels`,
      },
      {
        label: "the word is centred on the frame",
        holds: centered,
        expected: "within 2px horizontally and 8px vertically of the centre",
        actual: Option.match(offset, {
          onNone: () => "no ink",
          onSome: (value) => `${value.x.toFixed(1)}px, ${value.y.toFixed(1)}px`,
        }),
      },
    ],
    resize: [
      {
        label: "the terminal's in-band resize repaints at the new grid",
        holds: resize.present,
        expected: `${RESIZED_GRID.columns * TERMINAL_CELL.width}x${RESIZED_GRID.rows * TERMINAL_CELL.height}`,
        actual: resize.size,
      },
      {
        label: "the app fills the resized frame",
        holds: resize.present && resize.rest >= PAGE_SHARE,
        expected: `at least ${PAGE_SHARE} of the resized frame in ${rgbaText(TERMINAL_REST)}`,
        actual: resize.present
          ? `${resize.rest.toFixed(3)} in ${rgbaText(TERMINAL_REST)}`
          : "no resized frame",
      },
    ],
    pointer: [
      {
        label: "a pointer press reaches the app",
        holds: click.present,
        expected: `a frame painted ${rgbaText(TERMINAL_CLICK_INK)} ink`,
        actual: click.present ? "painted" : "no press frame",
      },
      {
        label: "the press repaints the ink, not the page",
        holds:
          click.present &&
          click.rest >= PAGE_SHARE &&
          click.white === 0 &&
          click.ink > 100,
        expected: `the rest page kept, ${rgbaText(TERMINAL_INK)} gone and more than 100 ${rgbaText(TERMINAL_CLICK_INK)} ink pixels`,
        actual: click.present
          ? `${click.rest.toFixed(3)} page, ${click.white} white, ${click.ink} pressed ink`
          : "no press frame",
      },
    ],
    input: [
      {
        label: "a key press repaints the page",
        holds: press.present,
        expected: `a frame painted ${rgbaText(TERMINAL_PRESSED)}`,
        actual: press.present ? "painted" : "no press frame",
      },
      {
        label: "the repaint replaces the rest page whole",
        holds: press.present && press.rest === 0,
        expected: "no rest-page pixels in the press frame",
        actual: press.present
          ? `${press.rest.toFixed(3)} of ${rgbaText(TERMINAL_REST)}`
          : "no press frame",
      },
      {
        label: "ctrl-c quits the run",
        holds: exitCode === 0,
        expected: "exit code 0",
        actual: `${exitCode}`,
      },
      {
        label: "the run restores the terminal",
        holds: restored,
        expected:
          "alternate screen left, cursor shown, protocols off, flags popped",
        actual: restored ? "all six restored" : "one or more modes left on",
      },
      {
        label: "the run deletes the painted image",
        holds: handshake.imageDeletes >= 1,
        expected: "at least one image delete",
        actual: `${handshake.imageDeletes}`,
      },
    ],
  };
};

const reportOf = (
  stream: KittyStream,
  exitCode: number,
  startedAt: number,
  now: number,
  painted: Painted,
  selected: ReadonlyArray<TerminalScenarioMeta>,
): Smoke.SmokeReport => {
  const checks = checksOf(stream, exitCode, painted);
  const scenarios = Arr.map(
    selected,
    (meta) =>
      new Smoke.ScenarioResult({
        id: meta.id,
        title: meta.title,
        capability: meta.capability,
        checks: Arr.map(
          meta.id === "terminal-render"
            ? checks.render
            : meta.id === "terminal-resize"
              ? checks.resize
              : meta.id === "terminal-pointer"
                ? checks.pointer
                : checks.input,
          check,
        ),
        durationMs: now - startedAt,
      }),
  );
  return new Smoke.SmokeReport({
    host: `gpuix terminal ${process.platform}-${process.arch} pty ${TERMINAL_GRID.columns}x${TERMINAL_GRID.rows}`,
    startedAt,
    durationMs: now - startedAt,
    scenarios,
    capabilities: Smoke.capabilityStatuses(
      scenarios,
      Option.some(Smoke.coverageOf(terminalRegistry)),
    ),
  });
};

const noFrame = (
  attempts: number,
  stream: KittyStream,
  diagnostics: ReadonlyArray<string>,
  output: ReadonlyArray<Uint8Array>,
  stderr: string,
): TerminalError =>
  new TerminalError({
    stage: "frame",
    detail: Arr.join(
      [
        `no terminal frame after ${attempts} polls (~${(attempts * 100) / 1000}s)`,
        `  frames: ${Arr.length(stream.frames)} ${Arr.join(
          Arr.map(
            stream.frames,
            (frame) =>
              `${frame.pixels.width}x${frame.pixels.height}:${Option.match(
                Option.fromNullishOr(Pixels.pixelAt(frame.pixels, 0, 0)),
                {
                  onNone: () => "none",
                  onSome: (pixel) => rgbaText(pixel),
                },
              )}`,
          ),
          " ",
        )}`,
        `  child: ${Arr.isReadonlyArrayNonEmpty(diagnostics) ? Arr.join(diagnostics, "; ") : "no spawn or exit event"}`,
        `  stderr: ${stderr.trim() === "" ? "(empty)" : stderr.trim()}`,
        `  terminal: ${plainText(output) === "" ? "(nothing painted or printed)" : plainText(output)}`,
      ],
      "\n",
    ),
  });

const capture = (
  selected: ReadonlyArray<TerminalScenarioMeta>,
  artifacts: string,
  startedAt: number,
): Effect.Effect<
  ExitCode,
  TerminalError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const child = yield* Effect.acquireRelease(
        spawnTerminal(path.join(import.meta.dirname, "main.js")),
        (process) => process.stop,
      );

      const first = yield* settle(
        child.output,
        (stream) => Arr.isReadonlyArrayNonEmpty(stream.frames),
        FIRST_FRAME_ATTEMPTS,
      );
      if (Option.isNone(evidenceOf(first.frames))) {
        return yield* Effect.fail(
          noFrame(
            FIRST_FRAME_ATTEMPTS,
            first,
            child.diagnostics(),
            child.output(),
            text(child.errors()),
          ),
        );
      }

      if (Option.isSome(paintedOf(first.frames))) {
        yield* child.write(new TextEncoder().encode(POINTER_CLICK));
        yield* settle(
          child.output,
          (stream) =>
            Option.exists(paintedOf(stream.frames), (painted) =>
              Option.isSome(painted.clicked),
            ),
          KEY_FRAME_ATTEMPTS,
        );
        yield* child.write(new TextEncoder().encode(RESIZE_SEQUENCE));
        yield* settle(
          child.output,
          (stream) =>
            Option.exists(paintedOf(stream.frames), (painted) =>
              Option.isSome(painted.resized),
            ),
          KEY_FRAME_ATTEMPTS,
        );
        yield* child.write(new TextEncoder().encode(KEY_T));
        yield* settle(
          child.output,
          (stream) =>
            Option.exists(paintedOf(stream.frames), (painted) =>
              Option.isSome(painted.pressed),
            ),
          KEY_FRAME_ATTEMPTS,
        );
      }

      yield* child.write(new TextEncoder().encode(CTRL_C));
      yield* child.close;
      const exitOption = yield* child.exitCode.pipe(
        Effect.timeoutOption(EXIT_TIMEOUT),
      );
      const exitCode = yield* Option.match(exitOption, {
        onNone: () => child.stop.pipe(Effect.as(-1)),
        onSome: (code) => Effect.succeed(Number(code)),
      });

      const final = yield* snapshot(child.output).pipe(
        Effect.repeat({
          schedule: Schedule.spaced(Duration.millis(50)),
          times: 20,
          until: (stream) =>
            stream.handshake.alternateScreenLeft &&
            stream.handshake.imageDeletes >= 1,
        }),
      );
      const painted = evidenceOf(final.frames);
      if (Option.isNone(painted)) {
        return yield* Effect.fail(
          noFrame(
            FIRST_FRAME_ATTEMPTS,
            final,
            child.diagnostics(),
            child.output(),
            text(child.errors()),
          ),
        );
      }
      const now = yield* Clock.currentTimeMillis;
      const report = reportOf(
        final,
        exitCode,
        startedAt,
        now,
        painted.value,
        selected,
      );
      const directory = path.join(artifacts, "terminal");
      yield* fileSystem.makeDirectory(directory, { recursive: true });
      const write = (name: string, frame: KittyFrame) =>
        Effect.gen(function* () {
          const png = Pixels.encodePng(frame.pixels, (bytes) =>
            deflateSync(bytes),
          );
          if (png instanceof Pixels.PngEncodeError) {
            return yield* Effect.fail(
              new TerminalError({ stage: "decode", detail: png.message }),
            );
          }
          yield* fileSystem.writeFile(path.join(directory, name), png);
        });
      yield* write("frame.png", painted.value.rest);
      yield* Option.match(painted.value.clicked, {
        onNone: () => Effect.void,
        onSome: (frame) => write("clicked.png", frame),
      });
      yield* Option.match(painted.value.resized, {
        onNone: () => Effect.void,
        onSome: (frame) => write("resized.png", frame),
      });
      yield* Option.match(painted.value.pressed, {
        onNone: () => Effect.void,
        onSome: (frame) => write("pressed.png", frame),
      });
      yield* fileSystem.writeFileString(
        path.join(artifacts, "terminal-report.json"),
        Report.reportJson(report),
      );
      yield* Console.log(Report.formatReport(report));
      return Report.exitCode(report);
    }),
  );

export const main = (
  argv: ReadonlyArray<string>,
): Effect.Effect<ExitCode, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const parsed = parseArgs(argv);
    if (Arr.isReadonlyArrayNonEmpty(parsed.unknown)) {
      yield* Console.error(Arr.join(Arr.append(parsed.unknown, usage), "\n"));
      return EXIT.unverified;
    }
    const known = Arr.map(terminalRegistry, (scenario) => scenario.id);
    if (parsed.flags.list) {
      yield* Console.log(Arr.join(known, "\n"));
      return EXIT.passed;
    }
    const unknownIds = Arr.filter(
      parsed.flags.only,
      (id) => !Arr.contains(known, id),
    );
    if (Arr.isReadonlyArrayNonEmpty(unknownIds)) {
      yield* Console.error(
        Arr.join(
          Arr.map(unknownIds, (id) =>
            formatMissing(id, known, "terminal probe"),
          ),
          "\n",
        ),
      );
      return EXIT.unverified;
    }
    if (process.platform !== "darwin") {
      yield* Console.error(
        Arr.join(
          [
            `terminal probe: the pty harness is macOS-only (this host is ${process.platform})`,
            "  the runtime's terminal platform also targets Linux; this runner does not wrap it",
            "exit 2: the terminal probe produced no evidence",
          ],
          "\n",
        ),
      );
      return EXIT.unverified;
    }
    const startedAt = yield* Clock.currentTimeMillis;
    return yield* capture(
      selectScenarios(parsed.flags.only),
      parsed.flags.artifacts,
      startedAt,
    ).pipe(
      Effect.catchTag("TerminalError", (error) =>
        Console.error(
          Arr.join(
            [
              `terminal probe: no evidence (${error.stage})`,
              `  ${error.detail}`,
              "exit 2: the terminal probe produced no evidence",
            ],
            "\n",
          ),
        ).pipe(Effect.as(EXIT.unverified)),
      ),
      Effect.catch((error: PlatformError.PlatformError) =>
        Console.error(error.message).pipe(Effect.as(EXIT.failed)),
      ),
    );
  });

const entry = process.argv[1];
if (entry !== undefined && import.meta.filename === entry) {
  const code = await Effect.runPromise(
    main(process.argv.slice(2)).pipe(Effect.provide(NodeServices.layer)),
  );
  process.exit(code);
}
