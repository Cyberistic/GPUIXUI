/**
 * The live-window CLI: the playground scenarios a **real** GPUix window can
 * prove, driven through `@gpuix/native/automation`.
 *
 * The headless suite runs on the offscreen `TestRenderer`; a live run is the
 * confirmation that focus routing, keyboard input and paint survive a window.
 * It reports through the same `Smoke` model and exit codes, so a live pass is
 * citable evidence rather than a second log format.
 *
 * It exits `2` — never `1` — when the host cannot open a window (no desktop
 * session, a missing binding): no window means no evidence. `--list` and an
 * argument error are answered before the native modules load.
 */
import {
  Clock,
  Console,
  Duration,
  Effect,
  FileSystem,
  Match,
  Path,
} from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type * as PlatformError from "effect/PlatformError";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Report, Runtime, Smoke } from "@gpuixui/testing";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { Root } from "@gpuix/react";
import { createElement, Fragment } from "react";
import { palettes } from "../palettes.js";
import {
  EXIT,
  formatMissing,
  formatUnsupported,
  parseArgs,
  usage,
  type CliFlags,
  type ExitCode,
} from "../smoke/run.js";
export { EXIT };
import { createLiveHost } from "./host.js";
import { liveRegistry, type LiveProbeMeta } from "./registry.js";
import { liveProbeBodies, type LiveProbeBody } from "./scenarios.js";

/** One live probe: its metadata, its body and the view the window mounts. */
export type LiveProbe = LiveProbeMeta & LiveProbeBody;

const TITLE = "GPUIXUI live smoke";
const WINDOW = { width: 900, height: 520 } as const;
/** Two frames plus the protocol round-trip, so a keyed view switch has painted. */
const SETTLE = Duration.millis(60);

/** A window that could not be opened or driven: this run has no evidence. */
class NoWindowError extends Schema.TaggedError<NoWindowError>()(
  "NoWindowError",
  {
    stage: Schema.Literals(["load", "open"]),
    cause: Schema.Unknown,
  },
) {}

const hostLabel = (): string =>
  `gpuix live window ${process.platform}-${process.arch} @gpuix/native 0.11.0`;

export { liveRegistry };

/** Every registry id joined with its body, in registry order. */
export const liveProbes = (): ReadonlyArray<LiveProbe> =>
  Arr.map(liveRegistry, (meta) => ({
    ...meta,
    ...liveProbeBodies[meta.id],
  }));

/** The probes `--only` selected, in registry order; every probe when none. */
export const selectProbes = (
  only: ReadonlyArray<string>,
): ReadonlyArray<LiveProbe> =>
  Arr.match(only, {
    onEmpty: liveProbes,
    onNonEmpty: (ids) =>
      Arr.filter(liveProbes(), (probe) => Arr.contains(ids, probe.id)),
  });

const causeText = (cause: unknown): string =>
  Match.value(cause).pipe(
    Match.when(Schema.is(Schema.String), (text) => text),
    Match.when(
      Schema.is(Schema.Struct({ message: Schema.String })),
      (error) => error.message,
    ),
    Match.orElse(() => "unknown error"),
  );

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

/** Mounts one probe's view in the window, keyed so no tree reconciles onto the last. */
const mount =
  (
    root: Pick<Root, "render">,
    selected: ReadonlyArray<LiveProbe>,
  ): ((scenario: { readonly id: string }) => Effect.Effect<void>) =>
  (scenario) =>
    Effect.gen(function* () {
      const view = Option.flatMap(
        Arr.findFirst(selected, (probe) => probe.id === scenario.id),
        (probe) => Option.some(probe.view),
      );
      yield* Effect.sync(() =>
        root.render(
          createElement(
            Fragment,
            { key: scenario.id },
            createElement(
              ThemeProvider,
              { theme: palettes.dark },
              Option.match(view, {
                onNone: () => null,
                onSome: (render) => render(),
              }),
            ),
          ),
        ),
      );
      yield* Effect.sleep(SETTLE);
    });

/**
 * Opens the window, mounts each selected probe and writes the report.
 *
 * `Effect.runPromise`/`process.exit` stay at the entrypoint (EF-21).
 */
