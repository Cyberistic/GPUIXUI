/**
 * The platform-free half of the native smoke suite: the check model, the
 * scenario runner and the capability verdict.
 *
 * The native half (`apps/playground`) adapts a real GPUix renderer to
 * `SmokeHost`. This module never imports `@gpuix/*`, so its own tests run on any
 * host — including one where the binding does not exist.
 */
import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as HashSet from "effect/HashSet";
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
  "search",
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

/** A window's paintable size read back from the runtime. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A scroll offset read back from the runtime. */
export interface Offset {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a `<virtual-list>` is anchored, in logical rows.
 *
 * Pixel offsets lie while a list's row heights are still estimates, and an
 * unbuilt row has no element to read bounds from, so a reveal is checked by the
 * index the renderer anchored at. `itemIndex` equals the row count at the end
 * sentinel.
 */
export interface ListAnchor {
  readonly itemIndex: number;
  readonly offsetInItem: number;
  readonly viewportHeight: number;
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
 * One node's accessibility description, as GPUI's debug dump reports it.
 *
 * Every field is optional because the platform describes what it can: a role
 * always comes with an `aria` record, while `value`, `selected` and `on_action`
 * appear only for the nodes that have them. The wire names (`author_id`,
 * `on_action`) are kept as the platform spells them.
 */
export class A11yNode extends Schema.Class<A11yNode>("A11yNode")({
  role: Schema.OptionFromOptionalKey(Schema.String),
  label: Schema.OptionFromOptionalKey(Schema.String),
  description: Schema.OptionFromOptionalKey(Schema.String),
  value: Schema.OptionFromOptionalKey(Schema.String),
  author_id: Schema.OptionFromOptionalKey(Schema.String),
  expanded: Schema.OptionFromOptionalKey(Schema.Boolean),
  selected: Schema.OptionFromOptionalKey(Schema.Boolean),
  level: Schema.OptionFromOptionalKey(Schema.Number),
  on_action: Schema.OptionFromOptionalKey(Schema.Array(Schema.String)),
}) {}

/**
 * A painted frame's accessibility tree.
 *
 * `nodes` is flattened on purpose: the dump keys nodes by an ephemeral letter
 * (`a`, `b`, …), which the platform documents as meaningless, so a scenario
 * selects by role rather than by key.
 */
export class A11yTree extends Schema.Class<A11yTree>("A11yTree")({
  root: Schema.OptionFromOptionalKey(Schema.String),
  nodes: Schema.Array(A11yNode),
}) {}

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
   * The renderer's accessibility dump from the last painted frame.
   *
   * The only channel that sees a `role` or an `aria-*` attribute: those never
   * appear in `paintedText`, and a component's claim that assistive technology
   * can read it is otherwise untestable. A window's automation protocol exposes
   * no equivalent, so this is a `TestRenderer` fact.
   */
  readonly a11yTree: () => A11yTree | null;
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

/** A modifier a pointer press can hold, as the automation protocol spells it. */
export type PointerModifier = "cmd" | "ctrl" | "alt" | "shift";

/**
 * The order a chord is written in, so one press has one spelling.
 *
 * `cmd-shift` is how the repository writes a chord and how the protocol's
 * `press()` syntax reads it; in argument order, `["shift", "cmd"]` would be a
 * second name for the same press and a probe's expectation would depend on it.
 */
const POINTER_MODIFIER_ORDER: ReadonlyArray<PointerModifier> = [
  "cmd",
  "ctrl",
  "alt",
  "shift",
];

/**
 * The protocol's spelling of a held set of modifiers.
 *
 * `[]` is the empty string, which parses as no modifiers — the press a plain
 * `click` sends. Repeats collapse and an unknown argument order is normalised,
 * so two spellings of one chord cannot reach the window.
 */
export const formatModifiers = (
  modifiers: ReadonlyArray<PointerModifier>,
): string =>
  pipe(
    POINTER_MODIFIER_ORDER,
    Arr.filter((modifier) => Arr.contains(modifiers, modifier)),
    Arr.join("-"),
  );

/**
 * Where a drag starts, in pixels from the target element's painted centre.
 *
 * A locator presses the element's centre, which is what every element-space
 * gesture wants. A surface the **runtime** paints inside an element — a
 * scrollbar thumb on a scroller's trailing edge — is not a node a probe can
 * name, so its drag has to be aimed from the element that carries it.
 */
export interface DragStart {
  readonly x: number;
  readonly y: number;
}

/** {@link AsyncSmokeHost.drag}'s options. */
export interface AsyncDragOptions {
  /** Where the press lands, from the element's centre. Default: the centre. */
  readonly offset?: DragStart;
  /** Move events between the press and the release. Default: the protocol's 8. */
  readonly steps?: number;
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
  /**
   * The window's paintable size in logical pixels.
   *
   * The renderer used to answer a hardcoded 800x600 here, so a probe that
   * measures a layout against the window reads the number instead of assuming
   * it. `useWindowSize()` samples the same call every 100ms, so a probe can
   * hold the app's channel and the renderer's to each other.
   */
  readonly windowSize: () => Effect.Effect<Size, SmokeHostError>;
  /**
   * Runs the platform's zoom action, the one lever a window exposes.
   *
   * The binding publishes no `setSize`, so a probe that needs the app laid out
   * in a different window asks the platform rather than the renderer.
   */
  readonly zoomWindow: () => Effect.Effect<void, SmokeHostError>;
  /**
   * Brings the window to the front and makes it the application's active window.
   *
   * GPUI dispatches element focus listeners only for an **active** window (its
   * `rendered_frame.window_active`), so a probe that measures `onFocus`/`onBlur`
   * has to activate the window it opened — a window opened in the background
   * delivers no focus event at all. Optional because it is a platform verb; the
   * offscreen host has no window to activate.
   */
  readonly activateWindow?: () => Effect.Effect<void, SmokeHostError>;
  readonly focused: () => Effect.Effect<string | null, SmokeHostError>;
  readonly click: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Presses `testId` with the **right** button.
   *
   * A context menu is opened by the runtime's aux click, which a primary press
   * cannot produce: `onAuxClick` carries `isRightClick` and the pointer point,
   * and a left click delivers neither. The automation protocol's locator takes
   * the button, so this is the same hit-tested path a pointer takes.
   */
  readonly rightClick: (testId: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Presses `testId` while holding `modifiers`.
   *
   * A desktop list selects by chord — `shift` extends from the anchor, `cmd`
   * toggles one record, `cmd-shift` adds the range — and the runtime reports
   * the held set on the click event, so a probe that only presses plainly can
   * measure none of it. The protocol's locator takes the modifier string, so
   * this is the same hit-tested press a chord makes; `formatModifiers` is the
   * one spelling of it.
   */
  readonly clickWith: (
    testId: string,
    modifiers: ReadonlyArray<PointerModifier>,
  ) => Effect.Effect<void, SmokeHostError>;
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
   * is a genuine pointer drag, not a synthesised down/move/up. The runtime
   * captures the pointer on left mouse down **only** for an element that
   * listens to both `mouseDown` and `mouseMove`, so a drag handle keeps its
   * moves after the pointer leaves its box while a move-only element does not —
   * the `pointer-capture` probe measures both cases.
   *
   * `options.offset` moves the press away from the element's centre: a
   * scrollbar thumb is painted by the runtime on a scroller's own edge, so the
   * scroller is the element and the thumb is a place inside it.
   */
  readonly drag: (
    testId: string,
    deltaX: number,
    deltaY: number,
    options?: AsyncDragOptions,
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
  /**
   * Scrolls a `<virtual-list>` to a logical row index.
   *
   * The path a file tree needs to reveal a deep path: once thousands of rows are
   * flattened, pixel arithmetic is wrong the moment a row's height is estimated,
   * and a row outside the window is not mounted, so it has no bounds to
   * `scrollIntoView`. `offsetInItem` is in pixels and may be negative, which
   * anchors the viewport above the row.
   */
  readonly scrollToItem: (
    testId: string,
    index: number,
    offsetInItem?: number,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * The logical row a `<virtual-list>` is anchored at, or `null` for anything
   * else — so a probe can prove a plain scroller is not a list instead of
   * reading index 0 for both.
   */
  readonly listAnchor: (
    testId: string,
  ) => Effect.Effect<ListAnchor | null, SmokeHostError>;
  readonly key: (keystroke: string) => Effect.Effect<void, SmokeHostError>;
  /**
   * Sends a key **down** with the platform's repeat flag.
   *
   * `key(keystroke)` drives the automation protocol's input pipeline, and the
   * payload it produces carries no repeat state. A held key is delivered as
   * repeated key-down events with `isHeld: true`, and every activating control
   * in the library refuses an activation for one (`decideActivation`), so the
   * flag is the difference between a guard that works and a held Enter firing
   * an action repeatedly. Optional because only a window's protocol carries it;
   * a synchronous host has no repeat to synthesise.
   */
  readonly keyDown?: (
    keystroke: string,
    isHeld: boolean,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * The text the window currently has selected, or `null` for no selection.
   *
   * A window reports selection from its renderer (`getSelectedText`), which is
   * the only way to tell a drag that selected from a drag that hit the element:
   * the painted text is the same either way.
   */
  readonly selectedText: () => Effect.Effect<string | null, SmokeHostError>;
  /** Drops the window's selection, so a probe can prove an element selects nothing. */
  readonly clearSelection: () => Effect.Effect<void, SmokeHostError>;
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
   * Clears the window's focus (`renderer.blur`), leaving nothing focused.
   *
   * A component that commits on blur is only correct if the drawer closing or
   * the app clearing its focus runs the handler, so a probe needs the lever the
   * runtime's own components use. Optional because it is a renderer verb: a
   * synchronous host has no window to blur.
   */
  readonly blur?: () => Effect.Effect<void, SmokeHostError>;
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
  /**
   * Freezes the renderer's motion clock and answers the frozen instant.
   *
   * A hosted surface whose whole claim is a tween cannot be measured against
   * wall time: a paint on a software renderer can block longer than the tween,
   * so a "read at 107 ms" races the frame it names. The renderer's automation
   * surface exposes the clock the motion states are computed from, so a probe
   * can freeze it, advance it by an exact number of milliseconds and capture the
   * frame at that progress. Optional because only a window has one.
   */
  readonly clockPause?: () => Effect.Effect<number, SmokeHostError>;
  /** Advances a frozen motion clock by `deltaMs`; see {@link clockPause}. */
  readonly clockFastForward?: (
    deltaMs: number,
  ) => Effect.Effect<number, SmokeHostError>;
  /** Returns the motion clock to live time; see {@link clockPause}. */
  readonly clockResume?: () => Effect.Effect<number, SmokeHostError>;
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

/**
 * How many probes a registry declares for a capability — the scope a run
 * selected out of.
 *
 * A `--only` run is evidence for the probes it ran and nothing else, so the
 * verdict needs the registry's own count: without it, one passing probe reports
 * its whole capability `verified`. A probe is its id, so two registry entries
 * naming one id declare one probe, not two.
 */
export interface Coverage {
  readonly capability: Capability;
  readonly declared: number;
}

/** The distinct ids in `entries`, one per probe however often it is listed. */
const idsOf = (
  entries: ReadonlyArray<{ readonly id: string }>,
): HashSet.HashSet<string> =>
  HashSet.fromIterable(Arr.map(entries, (e) => e.id));

/** The scope `registry` declares, one entry per capability it covers. */
export const coverageOf = (
  registry: ReadonlyArray<{
    readonly capability: Capability;
    readonly id: string;
  }>,
): ReadonlyArray<Coverage> =>
  Arr.getSomes(
    Arr.map(CAPABILITIES, (capability) => {
      const declared = HashSet.size(
        idsOf(Arr.filter(registry, (entry) => entry.capability === capability)),
      );
      return declared === 0
        ? Option.none<Coverage>()
        : Option.some<Coverage>({ capability, declared });
    }),
  );

/**
 * The verdict per capability: `verified` only when every probe the registry
 * declares for it ran and passed.
 *
 * Only capabilities the run touched get a line — the report speaks about the
 * run, never about the registry — but the declaration is what lets a **scoped**
 * run withhold `verified`: a `--only` run that sampled one probe reports
 * `unverified`, because the other probes covering it did not run. Probes are
 * compared by id, so repeating one cannot stand in for another. Without a
 * declaration the verdict can only be drawn from the scenarios handed over,
 * which is the documented fallback for a caller that owns its whole list.
 */
export const capabilityStatuses = (
  results: ReadonlyArray<ScenarioResult>,
  coverage: Option.Option<ReadonlyArray<Coverage>> = Option.none(),
): ReadonlyArray<CapabilityResult> =>
  Arr.getSomes(
    Arr.map(CAPABILITIES, (capability) => {
      const ran = Arr.filter(
        results,
        (result) => result.capability === capability,
      );
      if (Arr.length(ran) === 0) return Option.none<CapabilityResult>();
      const declared = Option.flatMap(coverage, (entries) =>
        Option.map(
          Arr.findFirst(entries, (entry) => entry.capability === capability),
          (entry) => entry.declared,
        ),
      );
      return Option.some(
        new CapabilityResult({
          capability,
          status: Arr.some(ran, (result) => !scenarioPassed(result))
            ? "failed"
            : Option.match(declared, {
                onNone: () => "verified",
                onSome: (count) =>
                  HashSet.size(idsOf(ran)) === count
                    ? "verified"
                    : "unverified",
              }),
        }),
      );
    }),
  );

/** The metadata every run records. */
export interface RunMeta {
  readonly host: string;
  readonly startedAt: number;
  /**
   * The registry the caller selected out of, so a scoped run cannot report a
   * capability it never covered as `verified`. Omit it only when the scenario
   * list *is* the caller's whole registry.
   */
  readonly coverage?: ReadonlyArray<Coverage>;
}

/** Aggregates scenario results into the report both runners emit. */
const reportOf = (
  results: ReadonlyArray<ScenarioResult>,
  meta: RunMeta,
): Effect.Effect<SmokeReport> =>
  Effect.gen(function* () {
    const endedAt = yield* Clock.currentTimeMillis;
    return new SmokeReport({
      host: meta.host,
      startedAt: meta.startedAt,
      durationMs: endedAt - meta.startedAt,
      scenarios: results,
      capabilities: capabilityStatuses(
        results,
        Option.fromNullishOr(meta.coverage),
      ),
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
  meta: RunMeta,
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
  meta: RunMeta,
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
