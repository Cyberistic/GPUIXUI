/**
 * The native smoke CLI.
 *
 * Shape: preflight → mount each scenario → run its steps → report.
 *
 * The preflight is why `@gpuix/react/testing` is imported **dynamically**: a
 * static import anywhere in this module graph would load the binding (and
 * crash) before the CLI could explain that the host is unsupported. See plan
 * 120 §2 and ADR 0001.
 *
 * `nub run --filter playground smoke` is the entrypoint. The exit code is the
 * contract: `0` passed, `1` a real failure, `2` no evidence (unsupported host,
 * or an argument this CLI does not understand). Arguments are validated before
 * the preflight, so `--list` and a typo cost no binding load.
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
import * as Arr from "effect/Array";
import * as Schema from "effect/Schema";
import type * as PlatformError from "effect/PlatformError";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Native, Report, Runtime, Smoke } from "@gpuixui/testing";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { EventPayload } from "@gpuix/native";
import { createElement, type ReactNode } from "react";
import type { PlaygroundScenario } from "../types.js";
import { withWindowKeyProvider } from "../window-handlers.js";
import type { WindowKeyHandler } from "../window-handlers.js";
import { palettes } from "../palettes.js";
import { registry, selectScenarios } from "../scenarios/registry.js";

/** The process exit code: 0 passed, 1 failed, 2 unverified. */
export const EXIT = { passed: 0, failed: 1, unverified: 2 } as const;
/** The process exit code: 0 passed, 1 failed, 2 unverified. */
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

const DEFAULT_ARTIFACTS = "apps/playground/.artifacts";

/** Parsed command line. */
export interface CliFlags {
  readonly json: boolean;
  readonly screenshots: boolean;
  /** Print the scenario ids and exit without loading the binding. */
  readonly list: boolean;
  /** The scenarios to run; empty means all of them. */
  readonly only: ReadonlyArray<string>;
  readonly artifacts: string;
}

/** The flags plus any token the parser did not recognise. */
export interface ParsedArgs {
  readonly flags: CliFlags;
  readonly unknown: ReadonlyArray<string>;
}

/**
 * Parses the CLI's argv (without `node` and the script path).
 *
 * Unknown flags are collected, never silently ignored: the CLI prints them so a
 * typo like `--onlyy` cannot quietly run everything (or nothing).
 */
export const parseArgs = (argv: ReadonlyArray<string>): ParsedArgs => {
  const step = (
    rest: ReadonlyArray<string>,
    flags: CliFlags,
    unknown: ReadonlyArray<string>,
  ): ParsedArgs =>
    Option.match(Arr.head(rest), {
      onNone: () => ({ flags, unknown }),
      onSome: (token) => {
        const tail = Arr.drop(rest, 1);
        return Match.value(token).pipe(
          Match.when("--json", () =>
            step(tail, { ...flags, json: true }, unknown),
          ),
          Match.when("--screenshots", () =>
            step(tail, { ...flags, screenshots: true }, unknown),
          ),
          Match.when("--list", () =>
            step(tail, { ...flags, list: true }, unknown),
          ),
          Match.when("--only", () =>
            Option.match(Arr.head(tail), {
              onNone: () => ({
                flags,
                unknown: Arr.append(unknown, "--only needs a scenario id"),
              }),
              onSome: (id) =>
                step(
                  Arr.drop(tail, 1),
                  { ...flags, only: Arr.append(flags.only, id) },
                  unknown,
                ),
            }),
          ),
          Match.when("--artifacts", () =>
            Option.match(Arr.head(tail), {
              onNone: () => ({
                flags,
                unknown: Arr.append(unknown, "--artifacts needs a directory"),
              }),
              onSome: (dir) =>
                step(Arr.drop(tail, 1), { ...flags, artifacts: dir }, unknown),
            }),
          ),
          Match.orElse((flag) => step(tail, flags, Arr.append(unknown, flag))),
        );
      },
    });

  return step(
    argv,
    {
      json: false,
      screenshots: false,
      list: false,
      only: [],
      artifacts: DEFAULT_ARTIFACTS,
    },
    [],
  );
};

/** The scenario ids, in run order. */
export const idsOf = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
): ReadonlyArray<string> => Arr.map(list, (scenario) => scenario.id);

