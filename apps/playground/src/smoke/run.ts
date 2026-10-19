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
 * contract: `0` passed, `1` a real failure, `2` no evidence (unsupported host).
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
import { Native, Report, Runtime, Smoke } from "@gpuixui/testing";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { EventPayload } from "@gpuix/native";
import { createElement, Fragment, type ReactNode } from "react";
import { bindingPin, hostLabel, provenanceIssue } from "../binding.js";
import {
  formatMissing,
  idsOf,
  parseIds,
  selectScenarios,
} from "../scenario-selection.js";
import type { PlaygroundScenario } from "../types.js";
import { withWindowKeyProvider } from "../window-key.js";
import type { WindowKeyHandler } from "../window-key.js";
import { withSelectionProvider } from "../selection.js";
import type { SelectionEvent } from "../selection.js";
import { palettes } from "../palettes.js";
import { scenarios } from "../scenarios/index.js";
import {
  captureCommand,
  captureFile,
  captureProvenance,
  clearCapture,
  readCommit,
  writeProvenance,
} from "./capture.js";

/** The process exit code: 0 passed, 1 failed, 2 unverified. */
export const EXIT = { passed: 0, failed: 1, unverified: 2 } as const;
/** The process exit code: 0 passed, 1 failed, 2 unverified. */
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

const DEFAULT_ARTIFACTS = "apps/playground/.artifacts";

/** The usage text. Every argument is here; nothing is accepted silently. */
export const usage: string = Arr.join(
  [
    "usage:",
    "  --only <id[,id]>  run only these scenarios (repeatable; default: all)",
    "  --list            print the scenario ids and exit",
    "  --screenshots     capture one screenshot per scenario",
    "  --capture <dir>   capture frames plus provenance.json (implies --screenshots)",
    "  --commit <sha>    the commit to record (default: git rev-parse --short HEAD)",
    "  --artifacts <dir> where the report and screenshots land",
    "  --json            print the JSON report as well",
    "exit 2: no native evidence (unsupported host, or nothing ran)",
  ],
  "\n",
);

/** Parsed command line. */
export interface CliFlags {
  readonly json: boolean;
  readonly screenshots: boolean;
  readonly capture: Option.Option<string>;
  readonly commit: Option.Option<string>;
  readonly only: ReadonlyArray<string>;
  readonly list: boolean;
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
 * Unknown flags are collected, never silently ignored: a typo like `--onlyy`
 * must not quietly run the whole suite. `--only` accepts `a,b` and repeats,
 * exactly like the live CLI.
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
          Match.when("--list", () =>
            step(tail, { ...flags, list: true }, unknown),
          ),
          Match.when("--screenshots", () =>
            step(tail, { ...flags, screenshots: true }, unknown),
          ),
          Match.when("--capture", () =>
            Option.match(Arr.head(tail), {
              onNone: () => ({
                flags,
                unknown: Arr.append(unknown, "--capture needs a directory"),
              }),
              onSome: (dir) =>
                step(
                  Arr.drop(tail, 1),
                  {
                    ...flags,
                    screenshots: true,
                    capture: Option.some(dir),
                  },
                  unknown,
                ),
            }),
          ),
          Match.when("--commit", () =>
            Option.match(Arr.head(tail), {
              onNone: () => ({
                flags,
                unknown: Arr.append(unknown, "--commit needs a sha"),
              }),
              onSome: (sha) =>
                step(
                  Arr.drop(tail, 1),
                  { ...flags, commit: Option.some(sha) },
                  unknown,
                ),
            }),
          ),
          Match.when("--only", () =>
            Option.match(Arr.head(tail), {
              onNone: () => ({
                flags,
                unknown: Arr.append(unknown, "--only needs a scenario id"),
              }),
              onSome: (value) => {
                const selected = parseIds(value);
                return Arr.match(selected, {
                  onEmpty: () =>
                    step(
                      Arr.drop(tail, 1),
                      flags,
                      Arr.append(unknown, "--only needs a scenario id"),
                    ),
                  onNonEmpty: (ids) =>
                    step(
                      Arr.drop(tail, 1),
                      { ...flags, only: Arr.appendAll(flags.only, ids) },
                      unknown,
                    ),
                });
              },
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
      capture: Option.none(),
      commit: Option.none(),
      only: [],
      list: false,
      artifacts: DEFAULT_ARTIFACTS,
    },
    [],
  );
};

/** A usage error: the message to print and the exit code it implies. */
export interface UsageProblem {
  readonly message: string;
  readonly exit: ExitCode;
}

/**
 * `Some(problem)` when argv asks for something the registry cannot run.
 *
 * Checked before the preflight so a typo never imports the binding and never
 * produces a partial report. A usage error is exit `2`: nothing ran, so there
 * is no evidence.
 */
export const usageProblem = (
  parsed: ParsedArgs,
  known: ReadonlyArray<string>,
): Option.Option<UsageProblem> =>
  Arr.match(parsed.unknown, {
    onNonEmpty: (unknown) =>
      Option.some({
        message: Arr.join(
          [
            ...Arr.map(
              unknown,
              (token) => `native smoke: unknown argument: ${token}`,
            ),
            usage,
          ],
          "\n",
        ),
        exit: EXIT.unverified,
      }),
    onEmpty: () =>
      Arr.match(
        Arr.filter(parsed.flags.only, (id) => !Arr.contains(known, id)),
        {
          onEmpty: () => Option.none(),
          onNonEmpty: (missing) =>
            Option.some({
              message: formatMissing("native smoke", missing, known),
              exit: EXIT.unverified,
            }),
        },
      ),
  });

/** The preflight message for a host with no GPUix binding. Actionable, not a stack trace. */
export const formatUnsupported = (
  runtime: Runtime.RuntimeUnsupported,
): string =>
  Arr.join(
    [
      `native smoke suite: no GPUix binding on ${runtime.platform}-${runtime.arch}`,
      `  loader: ${runtime.reason}`,
      `  remedy: ${runtime.hint}`,
    ],
    "\n",
  );

/** The two effects the CLI needs, injected so the unsupported path is testable. */
export interface RunDeps {
  readonly detect: Effect.Effect<Runtime.RuntimeStatus>;
  /** Only evaluated when the host is supported, so the binding never loads here. */
  readonly runSuite: () => Effect.Effect<ExitCode>;
  readonly error: (line: string) => Effect.Effect<void>;
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
      yield* deps.error(formatUnsupported(runtime));
      yield* deps.error(
        "exit 2: the smoke suite produced no native evidence (ADR 0001/0002)",
      );
      return EXIT.unverified;
    }
    return yield* deps.runSuite();
  });

