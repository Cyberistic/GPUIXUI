/**
 * The event payload and handler set (plan 635).
 *
 * Every component page shows `onClick`, `onKeyDown`, `onScroll` and
 * `onFileDrop` in its generated host-props table, and the runtime sends one
 * `EventPayload` object to all of them. The site had no owner for that object:
 * measured 2026-10-21, `event payload` reached a Separator limitation,
 * `click count` reached Countdown, `deltaY` reached Auto-update, and
 * `onWindowKeyDown` and `stopPropagation` returned nothing.
 *
 * The rows are authored; the names, types and event-type strings are not. The
 * page renders them, and `events.test.ts` re-derives every one from the
 * installed `@gpuix/native` declarations and dispatcher in both directions, so
 * a runtime upgrade fails by name instead of leaving the page guessing.
 */
import { interfaceFieldsIn } from "./native-elements";

export interface EventHandlerRow {
  /** The React host prop, as `HostProps` declares it. */
  readonly name: string;
  /** The runtime's event-type string, as `EVENT_PROPS` maps it. */
  readonly eventType: string;
  /** The element the handler belongs to. */
  readonly firesOn: string;
  /** The payload fields this event adds, beyond `elementId`/`eventType`. */
  readonly carries: string;
  readonly summary: string;
}

/** Every `on*` host prop `@gpuix/native@0.10.0` declares, in declaration order. */
export const eventHandlers: ReadonlyArray<EventHandlerRow> = [
  {
    name: "onToggleFile",
    eventType: "toggleFile",
    firesOn: "`<diff>` file header",
    carries: "value",
    summary: "A file header was pressed. `value` is the file path.",
  },
  {
    name: "onShowMore",
    eventType: "showMore",
    firesOn: "`<diff>` Show more row",
    carries: "value",
    summary:
      "The hidden-line row was pressed. `value` is the hidden line count.",
  },
  {
    name: "onLineClick",
    eventType: "lineClick",
    firesOn: "`<diff>` line",
    carries: "value, oldLine, newLine",
    summary:
      "A diff line was pressed. `value` is its text; `oldLine`/`newLine` are the line numbers on each side.",
  },
  {
    name: "onLinkClick",
    eventType: "linkClick",
    firesOn: "`<markdown>` link",
    carries: "value",
    summary: "A rendered link was pressed. `value` is the URL.",
  },
  {
    name: "onVisibleRange",
    eventType: "visibleRange",
    firesOn: "`<virtual-list>`",
    carries: "startIndex, endIndex",
    summary:
      "The painted window changed. `startIndex` is the first visible logical index and `endIndex` is exclusive.",
  },
  {
    name: "onHighlight",
    eventType: "highlight",
    firesOn: "Element with a `highlight` prop",
    carries: "matchCount",
    summary:
      "The match count changed. `matchCount` counts every retained match once, on screen or not.",
  },
  {
    name: "onMotionComplete",
    eventType: "motionComplete",
    firesOn: "Element with a `motion` track",
    carries: "motionGeneration",
    summary:
      "A native motion track reached its current target. `motionGeneration` identifies the target.",
  },
  {
    name: "onChange",
    eventType: "change",
    firesOn: "`<input>` and `<textarea>`",
    carries: "value",
    summary:
      "The native edit was committed. `value` is the field's text; `Input` reads exactly this field.",
  },
  {
    name: "onSubmit",
    eventType: "submit",
    firesOn: "`<input>`, and `<textarea>` when set",
    carries: "—",
    summary:
      "Enter was pressed. A textarea accepts it only because the runtime trades its newline for the submit.",
  },
  {
    name: "onClick",
    eventType: "click",
    firesOn: "Every host element",
    carries: "x, y, button, clickCount, isRightClick",
    summary:
      "Primary-button activation. A middle or right press arrives on `onAuxClick`, not here.",
  },
  {
    name: "onAuxClick",
    eventType: "auxClick",
    firesOn: "Every host element",
    carries: "x, y, button, clickCount, isRightClick",
    summary:
      "The non-primary click, like the DOM's `auxclick`. `button` and `isRightClick` say which.",
  },
  {
    name: "onMouseDown",
    eventType: "mouseDown",
    firesOn: "Every host element",
    carries: "x, y, button, clickCount, isRightClick",
    summary: "A mouse button went down over the element.",
  },
  {
    name: "onMouseUp",
    eventType: "mouseUp",
    firesOn: "Every host element",
    carries: "x, y, button, clickCount, isRightClick",
    summary: "A mouse button came up over the element.",
  },
  {
    name: "onMouseEnter",
    eventType: "mouseEnter",
    firesOn: "Every host element",
    carries: "x, y, hovered",
    summary: "The pointer entered the element. `hovered` is `true`.",
  },
  {
    name: "onMouseLeave",
    eventType: "mouseLeave",
    firesOn: "Every host element",
    carries: "x, y, hovered",
    summary: "The pointer left the element. `hovered` is `false`.",
  },
  {
    name: "onMouseMove",
    eventType: "mouseMove",
    firesOn: "Every host element",
    carries: "x, y, pressedButton",
    summary:
      "The pointer moved. `pressedButton` is the button held during the move, if any.",
  },
  {
    name: "onMouseDownOutside",
    eventType: "mouseDownOutside",
    firesOn: "Every host element",
    carries: "x, y, button",
    summary:
      "A press landed outside the element. This is the signal a dismissable surface listens to.",
  },
  {
    name: "onKeyDown",
    eventType: "keyDown",
    firesOn: "Focused element",
    carries: "key, keyChar, isHeld, modifiers",
    summary:
      "A key went down on the focused element. `isHeld` marks the repeats of a held key.",
  },
  {
    name: "onKeyUp",
    eventType: "keyUp",
    firesOn: "Focused element",
    carries: "key, keyChar, modifiers",
    summary: "A key came up on the focused element.",
  },
  {
    name: "onFocus",
    eventType: "focus",
    firesOn: "Focusable element",
    carries: "—",
    summary:
      "Native focus reached the element. `autoFocus` sets focus without dispatching this.",
  },
  {
    name: "onBlur",
    eventType: "blur",
    firesOn: "Focusable element",
    carries: "—",
    summary: "Native focus left the element.",
  },
  {
    name: "onScroll",
    eventType: "scroll",
    firesOn: "Scroll container",
    carries: "deltaX, deltaY, precise, touchPhase, modifiers",
    summary:
      "A wheel or trackpad gesture scrolled the container. The deltas are the whole event — there is no `onWheel`.",
  },
  {
    name: "onFileDrop",
    eventType: "fileDrop",
    firesOn: "Every host element",
    carries: "paths",
    summary:
      "A Finder or OS file drop landed on the element. `paths` holds absolute filesystem paths.",
  },
];

