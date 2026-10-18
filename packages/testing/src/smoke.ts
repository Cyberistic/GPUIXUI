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
  "modal",
  "floating",
  "select",
  "combobox",
  "tooltip",
  "a11y",
  "scroll",
  "panel",
  "motion",
  "virtual-list",
  "table",
  "tree",
  "log",
  "theme",
  "workspace",
  "docking",
  "float",
  "preview",
  "command",
  "content",
  "drag",
  "reorder",
  "tree-reorder",
  "selection",
  "menu",
  "menubar",
  "components",
  "search",
  "terminal",
  "chart",
  "toast",
  "grid",
  "data-grid",
  "columns",
  "column-config",
  "chrome",
  "layers",
  "scroller",
  "scale",
  "tier2",
  "replace",
  "states",
  "truncation",
  "grid-layout",
  "typography",
  "inspector",
  "editor",
  "data-toolbar",
  "query",
  "notification",
  "crop",
  "wizard",
  "cell-editing",
  "upload",
  "qr",
  "media",
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
 * A `<virtual-list>`'s logical anchor: the row it starts on, the pixel offset
 * inside that row, and the viewport height.
 */
export const ListAnchor = Schema.Tuple([
  Schema.Number,
  Schema.Number,
  Schema.Number,
]);
/** A `<virtual-list>`'s logical anchor. */
export type ListAnchor = typeof ListAnchor.Type;

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
    borderColor: Schema.OptionFromOptional(Schema.String),
    color: Schema.OptionFromOptional(Schema.String),
    fontFamily: Schema.OptionFromOptional(Schema.String),
    fontSize: Schema.OptionFromOptional(Schema.Number),
    boxShadow: Schema.OptionFromOptional(BoxShadowSnapshot),
  },
) {}

/**
 * One node's `aria` report from the runtime's accessibility dump.
 *
 * Keys mirror the dump, like `BoxShadowSnapshot` mirrors `boxShadow`: the
 * runtime, not this package, is the source of truth for what AccessKit holds.
 * `placeholder` and the states are optional because the runtime omits what the
 * authored props did not set.
 */
export class A11yNode extends Schema.Class<A11yNode>("A11yNode")({
  author_id: Schema.OptionFromOptional(Schema.String),
  role: Schema.OptionFromOptional(Schema.String),
  label: Schema.OptionFromOptional(Schema.String),
  description: Schema.OptionFromOptional(Schema.String),
  value: Schema.OptionFromOptional(Schema.String),
  placeholder: Schema.OptionFromOptional(Schema.String),
  selected: Schema.OptionFromOptional(Schema.Boolean),
  expanded: Schema.OptionFromOptional(Schema.Boolean),
  level: Schema.OptionFromOptional(Schema.Number),
  on_action: Schema.OptionFromOptional(Schema.Array(Schema.String)),
}) {}

/** The painted frame's accessibility counters. */
export class A11yFrame extends Schema.Class<A11yFrame>("A11yFrame")({
  node_count: Schema.Number,
  tab_stop_count: Schema.Number,
}) {}

/**
 * The runtime's accessibility dump.
 *
 * Nodes are keyed by ephemeral ids; a scenario addresses one by the authored
 * `aria-id` (`author_id`), never by a key. A node without `aria` is structural.
 */
export class A11yTree extends Schema.Class<A11yTree>("A11yTree")({
  frame: A11yFrame,
  nodes: Schema.Record(
    Schema.String,
    Schema.Struct({ aria: Schema.OptionFromOptional(A11yNode) }),
  ),
}) {}

/**
 * One box a highlight wash painted.
 *
 * A soft-wrapped match paints one box per visual row, so a match owns rects,
 * not a rect.
 */
export class HighlightRect extends Schema.Class<HighlightRect>("HighlightRect")(
  {
    x: Schema.Number,
    y: Schema.Number,
    width: Schema.Number,
    height: Schema.Number,
  },
) {}

/**
 * One highlight wash the runtime painted, decoded from `getPaintedHighlights`.
 *
 * `text` is the full run the match lives in, so `text.slice(start, end)` is the
 * matched string. Offsets are UTF-16 code units — the units `indexOf` returns —
 * and `active` marks the find-bar cursor. The wash colour is not reported; this
 * snapshot deliberately stops at what the runtime can prove.
 */
export class HighlightMatch extends Schema.Class<HighlightMatch>(
  "HighlightMatch",
)({
  elementId: Schema.Number,
  sub: Schema.Number,
  text: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  active: Schema.Boolean,
  rects: Schema.Array(HighlightRect),
}) {}