/** Everything `runMain` touches, injected so the argument guard needs no binding. */
export interface CliDeps {
  readonly detect: Effect.Effect<Runtime.RuntimeStatus>;
  readonly runSuite: (flags: CliFlags) => Effect.Effect<ExitCode>;
  readonly log: (line: string) => Effect.Effect<void>;
  readonly error: (line: string) => Effect.Effect<void>;
}

/**
 * The whole command line: usage → `--list` → preflight → suite.
 *
 * `--list` and a usage error return before the binding is imported, so both are
 * instant and neither can produce a partial report. A bare command still runs
 * the full headless suite (the documented `smoke` script); unlike live, the
 * headless runner does not need an explicit `--all`.
 */
export const runMain = (
  argv: ReadonlyArray<string>,
  deps: CliDeps,
): Effect.Effect<ExitCode> =>
  Effect.gen(function* () {
    const parsed = parseArgs(argv);
    const known = idsOf(scenarios);
    const problem = usageProblem(parsed, known);
    if (Option.isSome(problem)) {
      yield* deps.error(problem.value.message);
      return problem.value.exit;
    }
    if (parsed.flags.list) {
      yield* deps.log(Arr.join(known, "\n"));
      return EXIT.passed;
    }
    return yield* runScenarioCli({
      detect: deps.detect,
      runSuite: () => deps.runSuite(parsed.flags),
      error: deps.error,
    });
  });

/** A failure to load the native testing module after a green preflight. */
class NativeLoadError extends Schema.TaggedError<NativeLoadError>()(
  "NativeLoadError",
  {
    operation: Schema.String,
    cause: Schema.Unknown,
  },
) {}

const hostLabelOf = (): string =>
  hostLabel("TestRenderer", process.platform, process.arch);

const viewOf = (
  views: ReadonlyArray<PlaygroundScenario>,
  scenario: { readonly id: string },
): Option.Option<() => ReactNode> =>
  Option.map(
    Arr.findFirst(views, (candidate) => candidate.id === scenario.id),
    (candidate) => candidate.view,
  );

/** Mounts each scenario's own view in the test root before its steps run. */
const mount =
  (
    screenshots: boolean,
    screenshotDir: string,
    root: {
      readonly render: (node: ReactNode) => void;
      readonly renderer: { captureScreenshot: (path: string) => void };
    },
    path: Path.Path,
    registerWindowKey: (handler: Option.Option<WindowKeyHandler>) => void,
    registerSelection: (handler: Option.Option<SelectionEvent>) => void,
  ) =>
  (scenario: { readonly id: string }): Effect.Effect<void> => {
    const render = Effect.sync(() =>
      Option.match(viewOf(scenarios, scenario), {
        onNone: () => {},
        onSome: (view) =>
          root.render(
            // The key makes every scenario a **fresh mount**. Without it React
            // reconciles the next view against the previous one; two scenarios
            // that both render `<App>` keep its state (and the native scroll
            // offset of the sidebar), so a later scenario starts where the
            // earlier one stopped and a click lands outside the viewport.
            createElement(
              Fragment,
              { key: scenario.id },
              createElement(
                ThemeProvider,
                { theme: palettes.dark },
                withSelectionProvider(
                  registerSelection,
                  withWindowKeyProvider(registerWindowKey, view()),
                ),
              ),
            ),
          ),
      }),
    );
    return screenshots
      ? Effect.tap(render, () =>
          Effect.sync(() =>
            root.renderer.captureScreenshot(
              captureFile(path, screenshotDir, scenario.id),
            ),
          ),
        )
      : render;
  };

