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
import {
  Clock,
  Console,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
} from "effect";
import { ChildProcessSpawner } from "effect/process";
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import type * as PlatformError from "effect/PlatformError";
import {
  NodeChildProcessSpawner,
  NodeFileSystem,
  NodePath,
} from "@effect/platform-node";
import { Report, Smoke } from "@gpuixui/testing";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { EventPayload } from "@gpuix/native";
import { createElement, Fragment } from "react";
import { bindingPin, hostLabel, provenanceIssue } from "../binding.js";
import { palettes } from "../palettes.js";
import { withWindowKeyProvider, type WindowKeyHandler } from "../window-key.js";
import { withSelectionProvider, type SelectionEvent } from "../selection.js";
import {
  captureCommand,
  captureFile,
  captureProvenance,
  clearCapture,
  readCommit,
  writeProvenance,
} from "../smoke/capture.js";
import {
  formatMissing,
  idsOf,
  parseArgs,
  selectLive,
  usage,
  type LiveFlags,
} from "./cli.js";
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

const hostLabelOf = (): string =>
  hostLabel("live window", process.platform, process.arch);

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
 * Opens the window, mounts the real app and runs the selected live scenarios.
 *
 * `Effect.runPromise`/`process.exit` are the entrypoint boundary (EF-21).
 */
export const program = (
  flags: LiveFlags,
  selected: ReadonlyArray<LiveScenario>,
): Effect.Effect<
  ExitCode,
  NoWindowError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const issue = yield* provenanceIssue(process.platform, process.arch);
    if (Option.isSome(issue)) {
      yield* Console.error(issue.value);
      yield* Console.error(
        "the suite reports verified 0.10.0 only on the pinned release build — restore it with nub run --filter playground build (plans 529 §3, 811)",
      );
      return EXIT.failed;
    }
    // A caption may only name a commit the run actually had. Read it before the
    // window opens, so an unrecordable run costs no window (plan 564's rule).
    const commit = Option.isSome(flags.capture)
      ? yield* Option.match(flags.commit, {
          onSome: (sha) => Effect.succeed(Option.some(sha)),
          onNone: () =>
            Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, readCommit),
        })
      : Option.none<string>();
    if (Option.isSome(flags.capture) && Option.isNone(commit)) {
      yield* Console.error(
        "capture: cannot read the git commit; pass --commit <sha> (no image is publishable without it)",
      );
      return EXIT.unverified;
    }
    if (Option.isSome(flags.capture)) {
      yield* fileSystem.makeDirectory(flags.capture.value, { recursive: true });
      yield* clearCapture(flags.capture.value);
    }
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

    // The window selection handler, forwarded exactly as the headless runner
    // forwards it: the app owns the root option, the mounted view registers.
    const selection: { current: Option.Option<SelectionEvent> } = {
      current: Option.none(),
    };
    const registerSelection = (
      handler: Option.Option<SelectionEvent>,
    ): void => {
      selection.current = handler;
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
        onSelectionChange: (event: EventPayload) =>
          Option.match(selection.current, {
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
                    withSelectionProvider(
                      registerSelection,
                      withWindowKeyProvider(registerWindowKey, live.view()),
                    ),
                  ),
                ),
              ),
            );
            yield* settle;
            yield* Option.match(Option.fromNullishOr(live.ready), {
              onNone: () => Effect.void,
              onSome: (ready) => host.waitFor(ready),
            });
            // The frame belongs to the mounted view's opening state, the same
            // moment the headless capture takes (plan 564): before the steps.
            yield* Option.match(flags.capture, {
              onNone: () => Effect.void,
              onSome: (directory) =>
                host.screenshot(captureFile(path, directory, live.id)),
            });
          }),
      });

    const report = yield* Smoke.runAsyncScenarios(
      host,
      selected,
      { host: hostLabelOf(), startedAt },
      mount,
    );

    yield* fileSystem.writeFileString(REPORT_PATH, Report.reportJson(report));
    yield* Console.log(Report.formatReport(report));
    if (flags.json) yield* Console.log(Report.reportJson(report));
    if (Option.isSome(flags.capture) && Option.isSome(commit)) {
      const directory = flags.capture.value;
      const provenance = captureProvenance(report, {
        platform: `${process.platform}-${process.arch}`,
        gpuixVersion: bindingPin.version,
        commit: commit.value,
        command: captureCommand(
          directory,
          Arr.map(selected, (scenario) => scenario.id),
          "live",
        ),
      });
      yield* Option.match(provenance, {
        onNone: () =>
          Console.error(
            "capture: no provenance written (the run did not pass)",
          ),
        onSome: (present) => writeProvenance(directory, present),
      });
    }
    loop.stop();
    return Report.exitCode(report);
  });

/** Exits, so the native window cannot keep the process alive after the run. */
const exit = (code: ExitCode): void => process.exit(code);

/**
 * Runs the CLI. A host that cannot open a window exits `2`; any other setup
 * failure is also `2`, because neither produced evidence.
 *
 * Scenario choice is validated **before** the native import and renderer, so
 * `--list`, a typo and a bare command cost no window.
 */
const main = (): Effect.Effect<void> =>
  Effect.gen(function* () {
    const parsed = parseArgs(process.argv.slice(2));

    if (parsed.flags.list) {
      yield* Console.log(Arr.join(idsOf(liveScenarios), "\n"));
      exit(EXIT.passed);
      return;
    }

    if (parsed.unknown.length > 0) {
      yield* Console.error(
        Arr.join(
          [
            ...Arr.map(
              parsed.unknown,
              (token) => `live smoke: unknown argument: ${token}`,
            ),
            usage,
          ],
          "\n",
        ),
      );
      exit(EXIT.unverified);
      return;
    }

    if (parsed.flags.all && Arr.length(parsed.flags.only) > 0) {
      yield* Console.error(
        Arr.join(["live smoke: choose --all or --only, not both", usage], "\n"),
      );
      exit(EXIT.unverified);
      return;
    }

    if (!parsed.flags.all && Arr.length(parsed.flags.only) === 0) {
      yield* Console.error(
        Arr.join(["live smoke: no scenario selected", usage], "\n"),
      );
      exit(EXIT.unverified);
      return;
    }

    const selection = selectLive(liveScenarios, parsed.flags.only);
    if (selection.missing.length > 0) {
      yield* Console.error(
        formatMissing(selection.missing, idsOf(liveScenarios)),
      );
      exit(EXIT.unverified);
      return;
    }

    yield* Console.error(
      parsed.flags.all
        ? `live smoke: running all ${Arr.length(liveScenarios)} scenarios (--all)`
        : `live smoke: running ${Arr.length(selection.selected)} scenario(s): ${Arr.join(
            idsOf(selection.selected),
            ", ",
          )}`,
    );

    const code = yield* program(parsed.flags, selection.selected).pipe(
      Effect.provide(NodeChildProcessSpawner.layer),
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
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
