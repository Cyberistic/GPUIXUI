import { Console, Duration, Effect } from "effect";
import * as Arr from "effect/Array";
import * as Data from "effect/Data";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { execFile, spawn } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { firstContentFrame, summarize, type ContentFrame } from "./frames.js";

class LaunchBenchError extends Data.TaggedError("LaunchBenchError")<{
  readonly message: string;
}> {}

interface Variant {
  readonly name: string;
  readonly command: ReadonlyArray<string>;
  readonly seedsCompileCache?: boolean;
}

const SAMPLE_TIMEOUT = Duration.seconds(15);
const COMPILE_CACHE_SEED = Duration.millis(1500);
const app = resolve(import.meta.dirname, "../..");
const probe = join(tmpdir(), "gpuixui-launch-probe.dylib");

const runnerFreeEnvironment = R.filter(
  process.env,
  (_, key) => !/^(NODE_|__NUB_)/.test(key),
);

const option = (name: string): Option.Option<string> =>
  Option.flatMap(
    Arr.findFirstIndex(process.argv, (argument) => argument === `--${name}`),
    (index) => Arr.get(process.argv, index + 1),
  );

const compileProbe = Effect.callback<void, LaunchBenchError>((resume) => {
  execFile(
    "clang",
    [
      "-dynamiclib",
      "-fblocks",
      "-O2",
      "-lobjc",
      "-o",
      probe,
      join(app, "scripts/launch-probe.c"),
    ],
    (error, _stdout, stderr) =>
      resume(
        error
          ? Effect.fail(
              new LaunchBenchError({ message: `clang failed: ${stderr}` }),
            )
          : Effect.void,
      ),
  );
});

const sample = (variant: Variant, settle: Duration.Duration) =>
  Effect.callback<ContentFrame, LaunchBenchError>((resume) => {
    const [command = "", ...args] = variant.command;
    const spawnedAtUs = Date.now() * 1000;
    const child = spawn(command, args, {
      cwd: app,
      env: {
        ...runnerFreeEnvironment,
        DYLD_INSERT_LIBRARIES: probe,
        ...Option.match(option("addon"), {
          onNone: () => ({}),
          onSome: (addon) => ({ NAPI_RS_NATIVE_LIBRARY_PATH: addon }),
        }),
      },
      stdio: ["ignore", "ignore", "ignore", "pipe"],
    });
    let output = "";
    let found = false;
    const finish = (frame: ContentFrame) =>
      setTimeout(() => {
        child.kill("SIGKILL");
        resume(Effect.succeed(frame));
      }, Duration.toMillis(settle));
    child.stdio[3]?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const frame = firstContentFrame(Str.split(output, "\n"), spawnedAtUs);
      if (found || Option.isNone(frame)) return;
      found = true;
      finish(frame.value);
    });
    child.on("error", (error) =>
      resume(
        Effect.fail(
          new LaunchBenchError({
            message: `${variant.name}: ${error.message}`,
          }),
        ),
      ),
    );
    return Effect.sync(() => child.kill("SIGKILL"));
  }).pipe(
    Effect.timeoutOrElse({
      duration: SAMPLE_TIMEOUT,
      orElse: () =>
        Effect.fail(
          new LaunchBenchError({
            message: `${variant.name}: no content frame`,
          }),
        ),
    }),
  );

const allVariants: ReadonlyArray<Variant> = [
  ...Option.match(option("baseline"), {
    onNone: () => [],
    onSome: (binary) => [{ name: "baseline", command: [binary] }],
  }),
  { name: "hello", command: [process.execPath, "dist/launch/hello.js"] },
  {
    name: "hello, bundled",
    command: [process.execPath, "dist/bundle/launch/hello.mjs"],
  },
  {
    name: "playground, nub",
    command: [join(homedir(), ".nub/bin/nub"), "dist/main.js"],
  },
  {
    name: "playground, bundled",
    command: [process.execPath, "dist/bundle/main.mjs"],
  },
  {
    name: "playground, bundled, compile cache",
    command: [process.execPath, "dist/bundle/start.mjs"],
    seedsCompileCache: true,
  },
];

const variants = Option.match(option("only"), {
  onNone: () => allVariants,
  onSome: (only) =>
    Arr.filter(allVariants, (variant) => Str.includes(only)(variant.name)),
});

const program = Effect.gen(function* () {
  const runs = Option.getOrElse(Option.map(option("runs"), Number), () => 15);
  yield* compileProbe;
  yield* Effect.forEach(
    Arr.filter(variants, (variant) => variant.seedsCompileCache === true),
    (variant) => sample(variant, COMPILE_CACHE_SEED),
  );
  const rounds = yield* Effect.forEach(Arr.range(1, runs), () =>
    Effect.forEach(variants, (variant) =>
      sample(variant, Duration.millis(100)),
    ),
  );
  yield* Effect.forEach(variants, (variant, index) => {
    const frames = Arr.getSomes(
      Arr.map(rounds, (round) => Arr.get(round, index)),
    );
    const { median, lowerQuartile, upperQuartile } = summarize(
      Arr.map(frames, (frame) => frame.milliseconds),
    );
    const pixels = Option.match(Arr.last(frames), {
      onNone: () => 0,
      onSome: (frame) => frame.pixels,
    });
    return Console.log(
      `${variant.name.padEnd(36)} median ${median.toFixed(1)} ms  quartiles ${lowerQuartile.toFixed(1)}-${upperQuartile.toFixed(1)} ms  content pixels ${pixels}`,
    );
  });
});

process.exitCode = await Effect.runPromise(
  program.pipe(
    Effect.as(0),
    Effect.catchTag("LaunchBenchError", (error) =>
      Console.error(error.message).pipe(Effect.as(1)),
    ),
  ),
);