/** The real suite: load the binding, drive every scenario, write the report. */
export const program = (
  flags: CliFlags,
): Effect.Effect<
  ExitCode,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const issue = yield* provenanceIssue(process.platform, process.arch);
    if (Option.isSome(issue)) {
      yield* Console.error(issue.value);
      yield* Console.error(
        "rebuild the binding from the 0.10.0 tag (plan 529 §3) — the suite cannot claim verified 0.10.0 on a newer source",
      );
      return EXIT.failed;
    }

    // A capture caption may only name a commit the run actually had. Read it
    // before the binding loads so an unrecordable run costs no suite time.
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

    const testing = yield* Effect.tryPromise({
      try: () => import("@gpuix/react/testing"),
      catch: (cause) =>
        new NativeLoadError({
          operation: "import @gpuix/react/testing",
          cause,
        }),
    }).pipe(Effect.orDie);

    yield* fileSystem.makeDirectory(flags.artifacts, { recursive: true });
    const screenshotDir = Option.getOrElse(flags.capture, () =>
      path.join(flags.artifacts, "screenshots"),
    );
    if (Option.isSome(flags.capture)) {
      yield* clearCapture(flags.capture.value);
    }
    if (flags.screenshots) {
      yield* fileSystem.makeDirectory(screenshotDir, { recursive: true });
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

    // The window selection handler, the same app seam as the window key: a
    // component cannot reach the root options, so the runner forwards the
    // native signal to whatever the mounted view registered.
    const selection: { current: Option.Option<SelectionEvent> } = {
      current: Option.none(),
    };
    const registerSelection = (
      handler: Option.Option<SelectionEvent>,
    ): void => {
      selection.current = handler;
    };

    const root = testing.createTestRoot({
      width: 1280,
      height: 800,
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
    });
    const host = Native.createHost(root.renderer);
    const selected = selectScenarios(scenarios, flags.only).selected;
    const startedAt = yield* Clock.currentTimeMillis;

    const report = yield* Smoke.runScenarios(
      host,
      selected,
      { host: hostLabelOf(), startedAt },
      mount(
        flags.screenshots,
        screenshotDir,
        root,
        path,
        registerWindowKey,
        registerSelection,
      ),
    );

    yield* fileSystem.writeFileString(
      path.join(flags.artifacts, "smoke-report.json"),
      Report.reportJson(report),
    );
    yield* Console.log(Report.formatReport(report));
    if (flags.json) yield* Console.log(Report.reportJson(report));
    if (Option.isSome(flags.capture) && Option.isSome(commit)) {
      const captureDir = flags.capture.value;
      const captured = Arr.match(flags.only, {
        onEmpty: () => [],
        onNonEmpty: () => Arr.map(selected, (scenario) => scenario.id),
      });
      const provenance = captureProvenance(report, {
        platform: `${process.platform}-${process.arch}`,
        gpuixVersion: bindingPin.version,
        commit: commit.value,
        command: captureCommand(captureDir, captured),
      });
      yield* Option.match(provenance, {
        onNone: () =>
          Console.error(
            "capture: no provenance written (the run did not pass)",
          ),
        onSome: (present) => writeProvenance(captureDir, present),
      });
    }
    // Release the native window before the effect completes: the test root's
    // window keeps Node's event loop alive, and a `--only` run (no later
    // scenario replacing the tree) would otherwise never exit.
    root.unmount();
    return Report.exitCode(report);
  });

/** Wires the real preflight and suite. Runtime execution stays here. */
export const main = (): Effect.Effect<ExitCode> =>
  runMain(process.argv.slice(2), {
    detect: Runtime.detectRuntime({
      platform: process.platform,
      arch: process.arch,
      load: () => import("@gpuix/react/testing"),
    }),
    runSuite: (flags) =>
      program(flags).pipe(
        Effect.provide(NodeChildProcessSpawner.layer),
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
        Effect.orDie,
      ),
    log: Console.log,
    error: Console.error,
  });

// Run only when executed directly (`node dist/smoke/run.js`), never on import,
// so the pure tests can import this module without launching a suite.
// `Effect.runPromise` is the process entrypoint boundary (EF-21).
const entry = process.argv[1];
if (entry !== undefined && import.meta.filename === entry) {
  process.exitCode = await Effect.runPromise(main());
}
