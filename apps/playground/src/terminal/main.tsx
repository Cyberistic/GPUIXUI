/**
 * The terminal-mode entrypoint: the playground app rendered with
 * `render(<App />, { terminal: true })` instead of a native window.
 *
 * A terminal run is a different platform behind the same view — the runtime
 * paints a kitty-graphics frame into the terminal it was started from — and no
 * window automation can see it, so the frame on stdout is the evidence. The
 * harness (`run.ts`) starts this file inside a pty, reads the escape stream and
 * decodes the frames.
 *
 * `render()` is called once, at the end: GPUix throws on a second call, and the
 * preflight keeps the native loader out of a host that has none.
 */
import { Console, Effect } from "effect";
import type { EventPayload } from "@gpuix/native";
import { Runtime } from "@gpuixui/testing";
import * as Option from "effect/Option";
import { TerminalApp } from "./app.js";
import {
  withWindowKeyProvider,
  type WindowHandler,
  type WindowHandlerRegister,
} from "../window-handlers.js";

const UNSUPPORTED = 2;

const program = Effect.gen(function* () {
  const runtime = yield* Runtime.detectRuntime({
    platform: process.platform,
    arch: process.arch,
    load: () => import("@gpuix/react/testing"),
  });

  if (Runtime.RuntimeStatus.guards.RuntimeUnsupported(runtime)) {
    yield* Console.error(
      `terminal playground: no GPUix binding on ${runtime.platform}-${runtime.arch}`,
    );
    yield* Console.error(`  loader: ${runtime.reason}`);
    yield* Console.error("exit 2: no terminal frame was produced");
    return UNSUPPORTED;
  }

  const { render } = yield* Effect.tryPromise({
    try: () => import("@gpuix/react"),
    catch: (cause) => cause,
  }).pipe(Effect.orDie);

  /** The app registered through the window key seam while it was mounted. */
  const key: { current: Option.Option<WindowHandler> } = {
    current: Option.none(),
  };
  const register: WindowHandlerRegister = (handler) => {
    key.current = handler;
  };
  const forward = (event: EventPayload): void =>
    Option.match(key.current, {
      onNone: () => {},
      onSome: (handler) => handler(event),
    });

  yield* Effect.sync(() =>
    render(withWindowKeyProvider(register, <TerminalApp />), {
      terminal: true,
      onKeyDown: forward,
    }),
  );
  yield* Console.error("terminal playground: mounted");
  return 0;
});

process.exitCode = await Effect.runPromise(program);
