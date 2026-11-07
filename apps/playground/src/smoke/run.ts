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

export const EXIT = { passed: 0, failed: 1, unverified: 2 } as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

const DEFAULT_ARTIFACTS = "apps/playground/.artifacts";

export interface CliFlags {
  readonly json: boolean;
  readonly screenshots: boolean;

  readonly list: boolean;

  readonly only: ReadonlyArray<string>;
  readonly artifacts: string;
}

export interface ParsedArgs {
  readonly flags: CliFlags;
  readonly unknown: ReadonlyArray<string>;
}

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

export const idsOf = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
): ReadonlyArray<string> => Arr.map(list, (scenario) => scenario.id);

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

export interface RunDeps {
  readonly detect: Effect.Effect<Runtime.RuntimeStatus>;

  readonly runSuite: Effect.Effect<ExitCode>;
}

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
      { host: hostLabel(), startedAt, coverage: Smoke.coverageOf(scenarios) },
      mount(flags, scenarios, root, path, registerWindowKey),
    );

    yield* fileSystem.writeFileString(
      path.join(flags.artifacts, "smoke-report.json"),
      Report.reportJson(report),
    );
    yield* Console.log(Report.formatReport(report));
    if (flags.json) yield* Console.log(Report.reportJson(report));

    root.unmount();
    return Report.exitCode(report);
  });

export interface MainDeps {
  readonly argv: ReadonlyArray<string>;

  readonly load: () => Promise<unknown>;
}

export const main = (deps: MainDeps): Effect.Effect<ExitCode> =>
  Effect.gen(function* () {
    const parsed = parseArgs(deps.argv);

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

    if (parsed.flags.list) {
      yield* Console.log(Arr.join(idsOf(registry), "\n"));
      return EXIT.passed;
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

const entry = process.argv[1];
if (entry !== undefined && import.meta.filename === entry) {
  process.exitCode = await Effect.runPromise(
    main({
      argv: process.argv.slice(2),
      load: () => import("@gpuix/react/testing"),
    }),
  );
}
