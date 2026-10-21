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
import type { Pixels } from "./pixels.js";

/** Every capability the suite can report a verdict for. */
export const CAPABILITIES = [
  "layout",
  "text",
  "input",
  "focus",
  "overlay",
  "modal",
  "floating",
  "scroll",
  "panel",
  "virtual-list",
  "table",
  "tree",
  "log",
  "theme",
  "workspace",
  "editor",
  "content",
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
 * One highlight wash the renderer painted in the last frame.
 *
 * `text.slice(start, end)` is the match, because the runtime reports the run's
 * full string — a match that soft-wraps is one wash with several rects, and an
 * `active` wash is the one a find bar marks differently. None of this reaches
 * `getAllText`/`getPaintedText`: a wash is a quad, not a glyph run.
 */
export interface HighlightWash {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly active: boolean;
  readonly rects: ReadonlyArray<Bounds>;
}

/** A shadow the runtime reports, shaped like GPUix's `StyleDesc.boxShadow`. */
export class BoxShadowSnapshot extends Schema.Class<BoxShadowSnapshot>(
  "BoxShadowSnapshot",
)({
  offsetX: Schema.Number,
  offsetY: Schema.Number,
  blurRadius: Schema.Number,
  spreadRadius: Schema.Number,
  color: Schema.String,
}) {}

/**
 * The runtime's own report of the style it applied to an element.
 *
 * Every field is optional because the runtime reports what the style set and
 * nothing else: a missing key decodes to `None`. A property the runtime reports
 * with an unexpected type fails the whole decode, so the snapshot is `null` —
 * deliberate, because a runtime that changed the shape of its style report is a
 * defect a scenario must see rather than a difference to paper over.
 */
export class StyleSnapshot extends Schema.Class<StyleSnapshot>("StyleSnapshot")(
  {
    backgroundColor: Schema.OptionFromOptional(Schema.String),
    borderRadius: Schema.OptionFromOptional(Schema.Number),
    color: Schema.OptionFromOptional(Schema.String),
    fontFamily: Schema.OptionFromOptional(Schema.String),
    fontSize: Schema.OptionFromOptional(Schema.Number),
    boxShadow: Schema.OptionFromOptional(BoxShadowSnapshot),
  },
) {}

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
  /**
   * The style the runtime applied to `testId`, decoded; `null` when the id is
   * not painted. The adapter decodes the renderer's payload at this boundary,
   * so a scenario asserts on tokens, never on an untyped style record.
   */
  readonly paintedStyle: (testId: string) => StyleSnapshot | null;
  readonly focused: () => string | null;
  readonly click: (testId: string) => void;
  readonly clickWindow: (x: number, y: number) => void;
  readonly key: (keystroke: string) => void;
  /** Native focus traversal (`window.focus_next`). */
  readonly focusNext: () => void;
  /** Native focus traversal (`window.focus_prev`). */
  readonly focusPrevious: () => void;
  readonly wheel: (testId: string, deltaX: number, deltaY: number) => void;
  /**
   * Drags a text selection between two window points.
   *
   * The runtime registers its selection listeners during **paint**, so this is
   * not `drag`: a hand-rolled down/move/up with no flush between them selects
   * nothing. The renderer's own `dragSelect` exists for that reason, and a probe
   * measures text selection through it rather than through pointer events.
   */
  readonly dragSelect: (from: Offset, to: Offset) => void;
  /** The joined text currently selected, or `null` for no selection. */
  readonly selectedText: () => string | null;
  /** Drops the selection, so a probe can prove an element selects nothing. */
  readonly clearSelection: () => void;
  readonly drag: (
    testId: string,
    deltaX: number,
    deltaY: number,
    steps?: number,
  ) => void;
  /**
   * Simulates a Finder-style file drop at the centre of `testId`.
   *
   * The runtime dispatches the OS drop path (`FileDrop::Entered` then `Submit`),
   * so a scenario can prove `onFileDrop` receives absolute paths — and that a
   * drop elsewhere reaches no handler — without a human dragging a file from
   * Finder. The offscreen renderer is the only renderer that exposes this.
   */
  readonly fileDrop: (testId: string, paths: ReadonlyArray<string>) => void;
  readonly scrollOffset: (testId: string) => Offset | null;
  /**
   * Every highlight wash the renderer painted in the last frame.
   *
   * The only channel that sees a `highlight` at all: the wash is a quad behind
   * the text, so `text` and `paintedText` report the same string with or
   * without it. A search UI asserts on this rather than on a screenshot.
   */
  readonly highlights: () => ReadonlyArray<HighlightWash>;
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

/**
 * A window host failure, named by the verb that broke.
 *
 * The automation protocol rejects with its own error type; a probe lifts every
 * call with `Effect.tryPromise` and wraps the cause here, so a missing window
 * verb reads as `text <testId>: ...` rather than as an unrelated defect.
 */
export class SmokeHostError extends Schema.TaggedError<SmokeHostError>()(
  "SmokeHostError",
  {
    verb: Schema.String,
    cause: Schema.Unknown,
  },
) {
  get message(): string {
    return `${this.verb}: ${causeText(this.cause)}`;
  }
}

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

/** The assertion members every scenario context has, whatever the host. */
export interface Assertions {
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

/** What a headless scenario is handed to act on and to assert against. */
export interface SmokeContext extends Assertions {
  readonly host: SmokeHost;
}

/**
 * The window twin of `SmokeHost`: the same verbs, but effectful.
 *
 * The automation protocol behind a real window is asynchronous, so a live probe
 * cannot use the synchronous host. `paintedStyle` is deliberately absent: a
 * real `GpuixRenderer` exposes no style report, so a style assertion stays a
 * `TestRenderer` fact (`theme-*` scenarios) and a live probe proves paint
 * through a screenshot instead.
 */
export interface AsyncSmokeHost {
  readonly text: (testId: string) => Effect.Effect<string, SmokeHostError>;
  readonly paintedText: () => Effect.Effect<
    ReadonlyArray<string>,
    SmokeHostError
  >;
  readonly bounds: (
    testId: string,
  ) => Effect.Effect<Bounds | null, SmokeHostError>;
  readonly focused: () => Effect.Effect<string | null, SmokeHostError>;
  readonly click: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Moves the pointer onto `testId` and leaves it there, pressing nothing.
   *
   * Hover is its own input path: a tooltip opens on a pointer entering its
   * trigger and closes when the pointer leaves, and neither fires for a press.
   * A window's automation sends a real move to the element's centre, which is
   * the only way to drive the enter/leave pair the way a pointer does.
   */
  readonly hover: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Presses on `testId` and drags the pointer by the given offset, releasing
   * there.
   *
   * A window's automation sends real move events with the button held, so this
   * is a genuine pointer drag, not a synthesised down/move/up: listeners on an
   * ancestor of both the source and the drop target receive every move. The
   * runtime has no pointer capture, so a drag that leaves the ancestor's subtree
   * stops receiving them — the live probes document that rather than hide it.
   */
  readonly drag: (
    testId: string,
    deltaX: number,
    deltaY: number,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * Sends one wheel event over `testId`'s painted centre.
   *
   * The wheel is a hit-tested input, so it names an element rather than a pair
   * of coordinates: an event aimed at empty space proves nothing about the
   * scroller a reader would actually roll. Deltas are pixels and the sign is
   * GPUI's — a negative `deltaY` scrolls down, the opposite of the DOM.
   */
  readonly wheel: (
    testId: string,
    deltaX: number,
    deltaY: number,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * The scroll offset the window's renderer holds for `testId`.
   *
   * `null` means the element has no scroll handle — the same absence the
   * headless host reports — so a probe can prove an element that is not a
   * scroller does not scroll instead of reading `0` for both.
   */
  readonly scrollOffset: (
    testId: string,
  ) => Effect.Effect<Offset | null, SmokeHostError>;
  readonly key: (keystroke: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Releases a key the window is holding.
   *
   * Measured: a window's automation `keystrokes` delivers the key **down** and
   * no `keyUp` (a probe read `keys=D:space`), so a control that activates on
   * release — Space on a button, checkbox or switch, the platform's own rule —
   * is only provable by releasing through the renderer.
   */
  readonly keyUp: (keystroke: string) => Effect.Effect<void, SmokeHostError>;
  readonly focusNext: () => Effect.Effect<void, SmokeHostError>;
  /** Native focus from component code (`renderer.focusElement`). */
  readonly focusElement: (
    testId: string,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * Installs a font file in the renderer **after** the first paint.
   *
   * A runner registers a probe's declared faces before the view mounts, which is
   * the documented order. This verb exists for the other order: a probe mounts
   * text naming an unknown family, installs it here, forces a re-layout and
   * measures whether the painted advances changed. It is the only way to turn
   * "a late family does not re-shape text" from a claim in the typings into a
   * measurement.
   */
  readonly registerFont: (
    bytes: Uint8Array,
  ) => Effect.Effect<void, SmokeHostError>;
  /** Waits until `testId` paints, so a probe never races its mount. */
  readonly waitFor: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Captures the window under `name`.
   *
   * The runner resolves the name inside its artifacts directory: a probe names
   * a state (`"tab"`), never a path, so it cannot write outside the run.
   */
  readonly capture: (name: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Decodes the capture stored under `name`, so a probe can assert paint.
   *
   * A window's renderer reports no style, which makes the frame the only
   * evidence; every colour a probe claims to see must be read from it.
   */
  readonly pixels: (name: string) => Effect.Effect<Pixels, SmokeHostError>;
}

/** What a live-window probe is handed to act on and to assert against. */
export interface AsyncSmokeContext extends Assertions {
  readonly host: AsyncSmokeHost;
}

/** One live-window probe: the async twin of `SmokeScenario`. */
export interface AsyncSmokeScenario {
  readonly id: string;
  readonly title: string;
  readonly capability: Capability;
  readonly steps: (
    ctx: AsyncSmokeContext,
  ) => Effect.Effect<void, SmokeAssertionError | SmokeHostError>;
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

const assertions = (checks: CheckSink): Assertions => ({
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
  ): ((cause: Cause.Cause<unknown>) => Effect.Effect<void>) =>
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

/** The identity a mount seam needs; every scenario has one. */
interface Mountable {
  readonly id: string;
}

/**
 * Runs one scenario's steps, recording a typed failure as `failed` and a defect
 * as `errored`.
 *
 * `steps` receives the check sink so the caller can build its context first:
 * both suites share this body, so the headless and live reports cannot drift on
 * how an assertion is recorded.
 */
const runBody = <
  S extends Mountable & {
    readonly title: string;
    readonly capability: Capability;
  },
>(
  scenario: S,
  mount: Option.Option<(scenario: S) => Effect.Effect<void>>,
  steps: (
    checks: CheckSink,
  ) => Effect.Effect<void, SmokeAssertionError | SmokeHostError>,
): Effect.Effect<ScenarioResult> =>
  Effect.gen(function* () {
    const checks = yield* Ref.make<ReadonlyArray<CheckResult>>([]);
    const startedAt = yield* Clock.currentTimeMillis;
    yield* Option.match(mount, {
      onNone: () => Effect.void,
      onSome: (before) => before(scenario),
    }).pipe(
      Effect.flatMap(() => steps(checks)),
      Effect.catchTag("SmokeAssertionError", (error) => failed(checks, error)),
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

const runScenario = (
  host: SmokeHost,
  scenario: SmokeScenario,
  mount: Option.Option<(scenario: SmokeScenario) => Effect.Effect<void>>,
): Effect.Effect<ScenarioResult> =>
  runBody(scenario, mount, (checks) =>
    scenario.steps({ host, ...assertions(checks) }),
  );

const runAsyncScenario = (
  host: AsyncSmokeHost,
  scenario: AsyncSmokeScenario,
  mount: Option.Option<(scenario: AsyncSmokeScenario) => Effect.Effect<void>>,
): Effect.Effect<ScenarioResult> =>
  runBody(scenario, mount, (checks) =>
    scenario.steps({ host, ...assertions(checks) }),
  );

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

/** Aggregates scenario results into the report both runners emit. */
const reportOf = (
  results: ReadonlyArray<ScenarioResult>,
  meta: { readonly host: string; readonly startedAt: number },
): Effect.Effect<SmokeReport> =>
  Effect.gen(function* () {
    const endedAt = yield* Clock.currentTimeMillis;
    return new SmokeReport({
      host: meta.host,
      startedAt: meta.startedAt,
      durationMs: endedAt - meta.startedAt,
      scenarios: results,
      capabilities: capabilityResults(results),
    });
  });

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
    return yield* reportOf(results, meta);
  });

/**
 * Runs every live-window probe in order and aggregates the same report shape.
 *
 * The window runner owns the mount seam, so a probe's view is rendered in the
 * real window before its steps run; the checks and the exit code are identical
 * to the headless suite.
 */
export const runAsyncScenarios = (
  host: AsyncSmokeHost,
  scenarios: ReadonlyArray<AsyncSmokeScenario>,
  meta: { readonly host: string; readonly startedAt: number },
  beforeEach?: (scenario: AsyncSmokeScenario) => Effect.Effect<void>,
): Effect.Effect<SmokeReport> =>
  Effect.gen(function* () {
    const mount = Option.fromNullishOr(beforeEach);
    const results = yield* Effect.forEach(
      scenarios,
      (scenario) => runAsyncScenario(host, scenario, mount),
      { concurrency: 1 },
    );
    return yield* reportOf(results, meta);
  });