export interface EventFieldRow {
  readonly name: string;
  readonly type: string;
  readonly populatedFor: string;
  readonly summary: string;
}

export interface EventFieldGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: ReadonlyArray<EventFieldRow>;
}

/**
 * Every field of the installed `EventPayload`, grouped by input family. The
 * groups together hold each field exactly once; `events.test.ts` fails on a
 * missing or duplicated name.
 */
export const eventPayloadGroups: ReadonlyArray<EventFieldGroup> = [
  {
    id: "every",
    title: "Every event",
    note: "Present on every payload. The runtime names the element it dispatched to; the React registry then calls that element's handler for the event type.",
    rows: [
      {
        name: "elementId",
        type: "number",
        populatedFor: "Every event",
        summary:
          "The runtime's numeric element id, assigned when React created the element. It is not a locator: use `testId` to find an element from a test.",
      },
      {
        name: "eventType",
        type: "string",
        populatedFor: "Every event",
        summary:
          "The runtime's event-type string, which is not the React prop name: `onClick` receives `click`, `onKeyDown` receives `keyDown`.",
      },
    ],
  },
  {
    id: "pointer",
    title: "Pointer",
    note: "Mouse coordinates and button state. There are no pointer, touch or stylus events; Accessibility records that absence.",
    rows: [
      {
        name: "x",
        type: "number",
        populatedFor: "Pointer events",
        summary: "Mouse position in window coordinates, in pixels.",
      },
      {
        name: "y",
        type: "number",
        populatedFor: "Pointer events",
        summary: "Mouse position in window coordinates, in pixels.",
      },
      {
        name: "button",
        type: "number",
        populatedFor: "mouseDown, mouseUp, click, auxClick, mouseDownOutside",
        summary: "The button involved: `0` left, `1` middle, `2` right.",
      },
      {
        name: "clickCount",
        type: "number",
        populatedFor: "mouseDown, mouseUp, click, auxClick",
        summary:
          "Consecutive clicks: `1` single, `2` double, `3` triple. There is no separate double-click handler.",
      },
      {
        name: "isRightClick",
        type: "boolean",
        populatedFor: "click, auxClick, mouseDown, mouseUp",
        summary:
          "`true` when the press was the right button. A convenience over `button === 2`.",
      },
      {
        name: "pressedButton",
        type: "number",
        populatedFor: "mouseMove",
        summary:
          "The button currently held during a move, with the same `0`/`1`/`2` encoding. Absent when no button is down.",
      },
      {
        name: "hovered",
        type: "boolean",
        populatedFor: "mouseEnter, mouseLeave",
        summary: "`true` on enter and `false` on leave.",
      },
    ],
  },
  {
    id: "keyboard",
    title: "Keyboard",
    note: "Key names, the produced character and the modifier state. The library's shared key decisions are on Component API.",
    rows: [
      {
        name: "key",
        type: "string",
        populatedFor: "keyDown, keyUp",
        summary:
          'The GPUI key name: `"enter"`, `"escape"`, `"a"`, `"down"`, `"f1"`.',
      },
      {
        name: "keyChar",
        type: "string",
        populatedFor: "keyDown, keyUp",
        summary:
          "The character the press produced. It can differ from `key` when a modifier is held.",
      },
      {
        name: "isHeld",
        type: "boolean",
        populatedFor: "keyDown",
        summary:
          "`true` when this is a repeat of a held key, not the first press.",
      },
      {
        name: "modifiers",
        type: "EventModifiers",
        populatedFor: "Keyboard and scroll events",
        summary:
          'The four modifier booleans rendered in the next table. Read `modifiers.shift` for a shift-click; the driver\'s `"cmd-shift"` string is a different spelling.',
      },
    ],
  },
  {
    id: "scroll",
    title: "Scroll",
    note: "A wheel or trackpad gesture arrives as `onScroll` on the scroll container, not as a wheel handler.",
    rows: [
      {
        name: "deltaX",
        type: "number",
        populatedFor: "scroll",
        summary:
          "Horizontal delta, in pixels when `precise` is true and lines when it is false.",
      },
      {
        name: "deltaY",
        type: "number",
        populatedFor: "scroll",
        summary:
          "Vertical delta. The sign is GPUI's: a negative `deltaY` scrolls down, the opposite of the DOM.",
      },
      {
        name: "precise",
        type: "boolean",
        populatedFor: "scroll",
        summary:
          "`true` for pixel-precise trackpad input, `false` for a line-based mouse wheel.",
      },
      {
        name: "touchPhase",
        type: "string",
        populatedFor: "scroll from a trackpad gesture",
        summary: 'The gesture phase: `"started"`, `"moved"` or `"ended"`.',
      },
    ],
  },
  {
    id: "element",
    title: "Element-defined values",
    note: "These fields only mean something for the element that emits them. Native elements renders the element catalogue.",
    rows: [
      {
        name: "value",
        type: "string",
        populatedFor:
          "change, diff (toggleFile/showMore/lineClick), markdown linkClick, selectionChange",
        summary:
          "A string payload whose meaning belongs to the element: the input's text, the diff file path, hidden line count or line text, the link URL, or the joined selected text.",
      },
      {
        name: "oldLine",
        type: "number",
        populatedFor: "`<diff>` lineClick",
        summary: "The line number on the pre-change side.",
      },
      {
        name: "newLine",
        type: "number",
        populatedFor: "`<diff>` lineClick",
        summary: "The line number on the post-change side.",
      },
      {
        name: "startIndex",
        type: "number",
        populatedFor: "`<virtual-list>` visibleRange",
        summary: "The first visible logical row index.",
      },
      {
        name: "endIndex",
        type: "number",
        populatedFor: "`<virtual-list>` visibleRange",
        summary: "The exclusive end of the visible logical range.",
      },
      {
        name: "matchCount",
        type: "number",
        populatedFor: "highlight",
        summary:
          "Every retained match for the element's `highlight`, counted once even when a match is split across painted runs.",
      },
      {
        name: "motionGeneration",
        type: "number",
        populatedFor: "motionComplete",
        summary: "The logical native motion target that completed.",
      },
      {
        name: "paths",
        type: "string[]",
        populatedFor: "fileDrop",
        summary: "Absolute filesystem paths from a Finder or OS file drop.",
      },
    ],
  },
];