/** The usage text, printed with every argument error. */
export const usage: string = Arr.join(
  [
    "usage:",
    "  --only <scenario-id>  run only these scenarios (repeatable)",
    "  --list                print the scenario ids and exit",
    "  --json                print the JSON report after the run",
    "  --screenshots         capture a screenshot per scenario",
    "  --artifacts <dir>     report and screenshot directory",
    "exit 2: the smoke suite produced no evidence",
  ],
  "\n",
);

/** A bad id names the id and every valid one, so a typo is self-correcting. */
export const formatMissing = (
  id: string,
  known: ReadonlyArray<string>,
  suite = "native smoke",
): string =>
  Arr.join(
    [
      `${suite}: unknown scenario id: ${id}`,
      `  known ids: ${Arr.join(known, ", ")}`,
      `exit 2: the ${suite} suite produced no evidence`,
    ],
    "\n",
  );

/** The preflight message for a host with no GPUix binding. Actionable, not a stack trace. */
export const formatUnsupported = (
  runtime: Runtime.RuntimeUnsupported,
  suite = "native smoke",
): string =>
  Arr.join(
    [
      `${suite} suite: no GPUix binding on ${runtime.platform}-${runtime.arch}`,
      `  loader: ${runtime.reason}`,
      `  remedy: ${runtime.hint}`,
    ],
    "\n",
  );

/** The two effects the CLI needs, injected so the unsupported path is testable. */
export interface RunDeps {
  readonly detect: Effect.Effect<Runtime.RuntimeStatus>;
  /** Only evaluated when the host is supported, so the binding never loads here. */
  readonly runSuite: Effect.Effect<ExitCode>;
}

/**
 * Preflight, then run the suite only if a binding loaded.
 *
 * Returns exit `2` and evaluates nothing else on an unsupported host — the
 * whole point of the split is that a missing binding produces a report we can
 * trust, not a crash.
 */
export const runScenarioCli = (deps: RunDeps): Effect.Effect<ExitCode> =>
  Effect.gen(function* () {
    const runtime = yield* deps.detect;
    if (Runtime.RuntimeStatus.guards.RuntimeUnsupported(runtime)) {
      yield* Console.error(formatUnsupported(runtime));
      yield* Console.error(
        "exit 2: the smoke suite produced no native evidence (ADR 0001/0002)",
      );
      return EXIT.unverified;
    }
    return yield* deps.runSuite;
  });

/** A failure to load the native testing module after a green preflight. */
class NativeLoadError extends Schema.TaggedError<NativeLoadError>()(
  "NativeLoadError",
  {
    operation: Schema.String,
    cause: Schema.Unknown,
  },
) {}

const hostLabel = (): string =>
  `gpuix TestRenderer ${process.platform}-${process.arch} @gpuix/native 0.11.0`;

const viewOf = (
  views: ReadonlyArray<PlaygroundScenario>,
  scenario: Smoke.SmokeScenario,
): Option.Option<() => ReactNode> =>
  Option.map(
    Arr.findFirst(views, (candidate) => candidate.id === scenario.id),
    (candidate) => candidate.view,
  );

/** Mounts each scenario's own view in the test root before its steps run. */
const mount =
  (
    flags: CliFlags,
    views: ReadonlyArray<PlaygroundScenario>,
    root: {
      readonly render: (node: ReactNode) => void;
      readonly renderer: { captureScreenshot: (path: string) => void };
    },
    path: Path.Path,
    registerWindowKey: (handler: Option.Option<WindowKeyHandler>) => void,
  ) =>
  (scenario: Smoke.SmokeScenario): Effect.Effect<void> => {
    const render = Effect.sync(() =>
      Option.match(viewOf(views, scenario), {
        onNone: () => {},
        onSome: (view) =>
          root.render(
            createElement(
              ThemeProvider,
              { theme: palettes.dark },
              withWindowKeyProvider(registerWindowKey, view()),
            ),
          ),
      }),
    );
    return flags.screenshots
      ? Effect.tap(render, () =>
          Effect.sync(() =>
            root.renderer.captureScreenshot(
              path.join(flags.artifacts, "screenshots", `${scenario.id}.png`),
            ),
          ),
        )
      : render;
  };

