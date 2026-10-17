/**
 * The platform-free half of the native smoke suite: the check model, the
 * scenario runner and the capability verdict.
 *
 * The native half (`apps/playground`) adapts a real GPUix renderer to
 * `SmokeHost`. This module never imports `@gpuix/*`, so its own tests run on any
 * host — including one where the binding does not exist.
 */
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** Every capability the suite can report a verdict for. */
export const CAPABILITIES = [
  "layout",
  "text",
  "input",
  "focus",
  "overlay",
  "scroll",
  "panel",
  "virtual-list",
  "table",
  "tree",
  "workspace",
] as const;
/** Every capability the suite can report a verdict for. */
export const Capability = Schema.Literals(CAPABILITIES);
/** Every capability the suite can report a verdict for. */
export type Capability = typeof Capability.Type;

/** A value an `expectEqual` check can compare. */
export const Scalar = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
]);
/** A value an `expectEqual` check can compare. */
export type Scalar = typeof Scalar.Type;

/** A check that held. */
export class Passed extends Schema.Class<Passed>("Passed")({
  _tag: Schema.tag("passed"),
}) {}

/** A check that did not hold; `detail` names what was expected and measured. */
export class Failed extends Schema.Class<Failed>("Failed")({
  _tag: Schema.tag("failed"),
  detail: Schema.String,
}) {}

/** A check whose step threw or died rather than failing cleanly. */
export class Errored extends Schema.Class<Errored>("Errored")({
  _tag: Schema.tag("errored"),
  detail: Schema.String,
}) {}

/** One check outcome. */
export const CheckOutcome = Schema.Union([Passed, Failed, Errored]).pipe(
  Schema.toTaggedUnion("_tag"),
);
/** One check outcome. */
export type CheckOutcome = typeof CheckOutcome.Type;

/** A single assertion result, labelled by its scenario. */
export class CheckResult extends Schema.Class<CheckResult>("CheckResult")({
  label: Schema.String,
  outcome: CheckOutcome,
}) {}

/** One scenario's result: its checks and how long it ran. */
export class ScenarioResult extends Schema.Class<ScenarioResult>(
  "ScenarioResult",
)({
  id: Schema.String,
  title: Schema.String,
  capability: Capability,
  checks: Schema.Array(CheckResult),
  durationMs: Schema.Number,
}) {}

/** A capability's verdict, aggregated from every scenario that covers it. */
export class CapabilityResult extends Schema.Class<CapabilityResult>(
  "CapabilityResult",
)({
  capability: Capability,
  status: Schema.Literals(["verified", "failed", "unverified"]),
}) {}

/** The suite's machine-readable output. */
export class SmokeReport extends Schema.Class<SmokeReport>("SmokeReport")({
  host: Schema.String,
  startedAt: Schema.Number,
  durationMs: Schema.Number,
  scenarios: Schema.Array(ScenarioResult),
  capabilities: Schema.Array(CapabilityResult),
}) {}

/** A rectangle read back from the runtime. */
export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A scroll offset read back from the runtime. */
export interface Offset {
  readonly x: number;
  readonly y: number;
}

/**
 * The only way a scenario touches the runtime.
 *
 * `apps/playground` adapts a real renderer to this interface; a scenario never
 * sees a GPUix type.
 *
 * Nullish returns are deliberate: this is the boundary where the adapter calls
 * a renderer that reports "not found" as `null`. Scenarios convert with
 * `Option.fromNullishOr` and fail with a label naming the missing `testId`
 * (`expectSome`), so absence never reaches the check model as `null`.
 */