/** The declared fields of `EventModifiers`, in declaration order. */
export interface EventModifierRow {
  readonly name: string;
  readonly summary: string;
}

export const eventModifiers: ReadonlyArray<EventModifierRow> = [
  { name: "shift", summary: "Shift is held." },
  { name: "ctrl", summary: "Control is held." },
  { name: "alt", summary: "Alt or Option is held." },
  { name: "cmd", summary: "The command modifier is held." },
];

export interface WindowEventRow {
  readonly name: string;
  readonly signature: string;
  readonly summary: string;
}

/**
 * The handlers that are render options, not host props. `WindowKeyEventHandlers`
 * declares the first three; `RootEventHandlers` adds the every-event tap.
 */
export const windowEventHandlers: ReadonlyArray<WindowEventRow> = [
  {
    name: "onKeyDown",
    signature: "(event: EventPayload, renderer: NativeRenderer) => void",
    summary:
      'Window-level key down. Delivered as `eventType: "keyDown"` with `elementId: 0`; a key action can consume the event before the handler runs.',
  },
  {
    name: "onKeyUp",
    signature: "(event: EventPayload, renderer: NativeRenderer) => void",
    summary:
      'Window-level key up, delivered as `eventType: "keyUp"` with `elementId: 0`.',
  },
  {
    name: "onSelectionChange",
    signature: "(event: EventPayload, renderer: NativeRenderer) => void",
    summary:
      "The window's text selection changed. `elementId` is `0`; `value` is the joined selected text, absent when the selection is empty.",
  },
  {
    name: "onEvent",
    signature: "(event: EventPayload) => void",
    summary:
      "Every dispatched event, element and window alike, with its original payload. Use it for instrumentation; it does not replace a handler.",
  },
];