/** The real suite: load the binding, drive the selected scenarios, write the report. */
export const program = (
  flags: CliFlags,
): Effect.Effect<
  ExitCode,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const testing = yield* Effect.tryPromise({
      try: () => import("@gpuix/react/testing"),
      catch: (cause) =>
        new NativeLoadError({
          operation: "import @gpuix/react/testing",
          cause,
        }),
    }).pipe(Effect.orDie);

    // The views are imported only after the preflight: `@gpuix/react` loads the
    // native binding at import time, and `--list` must cost no binding load.
    const { scenarios } = yield* Effect.tryPromise({
      try: () => import("../scenarios/index.js"),
      catch: (cause) =>
        new NativeLoadError({
          operation: "import the scenario implementations",
          cause,
        }),
    }).pipe(Effect.orDie);
    const selected = selectScenarios(scenarios, flags.only);

    yield* fileSystem.makeDirectory(flags.artifacts, { recursive: true });
    if (flags.screenshots) {
      yield* fileSystem.makeDirectory(
        path.join(flags.artifacts, "screenshots"),
        {
          recursive: true,
        },
      );
    }

    // The app-level window key handler: GPUix delivers window keys only through
    // `render({ onKeyDown })`, so the CLI is the "app" that owns it and forwards
    // to whatever the mounted scenario registered (`useWindowKey`).
    const windowKey: { current: Option.Option<WindowKeyHandler> } = {
      current: Option.none(),
    };
    const registerWindowKey = (
      handler: Option.Option<WindowKeyHandler>,
    ): void => {
      windowKey.current = handler;
    };

    const root = testing.createTestRoot({
      width: 1280,
      height: 800,
      onKeyDown: (event: EventPayload) =>
        Option.match(windowKey.current, {
          onNone: () => {},
          onSome: (handler) => handler(event),
        }),
    });
    const host = Native.createTestHost(root.renderer);
    const startedAt = yield* Clock.currentTimeMillis;

    const report = yield* Smoke.runScenarios(
      host,
      selected,
      { host: hostLabel(), startedAt },
      mount(flags, scenarios, root, path, registerWindowKey),
    );

    yield* fileSystem.writeFileString(
      path.join(flags.artifacts, "smoke-report.json"),
      Report.reportJson(report),
    );
    yield* Console.log(Report.formatReport(report));
    if (flags.json) yield* Console.log(Report.reportJson(report));
    // Release the native window before the effect completes: the test root's
    // window keeps Node's event loop alive, and a `--only` run (no later
    // scenario replacing the tree) would otherwise never exit.
    root.unmount();
    return Report.exitCode(report);
  });

/** The process inputs the CLI needs, injected so the argument guard is testable. */
export interface MainDeps {
  readonly argv: ReadonlyArray<string>;
  /** Loads the native binding; the argument guard must run first. */
  readonly load: () => Promise<unknown>;
}

/** Validates the arguments, then wires the real preflight and suite. */
export const main = (deps: MainDeps): Effect.Effect<ExitCode> =>
  Effect.gen(function* () {
    const parsed = parseArgs(deps.argv);

    if (parsed.flags.list) {
      yield* Console.log(Arr.join(idsOf(registry), "\n"));
      return EXIT.passed;
    }

    if (Arr.isReadonlyArrayNonEmpty(parsed.unknown)) {
      yield* Console.error(
        Arr.join(
          [
            ...Arr.map(
              parsed.unknown,
              (token) => `native smoke: unknown argument: ${token}`,
            ),
            usage,
          ],
          "\n",
        ),
      );
      return EXIT.unverified;
    }

    const unknownIds = Arr.filter(
      parsed.flags.only,
      (id) => !Arr.contains(idsOf(registry), id),
    );
    if (Arr.isReadonlyArrayNonEmpty(unknownIds)) {
      yield* Console.error(
        Arr.join(
          Arr.map(unknownIds, (id) => formatMissing(id, idsOf(registry))),
          "\n",
        ),
      );
      return EXIT.unverified;
    }

    return yield* runScenarioCli({
      detect: Runtime.detectRuntime({
        platform: process.platform,
        arch: process.arch,
        load: deps.load,
      }),
      runSuite: program(parsed.flags).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
        Effect.orDie,
      ),
    });
  });

// Run only when executed directly (`node dist/smoke/run.js`), never on import,
// so the pure tests can import this module without launching a suite.
// `Effect.runPromise` is the process entrypoint boundary (EF-21).
const entry = process.argv[1];
if (entry !== undefined && import.meta.filename === entry) {
  process.exitCode = await Effect.runPromise(
    main({
      argv: process.argv.slice(2),
      load: () => import("@gpuix/react/testing"),
    }),
  );
}