export interface SmokeHost {
  readonly text: (testId: string) => string | null;
  readonly paintedText: () => ReadonlyArray<string>;
  readonly bounds: (testId: string) => Bounds | null;
  readonly focused: () => string | null;
  readonly click: (testId: string) => void;
  readonly clickWindow: (x: number, y: number) => void;
  readonly key: (keystroke: string) => void;
  /** Native focus traversal (`window.focus_next`). */
  readonly focusNext: () => void;
  /** Native focus traversal (`window.focus_prev`). */
  readonly focusPrevious: () => void;
  readonly wheel: (testId: string, deltaX: number, deltaY: number) => void;
  readonly drag: (
    testId: string,
    deltaX: number,
    deltaY: number,
    steps?: number,
  ) => void;
  readonly scrollOffset: (testId: string) => Offset | null;
  readonly screenshot: (absolutePath: string) => void;
  readonly advance: (ms: number) => void;
}

/** A failed check, as data. */
export class SmokeAssertionError extends Schema.TaggedError<SmokeAssertionError>()(
  "SmokeAssertionError",
  {
    label: Schema.String,
    expected: Schema.String,
    actual: Schema.String,
  },
) {
  get message(): string {
    return `${this.label}: expected ${this.expected}, got ${this.actual}`;
  }
}

/** What a scenario is handed to act on and to assert against. */
export interface SmokeContext {
  readonly host: SmokeHost;
  readonly expectEqual: (
    label: string,
    actual: Scalar,
    expected: Scalar,
  ) => Effect.Effect<void, SmokeAssertionError>;
  readonly expectNear: (
    label: string,
    actual: number,
    expected: number,
    tolerance: number,
  ) => Effect.Effect<void, SmokeAssertionError>;
  readonly expectContains: (
    label: string,
    haystack: string,
    needle: string,
  ) => Effect.Effect<void, SmokeAssertionError>;
  readonly expectSome: <A>(
    label: string,
    value: Option.Option<A>,
  ) => Effect.Effect<A, SmokeAssertionError>;
  /** Runs `assertion`, recording one extra passing check labelled `label`. */
  readonly check: (
    label: string,
    assertion: Effect.Effect<void, SmokeAssertionError>,
  ) => Effect.Effect<void, SmokeAssertionError>;
}

/** One capability, one view, one `steps` effect. */
export interface SmokeScenario {
  readonly id: string;
  readonly title: string;
  readonly capability: Capability;
  readonly steps: (
    ctx: SmokeContext,
  ) => Effect.Effect<void, SmokeAssertionError>;
}

const scalarEq = Schema.toEquivalence(Scalar);

const show = (value: Scalar): string =>
  Match.value(value).pipe(
    Match.when(P.isString, (text) => `"${text}"`),
    Match.when(P.isNumber, (number) => `${number}`),
    Match.when(P.isBoolean, (flag) => `${flag}`),
    Match.exhaustive,
  );

type CheckSink = Ref.Ref<ReadonlyArray<CheckResult>>;

const record = (checks: CheckSink, label: string): Effect.Effect<void> =>
  Ref.update(checks, (previous) =>
    Arr.append(previous, new CheckResult({ label, outcome: new Passed({}) })),
  );

const assert = (
  checks: CheckSink,
  label: string,
  holds: boolean,
  expected: string,
  actual: string,
): Effect.Effect<void, SmokeAssertionError> =>
  holds
    ? record(checks, label)
    : Effect.fail(new SmokeAssertionError({ label, expected, actual }));

const context = (host: SmokeHost, checks: CheckSink): SmokeContext => ({
  host,
  expectEqual: (label, actual, expected) =>
    assert(
      checks,
      label,
      scalarEq(actual, expected),
      show(expected),
      show(actual),
    ),
  expectNear: (label, actual, expected, tolerance) =>
    assert(
      checks,
      label,
      Math.abs(actual - expected) <= tolerance,
      `${expected} ± ${tolerance}`,
      `${actual}`,
    ),
  expectContains: (label, haystack, needle) =>
    assert(
      checks,
      label,
      Str.includes(needle)(haystack),
      `a string containing "${needle}"`,
      `"${haystack}"`,
    ),
  expectSome: (label, value) =>
    Option.isSome(value)
      ? Effect.map(record(checks, label), () => value.value)
      : Effect.fail(
          new SmokeAssertionError({
            label,
            expected: "a value",
            actual: "none",
          }),
        ),
  check: (label, assertion) =>
    Effect.tap(assertion, () => record(checks, label)),
});