export interface EventAbsence {
  readonly subject: string;
  readonly statement: string;
}

/** What the payload and the registry do not carry, each with its substitute. */
export const eventAbsences: ReadonlyArray<EventAbsence> = [
  {
    subject: "target / currentTarget",
    statement:
      "The payload names one numeric `elementId`; there is no DOM node to read. Read the field you need from the event, or keep the data in the handler's closure.",
  },
  {
    subject: "preventDefault / defaultPrevented",
    statement:
      "The runtime has no cancel channel, so the payload cannot carry one. Component API's Keyboard section owns the consequence and the substitute.",
  },
  {
    subject: "stopPropagation",
    statement:
      "There is no propagation control. The React registry stores one handler per element id and event type and the native side reports the hit element, so keep an interaction on one element and lift its result through state.",
  },
  {
    subject: "onWindowKeyDown / onWindowKeyUp props",
    statement:
      "Window keys are the render options `onKeyDown` and `onKeyUp`, not host props with a window prefix. Their payload arrives with `elementId: 0`.",
  },
  {
    subject: "A capture or bubble phase",
    statement:
      "Neither the payload nor the registry declares one. Do not build a parent handler that assumes it sees a child's event; pass a callback to the child instead.",
  },
  {
    subject: "An event timestamp",
    statement:
      "The payload has no time. Read `Clock.currentTimeMillis` where the handler needs a time, or measure around the interaction.",
  },
  {
    subject: "onDoubleClick",
    statement:
      "A double click is `onClick` with `clickCount === 2`; a triple click is `3`. There is no separate handler to register.",
  },
  {
    subject: "onContextMenu",
    statement:
      "A right press arrives on `onAuxClick` (and `onMouseDown`) with `isRightClick`. Context menu owns the component built on it.",
  },
  {
    subject: "onWheel",
    statement:
      "Wheel and trackpad input arrives as `onScroll` deltas on a scroll container. Scrollable containers owns the component; Automation owns the driver's `wheel`.",
  },
  {
    subject: "Touch, pointer and stylus events",
    statement:
      "There is no `onTouch*`, `onPointer*` or stylus handler. Accessibility owns the absence and what a host application must do instead.",
  },
  {
    subject: "Drag-and-drop events",
    statement:
      "There is no `onDragStart`, `onDragOver` or `onDrop`; only an OS file drop arrives, as `onFileDrop` with `paths`.",
  },
  {
    subject: "Clipboard events",
    statement:
      "No copy, cut or paste event is declared. Selection and find records the clipboard absence and the native selection API the runtime does provide.",
  },
  {
    subject: "Window resize, move, close or focus events",
    statement:
      "The event stream carries window keys and selection only. Window owns the size and inset observers (`useWindowSize`, `useWindowInsets`) and the window actions.",
  },
];