/**
 * The renderer's highlight payload, decoded.
 *
 * A malformed wash is dropped rather than failing the frame: one bad quad must
 * not hide every other match the runtime painted.
 */
export const decodeHighlights = (
  payloads: ReadonlyArray<unknown>,
): ReadonlyArray<HighlightMatch> =>
  Arr.getSomes(
    Arr.map(payloads, (payload) =>
      Schema.decodeUnknownOption(HighlightMatch)(payload),
    ),
  );

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
  /**
   * The host element type the runtime retained for `testId`, or `null` when it
   * holds no such node. Retention is not paint: `<canvas>` is retained and
   * paints nothing, which `bounds` reports as `null`.
   */
  readonly elementType: (testId: string) => string | null;
  readonly bounds: (testId: string) => Bounds | null;
  /**
   * The style the runtime applied to `testId`, decoded; `null` when the id is
   * not painted. The adapter decodes the renderer's payload at this boundary,
   * so a scenario asserts on tokens, never on an untyped style record.
   */
  readonly paintedStyle: (testId: string) => StyleSnapshot | null;
  /** The last painted frame's accessibility tree, decoded at the adapter. */
  readonly a11y: () => A11yTree | null;
  /**
   * Every highlight wash the last frame painted, decoded at the adapter.
   *
   * A highlight is a quad, not a style property and not painted text, so the
   * renderer's own report is the only honest evidence that a match reached the
   * screen.
   */
  readonly highlights: () => ReadonlyArray<HighlightMatch>;
  readonly focused: () => string | null;
  /** Clicks `testId`'s centre; `modifiers` use the runtime's `"shift"` syntax. */
  readonly click: (testId: string, modifiers?: string) => void;
  /** Clicks window coordinates, with optional held modifiers. */
  readonly clickWindow: (x: number, y: number, modifiers?: string) => void;
  /**
   * Presses the primary button at `testId`'s centre.
   *
   * A whole gesture (`drag`) releases before the scenario can inspect anything
   * mid-gesture; an edge hold needs the down, the held moves and the up apart.
   */
  readonly press: (testId: string) => void;
  /** Presses the primary button at window coordinates (a drag's first half). */
  readonly pressWindow: (x: number, y: number) => void;
  /** Moves the pointer to window coordinates with the primary button held. */
  readonly movePointer: (x: number, y: number) => void;
  /** Releases the primary button at window coordinates. */
  readonly releasePointer: (x: number, y: number) => void;
  /** Right-clicks `testId`'s centre through GPUI's click pipeline (button 2). */
  readonly rightClick: (testId: string) => void;
  /** Moves the pointer onto `testId`, delivering native enter/leave. */
  readonly hover: (testId: string) => void;
  readonly key: (keystroke: string) => void;
  /**
   * Delivers a key down to `testId` without a matching up.
   *
   * `key` runs the renderer's keystroke parser; a control whose contract is
   * "Space activates on key **up**" needs the two halves separately, exactly as
   * a physical keyboard delivers them.
   */
  readonly keyDown: (testId: string, key: string) => void;
  /** Delivers the key up matching {@link SmokeHost.keyDown}. */
  readonly keyUp: (testId: string, key: string) => void;
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
  /** Drops `paths` on `testId` through GPUI's file-drop hit test. */
  readonly fileDrop: (testId: string, paths: ReadonlyArray<string>) => void;
  /**
   * Drag-selects from the start of `fromTestId` to the end of `toTestId`,
   * flushing between steps as native selection requires; the selection or null.
   */
  readonly selectText: (fromTestId: string, toTestId: string) => string | null;
  /** The runtime's current selection, joined in document order, or null. */
  readonly selectedText: () => string | null;
  readonly clearSelection: () => void;
  readonly scrollOffset: (testId: string) => Offset | null;
  /** Scrolls the element `testId` into view (the renderer's own method). */
  readonly scrollIntoView: (testId: string) => void;
  /** Scrolls a `<virtual-list>` `testId` to the row at `index`. */
  readonly scrollToItem: (
    testId: string,
    index: number,
    offsetInItem?: number,
  ) => void;
  /**
   * A `<virtual-list>`'s logical anchor `[itemIndex, offsetInItemPx,
   * viewportHeightPx]`, or `null` for a non-list element.
   */
  readonly listScrollTop: (
    testId: string,
  ) => readonly [number, number, number] | null;
  readonly screenshot: (absolutePath: string) => void;
  /** Advances GPUI's dispatcher and timers. Not motion time; see `pauseMotion`. */
  readonly advance: (ms: number) => void;
  /**
   * Freezes the motion clock and returns its current time in milliseconds.
   * Animations stop interpolating until `fastForwardMotion` moves the clock.
   */
  readonly pauseMotion: () => number;
  /** Moves the frozen motion clock forward and repaints; returns the new time. */
  readonly fastForwardMotion: (ms: number) => number;
  /** Host elements the retained tree holds, reachable from the root or not. */
  readonly retainedElements: () => number | null;
  /** The process-wide syntax cache counters, or `null` when the host has none. */
  readonly syntaxCache: () => SyntaxCacheStats | null;
}