const failed = (
  checks: CheckSink,
  error: SmokeAssertionError,
): Effect.Effect<void> =>
  Ref.update(checks, (previous) =>
    Arr.append(
      previous,
      new CheckResult({
        label: error.label,
        outcome: new Failed({ detail: error.message }),
      }),
    ),
  );

const errored =
  (
    checks: CheckSink,
    scenarioId: string,
  ): ((cause: Cause.Cause<never>) => Effect.Effect<void>) =>
  (cause) =>
    Ref.update(checks, (previous) =>
      Arr.append(
        previous,
        new CheckResult({
          label: scenarioId,
          outcome: new Errored({ detail: Cause.pretty(cause) }),
        }),
      ),
    );

const runScenario = (
  host: SmokeHost,
  scenario: SmokeScenario,
  mount: Option.Option<(scenario: SmokeScenario) => Effect.Effect<void>>,
): Effect.Effect<ScenarioResult> =>
  Effect.gen(function* () {
    const checks = yield* Ref.make<ReadonlyArray<CheckResult>>([]);
    const startedAt = yield* Clock.currentTimeMillis;
    yield* Option.match(mount, {
      onNone: () => Effect.void,
      onSome: (before) => before(scenario),
    }).pipe(
      Effect.flatMap(() => scenario.steps(context(host, checks))),
      Effect.catch((error) => failed(checks, error)),
      Effect.catchCause(errored(checks, scenario.id)),
    );
    const endedAt = yield* Clock.currentTimeMillis;
    return new ScenarioResult({
      id: scenario.id,
      title: scenario.title,
      capability: scenario.capability,
      checks: yield* Ref.get(checks),
      durationMs: endedAt - startedAt,
    });
  });

const isPassed = (outcome: CheckOutcome): boolean =>
  CheckOutcome.match(outcome, {
    passed: () => true,
    failed: () => false,
    errored: () => false,
  });

const scenarioPassed = (result: ScenarioResult): boolean =>
  Arr.match(result.checks, {
    onEmpty: () => false,
    onNonEmpty: (checks) =>
      Arr.every(checks, (check) => isPassed(check.outcome)),
  });

const capabilityResults = (
  results: ReadonlyArray<ScenarioResult>,
): ReadonlyArray<CapabilityResult> =>
  Arr.map(
    Arr.filter(CAPABILITIES, (capability) =>
      Arr.some(results, (result) => result.capability === capability),
    ),
    (capability) =>
      new CapabilityResult({
        capability,
        status: Arr.every(
          Arr.filter(results, (result) => result.capability === capability),
          scenarioPassed,
        )
          ? "verified"
          : "failed",
      }),
  );

/**
 * Runs every scenario in order against `host` and aggregates a report.
 *
 * A scenario can never fail the suite: a typed assertion becomes `failed`, a
 * defect becomes `errored`, and the next scenario still runs.
 *
 * `beforeEach` is the mount seam: a native runner renders the scenario's own
 * view before its `steps` run. It is optional so the platform-free tests need
 * no renderer.
 */
export const runScenarios = (
  host: SmokeHost,
  scenarios: ReadonlyArray<SmokeScenario>,
  meta: { readonly host: string; readonly startedAt: number },
  beforeEach?: (scenario: SmokeScenario) => Effect.Effect<void>,
): Effect.Effect<SmokeReport> =>
  Effect.gen(function* () {
    const mount = Option.fromNullishOr(beforeEach);
    const results = yield* Effect.forEach(
      scenarios,
      (scenario) => runScenario(host, scenario, mount),
      { concurrency: 1 },
    );
    const endedAt = yield* Clock.currentTimeMillis;
    return new SmokeReport({
      host: meta.host,
      startedAt: meta.startedAt,
      durationMs: endedAt - meta.startedAt,
      scenarios: results,
      capabilities: capabilityResults(results),
    });
  });