/** Every payload field the groups document, in group order. */
export const eventPayloadFieldNames: ReadonlyArray<string> =
  eventPayloadGroups.flatMap((group) => group.rows.map((row) => row.name));

/** Handler rows as `[prop, eventType]` pairs, the shape `EVENT_PROPS` uses. */
export const eventHandlerPairs: ReadonlyArray<readonly [string, string]> =
  eventHandlers.map((row) => [row.name, row.eventType] as const);

const FORBIDDEN_PAYLOAD_FIELDS: ReadonlyArray<string> = [
  "target",
  "currentTarget",
  "preventDefault",
  "defaultPrevented",
  "stopPropagation",
  "timestamp",
];

/** Handler names the runtime does not declare, which the absences promise. */
const FORBIDDEN_HOST_PROPS: ReadonlyArray<RegExp> = [
  /^onTouch/u,
  /^onPointer/u,
  /^onDrag/u,
  /^onWheel/u,
  /^onDoubleClick/u,
  /^onContextMenu/u,
  /^onCopy/u,
  /^onCut/u,
  /^onPaste/u,
  /^onResize/u,
];

const EVENT_PROP_PAIR = /readonly \["(on[A-Za-z]+)", "([A-Za-z]+)"\]/gu;

/** The `[prop, eventType]` tuples `EVENT_PROPS` declares. */
export const eventPropPairsIn = (
  mutationDeclarations: string,
): ReadonlyArray<readonly [string, string]> =>
  [...mutationDeclarations.matchAll(EVENT_PROP_PAIR)].map(
    (match) => [match[1] ?? "", match[2] ?? ""] as const,
  );

export interface EventSurfaceInput {
  /** The installed native `index.d.ts`. */
  readonly declarations: string;
  /** The installed `dist/host.d.ts`. */
  readonly hostDeclarations: string;
  /** The installed `dist/mutations.d.ts`, which declares `EVENT_PROPS`. */
  readonly mutationDeclarations: string;
  /** The installed `dist/renderer-state.js`, whose window rewrite the page quotes. */
  readonly dispatcher: string;
}

/**
 * Every claim the page makes about the runtime, checked against the installed
 * declarations. An empty array means the page and the runtime agree; each
 * message names the member that drifted.
 */
