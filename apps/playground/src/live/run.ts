/**
 * The live smoke CLI: the shipped playground in a **real** GPUix window.
 *
 * The headless suite runs on the offscreen `TestRenderer`; this runner is the
 * gold-standard confirmation that the core mechanisms survive a window, driven
 * through `@gpuix/native/automation` (`getByTestId`, `click`, keys, wheel,
 * screenshot). It reports through the same `Smoke` model and exit codes, so a
 * live pass is citable evidence, not a second log format.
 *
 * It exits `2` — never `1` — when the host cannot open a window (CI, a locked
 * session, a missing binding): no window means no evidence.
 */
import { Clock, Console, Effect, FileSystem, Match, Option } from "effect";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import type * as PlatformError from "effect/PlatformError";
import { NodeFileSystem } from "@effect/platform-node";
import { Report, Smoke } from "@gpuixui/testing";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { EventPayload } from "@gpuix/native";
import { createElement, Fragment } from "react";
import { palettes } from "../palettes.js";
import { withWindowKeyProvider, type WindowKeyHandler } from "../window-key.js";
import { createHost } from "./host.js";
import {
  LIVE_ARTIFACTS,
  liveScenarios,
  settle,
  WINDOW,
  type LiveScenario,
} from "./scenarios.js";

/** The process exit code: 0 passed, 1 failed, 2 no evidence. */
export const EXIT = { passed: 0, failed: 1, unverified: 2 } as const;
/** The process exit code: 0 passed, 1 failed, 2 no evidence. */
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

const TITLE = "GPUIXUI live smoke";
const REPORT_PATH = "apps/playground/.artifacts/live-report.json";

/** No window: the live runner has nothing to report. */
class NoWindowError extends Schema.TaggedError<NoWindowError>()(
  "NoWindowError",
  {
    stage: Schema.Literals(["load", "open"]),
    cause: Schema.Unknown,
  },
) {}

const hostLabel = (): string =>
  `gpuix live window ${process.platform}-${process.arch} @gpuix/native 0.10.0`;

const unavailable = (error: NoWindowError): string =>
  Arr.join(
    [
      `live smoke: no real window (${error.stage})`,
      `  cause: ${causeText(error.cause)}`,
      "  the window needs a desktop session and a loaded GPUix binding",
      "exit 2: the live suite produced no evidence",
    ],
    "\n",
  );

/** Keeps an unknown cause readable without trusting `String(error)`. */
const causeText = (cause: unknown): string =>
  Match.value(cause).pipe(
    Match.when(Schema.is(Schema.String), (text) => text),
    Match.when(
      Schema.is(Schema.Struct({ message: Schema.String })),
      (error) => error.message,
    ),
    Match.orElse(() => "unknown error"),
  );

/** The live entry for `scenario`, which owns the view to mount. */
const liveOf = (scenario: {
  readonly id: string;
}): Option.Option<LiveScenario> =>
  Arr.findFirst(liveScenarios, (live) => live.id === scenario.id);

/**
 * Opens the window, mounts the real app and runs the live suite.
 *
 * `Effect.runPromise`/`process.exit` are the entrypoint boundary (EF-21).
 */
export const program: Effect.Effect<
  ExitCode,
  NoWindowError | PlatformError.PlatformError,
  FileSystem.FileSystem
> = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  // The app-level window key handler, exactly as `src/smoke/run.ts` wires it:
  // GPUix delivers window keys only through `render({ onKeyDown })`, so the
  // runner is the "app" that forwards to whatever the mounted view registered
  // through `useWindowKey` (plan `345`).
  const windowKey: { current: Option.Option<WindowKeyHandler> } = {
    current: Option.none(),
  };
  const registerWindowKey = (
    handler: Option.Option<WindowKeyHandler>,
  ): void => {
    windowKey.current = handler;
  };

  const modules = yield* Effect.tryPromise({
    try: async () => {
      const [gpuix, automation] = await Promise.all([
        import("@gpuix/react"),
        import("@gpuix/native/automation"),
      ]);
      return { gpuix, automation };
    },
    catch: (cause) => new NoWindowError({ stage: "load", cause }),
  });

  const renderer = yield* Effect.try({
    try: () => {
      // `createRenderer` wires the native event callback into React. A bare
      // `new GpuixRenderer()` paints but receives no input (plan 189 §3.3).
      const live = modules.gpuix.createRenderer();
      live.init({ title: TITLE, ...WINDOW });
      return live;
    },
    catch: (cause) => new NoWindowError({ stage: "open", cause }),
  });

  const loop = modules.gpuix.startFrameLoop(renderer, {
    onTerminated: () => {},
  });
  const root = yield* Effect.sync(() =>
    modules.gpuix.render(createElement(Fragment), {
      renderer,
      title: TITLE,
      ...WINDOW,
      onKeyDown: (event: EventPayload) =>
        Option.match(windowKey.current, {
          onNone: () => {},
          onSome: (handler) => handler(event),
        }),
    }),
  );

  const app = yield* Effect.tryPromise({
    try: () =>
      modules.automation.connectTest(
        modules.automation.liveRendererAsTest(renderer),
      ),
    catch: (cause) => new NoWindowError({ stage: "open", cause }),
  });
  const host = createHost(app, renderer);

  yield* fileSystem.makeDirectory(LIVE_ARTIFACTS, { recursive: true });
  const startedAt = yield* Clock.currentTimeMillis;
  const mount = (scenario: {
    readonly id: string;
  }): Effect.Effect<void, Smoke.SmokeHostError> =>
    Option.match(liveOf(scenario), {
      onNone: () => Effect.void,
      onSome: (live) =>
        Effect.gen(function* () {
          // A keyed `Fragment` per scenario is the live twin of plan `182`: a
          // fresh tree, never React reconciling this view onto the last one.
          yield* Effect.sync(() =>
            root.render(
              createElement(
                Fragment,
                { key: live.id },
                createElement(
                  ThemeProvider,
                  { theme: palettes.dark },
                  withWindowKeyProvider(registerWindowKey, live.view()),
                ),
              ),
            ),
          );
          yield* settle;
          yield* Option.match(Option.fromNullishOr(live.ready), {
            onNone: () => Effect.void,
            onSome: (ready) => host.waitFor(ready),
          });
        }),
    });

  const report = yield* Smoke.runAsyncScenarios(
    host,
    liveScenarios,
    { host: hostLabel(), startedAt },
    mount,
  );

  yield* fileSystem.writeFileString(REPORT_PATH, Report.reportJson(report));
  yield* Console.log(Report.formatReport(report));
  loop.stop();
  return Report.exitCode(report);
});

/** Exits, so the native window cannot keep the process alive after the run. */
const exit = (code: ExitCode): void => process.exit(code);

/**
 * Runs the CLI. A host that cannot open a window exits `2`; any other setup
 * failure is also `2`, because neither produced evidence.
 */
const main = (): Effect.Effect<void> =>
  Effect.gen(function* () {
    const code = yield* program.pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.matchEffect({
        onFailure: (error) =>
          Effect.as(
            Console.error(
              Schema.is(NoWindowError)(error)
                ? unavailable(error)
                : `live smoke: setup failed\n  cause: ${causeText(error)}\nexit 2: the live suite produced no evidence`,
            ),
            EXIT.unverified,
          ),
        onSuccess: (passed) => Effect.succeed(passed),
      }),
    );
    exit(code);
  });

const entry = process.argv[1];
if (entry !== undefined && import.meta.filename === entry) {
  await Effect.runPromise(main());
}