/** The process-wide syntax cache counters: `[hits, misses, documents]`. */
export class SyntaxCacheStats extends Schema.Class<SyntaxCacheStats>(
  "SyntaxCacheStats",
)({
  hits: Schema.Number,
  misses: Schema.Number,
  documents: Schema.Number,
}) {}

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
export interface SmokeContext<Host = SmokeHost> {
  readonly host: Host;
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

/**
 * A host verb the live renderer failed to answer.
 *
 * The automation protocol reports over promises, so a live run's host effects
 * can fail where the sync `TestRenderer` host cannot. `verb` names the call, so
 * a failed scenario says which input or lookup broke rather than only that the
 * check failed.
 */
export class SmokeHostError extends Schema.TaggedError<SmokeHostError>()(
  "SmokeHostError",
  {
    verb: Schema.String,
    cause: Schema.Unknown,
  },
) {}

/**
 * The verbs a **live window** can answer.
 *
 * Deliberately smaller than {@link SmokeHost}: the automation protocol exposes
 * bounds, the tree, painted text, scroll offsets, input, the clock and
 * screenshots — and no focus query, no highlight report, no list anchor and no
 * style report. The live runner owns the renderer it created, so it answers
 * what the **renderer** exposes even when the protocol does not:
 * `getFocusedElementId` (plan `190`), `getPaintedHighlights`, `scrollToItem` and
 * `getListScrollTop` (plan `197`). Colour and the accessibility dump stay with
 * the `TestRenderer` suite: `GpuixRenderer` has no style or a11y method.
 */
export interface AsyncSmokeHost {
  readonly text: (
    testId: string,
  ) => Effect.Effect<string | null, SmokeHostError>;
  readonly paintedText: () => Effect.Effect<
    ReadonlyArray<string>,
    SmokeHostError
  >;
  readonly bounds: (
    testId: string,
  ) => Effect.Effect<Bounds | null, SmokeHostError>;
  /** The `testId` of the natively focused element, or `null` when none has focus. */
  readonly focused: () => Effect.Effect<string | null, SmokeHostError>;
  /**
   * Drag-selects from the start of `fromTestId` to the end of `toTestId` and
   * returns the runtime's selection, or `null`.
   */
  readonly selectText: (
    fromTestId: string,
    toTestId: string,
  ) => Effect.Effect<string | null, SmokeHostError>;
  /** The runtime's current selection, joined in document order, or `null`. */
  readonly selectedText: () => Effect.Effect<string | null, SmokeHostError>;
  readonly clearSelection: () => Effect.Effect<void, SmokeHostError>;
  readonly click: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Clicks window coordinates.
   *
   * The automation protocol targets a locator by its centre, so a point is the
   * only way to press a surface that owns no `testId` — a modal veil, empty
   * space, or a gesture that ends outside every hitbox.
   */
  readonly clickWindow: (
    x: number,
    y: number,
  ) => Effect.Effect<void, SmokeHostError>;
  /** Right-clicks `testId`'s centre, delivering `onAuxClick` with `isRightClick`. */
  readonly rightClick: (testId: string) => Effect.Effect<void, SmokeHostError>;
  readonly hover: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /** Waits until `testId` exists — a mount or a re-render can lag the input. */
  readonly waitFor: (testId: string) => Effect.Effect<void, SmokeHostError>;
  readonly key: (keystroke: string) => Effect.Effect<void, SmokeHostError>;
  readonly keyDown: (
    testId: string,
    key: string,
  ) => Effect.Effect<void, SmokeHostError>;
  readonly keyUp: (
    testId: string,
    key: string,
  ) => Effect.Effect<void, SmokeHostError>;
  readonly wheel: (
    testId: string,
    deltaX: number,
    deltaY: number,
  ) => Effect.Effect<void, SmokeHostError>;
  readonly drag: (
    testId: string,
    deltaX: number,
    deltaY: number,
    steps?: number,
  ) => Effect.Effect<void, SmokeHostError>;
  readonly scrollOffset: (
    testId: string,
  ) => Effect.Effect<Offset | null, SmokeHostError>;
  /** Every highlight wash the last frame painted, decoded at the adapter. */
  readonly highlights: () => Effect.Effect<
    ReadonlyArray<HighlightMatch>,
    SmokeHostError
  >;
  /** Scrolls a `<virtual-list>` `testId` to the row at `index`. */
  readonly scrollToItem: (
    testId: string,
    index: number,
    offsetInItem?: number,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * A `<virtual-list>`'s logical anchor `[itemIndex, offsetInItemPx,
   * viewportHeightPx]`, or `null` for a non-list element.
   */
  readonly listScrollTop: (
    testId: string,
  ) => Effect.Effect<ListAnchor | null, SmokeHostError>;
  readonly screenshot: (path: string) => Effect.Effect<void, SmokeHostError>;
  readonly pauseMotion: () => Effect.Effect<number, SmokeHostError>;
  readonly fastForwardMotion: (
    ms: number,
  ) => Effect.Effect<number, SmokeHostError>;
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

/** One asynchronous scenario: the live twin of {@link SmokeScenario}. */
export interface AsyncSmokeScenario {
  readonly id: string;
  readonly title: string;
  readonly capability: Capability;
  readonly steps: (
    ctx: SmokeContext<AsyncSmokeHost>,
  ) => Effect.Effect<void, SmokeAssertionError | SmokeHostError>;
}

/** What both runners need from a scenario, independent of the host's shape. */
interface ScenarioShape<Host> {
  readonly id: string;
  readonly title: string;
  readonly capability: Capability;
  readonly steps: (
    ctx: SmokeContext<Host>,
  ) => Effect.Effect<void, SmokeAssertionError | SmokeHostError>;
}

/** The mount seam both runners share: called once, before the steps. */
type Mount = (scenario: {
  readonly id: string;
}) => Effect.Effect<void, SmokeHostError>;

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

const context = <Host>(host: Host, checks: CheckSink): SmokeContext<Host> => ({
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

/** A host verb that could not answer is a harness failure, not a failed check. */
const hostErrored = (
  checks: CheckSink,
  error: SmokeHostError,
): Effect.Effect<void> =>
  Ref.update(checks, (previous) =>
    Arr.append(
      previous,
      new CheckResult({
        label: `host ${error.verb}`,
        outcome: new Errored({ detail: Cause.pretty(Cause.fail(error)) }),
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

const runScenario = <Host>(
  host: Host,
  scenario: ScenarioShape<Host>,
  mount: Option.Option<Mount>,
): Effect.Effect<ScenarioResult> =>
  Effect.gen(function* () {
    const checks = yield* Ref.make<ReadonlyArray<CheckResult>>([]);
    const startedAt = yield* Clock.currentTimeMillis;
    yield* Option.match(mount, {
      onNone: () => Effect.void,
      onSome: (before) => before(scenario),
    }).pipe(
      Effect.flatMap(() => scenario.steps(context(host, checks))),
      Effect.catchTags({
        SmokeAssertionError: (error) => failed(checks, error),
        SmokeHostError: (error) => hostErrored(checks, error),
      }),
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
  beforeEach?: Mount,
): Effect.Effect<SmokeReport> => runSuite(host, scenarios, meta, beforeEach);

/**
 * Runs an async scenario set and aggregates the **same** report.
 *
 * A live renderer answers over a promise API, so its host verbs are effects.
 * The report, the check model and the exit code are shared with
 * {@link runScenarios}, which is what makes a real-window run citable evidence
 * rather than a second, differently-shaped log.
 */
export const runAsyncScenarios = (
  host: AsyncSmokeHost,
  scenarios: ReadonlyArray<AsyncSmokeScenario>,
  meta: { readonly host: string; readonly startedAt: number },
  beforeEach?: Mount,
): Effect.Effect<SmokeReport> => runSuite(host, scenarios, meta, beforeEach);

const runSuite = <Host>(
  host: Host,
  scenarios: ReadonlyArray<ScenarioShape<Host>>,
  meta: { readonly host: string; readonly startedAt: number },
  beforeEach: Mount | undefined,
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