export const eventSurfaceViolations = ({
  declarations,
  hostDeclarations,
  mutationDeclarations,
  dispatcher,
}: EventSurfaceInput): ReadonlyArray<string> => {
  const payloadFields = interfaceFieldsIn(declarations, "EventPayload");
  const modifierFields = interfaceFieldsIn(declarations, "EventModifiers");
  const hostHandlers = interfaceFieldsIn(hostDeclarations, "HostProps").filter(
    (name) => name.startsWith("on"),
  );
  const windowHandlers = interfaceFieldsIn(
    hostDeclarations,
    "WindowKeyEventHandlers",
  );
  const tuples = eventPropPairsIn(mutationDeclarations);
  const documentedPairs = eventHandlerPairs.map(
    ([name, eventType]) => `${name}:${eventType}`,
  );
  const declaredPairs = tuples.map(
    ([name, eventType]) => `${name}:${eventType}`,
  );
  const documentedWindow = windowEventHandlers
    .map((row) => row.name)
    .filter((name) => name !== "onEvent");
  const carriesFields = eventHandlers
    .flatMap((row) => row.carries.split(", "))
    .filter((field) => field !== "—");

  return [
    ...payloadFields
      .filter((field) => !eventPayloadFieldNames.includes(field))
      .map((field) => `EventPayload.${field} is declared and not documented`),
    ...eventPayloadFieldNames
      .filter((field) => !payloadFields.includes(field))
      .map(
        (field) => `${field} is documented and not declared on EventPayload`,
      ),
    ...FORBIDDEN_PAYLOAD_FIELDS.filter((field) =>
      payloadFields.includes(field),
    ).map((field) => `EventPayload declares the absent field ${field}`),
    ...carriesFields
      .filter((field) => !payloadFields.includes(field))
      .map(
        (field) =>
          `a handler row carries ${field}, which EventPayload does not declare`,
      ),
    ...(modifierFields.join(",") ===
    eventModifiers.map((row) => row.name).join(",")
      ? []
      : [
          `EventModifiers is ${modifierFields.join(", ")}; the page rows are ${eventModifiers
            .map((row) => row.name)
            .join(", ")}`,
        ]),
    ...hostHandlers
      .filter((name) => !eventHandlers.some((row) => row.name === name))
      .map(
        (name) => `HostProps.${name} is declared and not in the handler table`,
      ),
    ...eventHandlers
      .filter((row) => !hostHandlers.includes(row.name))
      .map(
        (row) =>
          `${row.name} is in the handler table and not declared on HostProps`,
      ),
    ...declaredPairs
      .filter((pair) => !documentedPairs.includes(pair))
      .map((pair) => `EVENT_PROPS declares ${pair} and the table does not`),
    ...documentedPairs
      .filter((pair) => !declaredPairs.includes(pair))
      .map((pair) => `the table declares ${pair} and EVENT_PROPS does not`),
    ...hostHandlers
      .filter((name) =>
        FORBIDDEN_HOST_PROPS.some((pattern) => pattern.test(name)),
      )
      .map((name) => `HostProps declares the absent handler ${name}`),
    ...windowHandlers
      .filter((name) => !documentedWindow.includes(name))
      .map(
        (name) =>
          `WindowKeyEventHandlers.${name} is documented as a window event`,
      ),
    ...documentedWindow
      .filter((name) => !windowHandlers.includes(name))
      .map(
        (name) => `${name} is documented as a window event and not declared`,
      ),
    ...(dispatcher.includes('eventType: "keyDown"')
      ? []
      : ["the dispatcher no longer rewrites a window key down to keyDown"]),
    ...(dispatcher.includes('eventType: "keyUp"')
      ? []
      : ["the dispatcher no longer rewrites a window key up to keyUp"]),
    ...(dispatcher.includes("elementId: 0")
      ? []
      : ["the dispatcher no longer zeroes elementId for a window event"]),
    ...(dispatcher.includes('event.eventType === "selectionChange"')
      ? []
      : ["the dispatcher no longer has a selectionChange branch"]),
  ];
};
