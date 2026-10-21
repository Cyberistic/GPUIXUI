/**
 * The dev entrypoint: `nub run --filter playground dev`.
 *
 * It preflights **before** loading the app and the scenarios, so a host with no
 * GPUix binding gets the actionable remedy and exit `2`, not a stack trace from
 * deep inside the native loader. `@gpuix/react` (and therefore
 * `@gpuix/native`) must not be in this module's static import graph: `App` and
 * the scenario registry are imported only after the preflight. `render()` is
 * called exactly once, at the end (GPUix throws on a second call).
 *
 * `Effect.runPromise` here is the process entrypoint boundary (EF-21).
 */
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
  });
  return 0;
});

process.exitCode = await Effect.runPromise(program);