export const program = (
  flags: CliFlags,
  selected: ReadonlyArray<LiveProbe>,
): Effect.Effect<
  ExitCode,
  NoWindowError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const captures = path.join(flags.artifacts, "live");
    yield* fileSystem.makeDirectory(captures, { recursive: true });

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
      }),
    );
    const app = yield* Effect.tryPromise({
      try: () =>
        modules.automation.connectTest(
          modules.automation.liveRendererAsTest(renderer),
        ),
      catch: (cause) => new NoWindowError({ stage: "open", cause }),
    });

    const host = createLiveHost({
      app,
      renderer,
      capturePath: (name) => path.join(captures, `${name}.png`),
    });
    const startedAt = yield* Clock.currentTimeMillis;
    const report = yield* Smoke.runAsyncScenarios(
      host,
      selected,
      { host: hostLabel(), startedAt },
      mount(root, selected),
    );

    yield* fileSystem.writeFileString(
      path.join(flags.artifacts, "live-report.json"),
      Report.reportJson(report),
    );
    yield* Console.log(Report.formatReport(report));
    if (flags.json) yield* Console.log(Report.reportJson(report));
    // Release the window before the effect completes: the frame loop and the
    // window keep Node's event loop alive.
    yield* Effect.sync(() => root.unmount());
    // The report is already written: a close failure cannot change the verdict.
    yield* Effect.tryPromise({
      try: () => app.close(),
      catch: (cause) => cause,
    }).pipe(Effect.ignore);
    loop.stop();
    return Report.exitCode(report);
  });

/** The process inputs the CLI needs, injected so the argument guard is testable. */
export interface MainDeps {
  readonly argv: ReadonlyArray<string>;
  /** Loads the native binding; the argument guard must run first. */
  readonly load: () => Promise<unknown>;
}

/** Validates the arguments, then wires the preflight and the window. */
export const main = (deps: MainDeps): Effect.Effect<ExitCode> =>
  Effect.gen(function* () {
    const parsed = parseArgs(deps.argv);

    if (parsed.flags.list) {
      yield* Console.log(
        Arr.join(
          Arr.map(liveRegistry, (probe) => probe.id),
          "\n",
        ),
      );
      return EXIT.passed;
    }

    if (Arr.isReadonlyArrayNonEmpty(parsed.unknown)) {
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
      return EXIT.unverified;
    }

    const known = liveProbes();
    const unknownIds = Arr.filter(
      parsed.flags.only,
      (id) => !Arr.some(known, (probe) => probe.id === id),
    );
    if (Arr.isReadonlyArrayNonEmpty(unknownIds)) {
      yield* Console.error(
        Arr.join(
          Arr.map(unknownIds, (id) =>
            formatMissing(
              id,
              Arr.map(known, (probe) => probe.id),
              "live smoke",
            ),
          ),
          "\n",
        ),
      );
      return EXIT.unverified;
    }

    const selected = selectProbes(parsed.flags.only);

    const runtime = yield* Runtime.detectRuntime({
      platform: process.platform,
      arch: process.arch,
      load: deps.load,
    });
    if (Runtime.RuntimeStatus.guards.RuntimeUnsupported(runtime)) {
      yield* Console.error(formatUnsupported(runtime, "live smoke"));
      yield* Console.error("exit 2: the live suite produced no evidence");
      return EXIT.unverified;
    }

    return yield* program(parsed.flags, selected).pipe(
      Effect.catchTag("NoWindowError", (error) =>
        Console.error(unavailable(error)).pipe(Effect.as(EXIT.unverified)),
      ),
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
      Effect.catch((error: PlatformError.PlatformError) =>
        Console.error(error.message).pipe(Effect.as(EXIT.failed)),
      ),
    );
  });

// Run only when executed directly, never on import, so the pure tests can
// import this module without opening a window. `Effect.runPromise` is the
// entrypoint boundary (EF-21).
const entry = process.argv[1];
if (entry !== undefined && import.meta.filename === entry) {
  const code = await Effect.runPromise(
    main({
      argv: process.argv.slice(2),
      load: () => import("@gpuix/native"),
    }),
  );
  // The native frame loop and window keep Node's event loop alive, so the
  // entrypoint exits explicitly once the report is written.
  process.exit(code);
}
