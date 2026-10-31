/**
 * Measure the pipeline block on this machine and write the landing's numbers
 * (plan 730).
 *
 *   nub run --filter @gpuixui/blocks bench
 *
 * Cold start is spawn → the runtime's own "mount complete" line, the median of
 * ten runs after one warm-up (the OS file cache is not dropped). Idle memory is
 * the window process's resident set five seconds after mount (`main.tsx
 * --bench`). Install size is the native binding a consumer ships. Frame time is
 * not measured: the debug-frame statistics are read in-process, and an
 * estimate is not a measurement. Spawning is the platform's own: this is the
 * one boundary that times a child from outside it.
 */
import { spawn, spawnSync } from "node:child_process";
import { realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Schema } from "effect";
import * as Arr from "effect/Array";
import * as Clock from "effect/Clock";
import * as Option from "effect/Option";
import { MOUNTED, median, parseDu, parseRss } from "./parse.js";

class BenchError extends Schema.TaggedError<BenchError>()("BenchError", {
  stage: Schema.String,
  detail: Schema.String,
}) {}

const here = dirname(fileURLToPath(import.meta.url));
const blockRoot = resolve(here, "../..");
const proofFile = resolve(here, "../../../../apps/docs/src/lib/proof.json");
const RUNS = 10;

/** Spawn the block; answer the ms to mount and everything it printed. */
const launch = (bench: boolean) =>
  Effect.gen(function* () {
    const start = yield* Clock.currentTimeMillis;
    const outcome = yield* Effect.callback<
      { readonly mountedAt: number; readonly output: string },
      BenchError
    >((resume) => {
      const child = spawn(
        "nub",
        ["src/main.tsx", "pipeline", ...(bench ? ["--bench"] : [])],
        { cwd: blockRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "";
      let mountedAt = 0;
      const read = (chunk: Buffer) => {
        output += chunk.toString();
        if (mountedAt === 0 && output.includes(MOUNTED)) {
          mountedAt = Date.now();
          if (!bench) child.kill("SIGTERM");
        }
      };
      child.stdout.on("data", read);
      child.stderr.on("data", read);
      child.on("exit", () =>
        resume(
          mountedAt === 0
            ? Effect.fail(
                new BenchError({ stage: "mount", detail: output.slice(-400) }),
              )
            : Effect.succeed({ mountedAt, output }),
        ),
      );
      return Effect.sync(() => {
        child.kill("SIGKILL");
      });
    });
    return { ms: outcome.mountedAt - start, output: outcome.output };
  });

const installMb = Effect.try({
  try: () => {
    // The binding is the renderer's dependency, reached the way the app
    // reaches it: the block → @gpuix/react → @gpuix/native → the platform
    // build, each a sibling in its dependent's store directory.
    const sibling = (dir: string, name: string) =>
      realpathSync(join(dir, "..", name));
    const react = realpathSync(join(blockRoot, "node_modules/@gpuix/react"));
    const binding = sibling(sibling(react, "native"), "native-darwin-arm64");
    return spawnSync("du", ["-sk", "-L", binding], { encoding: "utf8" }).stdout;
  },
  catch: (cause) => new BenchError({ stage: "install", detail: String(cause) }),
}).pipe(Effect.map(parseDu));

const program = Effect.gen(function* () {
  yield* launch(false);
  const starts = yield* Effect.forEach(Arr.range(1, RUNS), () =>
    Effect.map(launch(false), (run) => run.ms),
  );
  const memory = yield* launch(true);
  const result = {
    measuredAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
    machine: spawnSync("sysctl", ["-n", "hw.model"], {
      encoding: "utf8",
    }).stdout.trim(),
    os: `macOS ${spawnSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).stdout.trim()}`,
    runtime: "@gpuix/native 0.11.0",
    runs: RUNS,
    coldStartMs: Math.round(Option.getOrElse(median(starts), () => 0)),
    idleRssMb: Math.round(Option.getOrElse(parseRss(memory.output), () => 0)),
    installMb: Math.round(Option.getOrElse(yield* installMb, () => 0)),
  };
  if (
    result.coldStartMs === 0 ||
    result.idleRssMb === 0 ||
    result.installMb === 0
  ) {
    return yield* new BenchError({
      stage: "result",
      detail: JSON.stringify(result),
    });
  }
  writeFileSync(proofFile, `${JSON.stringify(result, null, 2)}\n`);
  yield* Effect.log(`wrote ${proofFile}`, result);
});

await Effect.runPromise(program);
