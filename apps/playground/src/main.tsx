import { Console, Effect } from "effect";
import { Runtime } from "@gpuixui/testing";

const UNSUPPORTED = 2;

const program = Effect.gen(function* () {
  const runtime = yield* Runtime.detectRuntime({
    platform: process.platform,
    arch: process.arch,
    load: () => import("@gpuix/react/testing"),
  });

  if (Runtime.RuntimeStatus.guards.RuntimeUnsupported(runtime)) {
    yield* Console.error(
      `native playground: no GPUix binding on ${runtime.platform}-${runtime.arch}`,
    );
    yield* Console.error(`  loader: ${runtime.reason}`);
    yield* Console.error(`  remedy: ${runtime.hint}`);
    yield* Console.error("exit 2: no native window was opened");
    return UNSUPPORTED;
  }

  const { render } = yield* Effect.tryPromise({
    try: () => import("@gpuix/react"),
    catch: (cause) => cause,
  }).pipe(Effect.orDie);
  const [{ App }, { scenarios }] = yield* Effect.tryPromise({
    try: () =>
      Promise.all([import("./app.js"), import("./scenarios/index.js")]),
    catch: (cause) => cause,
  }).pipe(Effect.orDie);

  render(<App list={scenarios} />, {
    title: "GPUIXUI playground",
    width: 1100,
    height: 720,

    minWidth: 720,
    minHeight: 480,
  });
  return 0;
});

process.exitCode = await Effect.runPromise(program);
