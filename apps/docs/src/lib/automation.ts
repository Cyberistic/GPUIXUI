/**
 * The runtime's app driver (plan 634).
 *
 * `@gpuix/native@0.10.0` ships an out-of-process driver — the `./automation`
 * subpath — plus the app-side switch in `./runtime`. The site documented the
 * offscreen `TestRenderer` (Testing) and the repository's own suite (Native
 * smoke suite), but never the surface that drives a **running** app, so
 * measured 2026-10-21 `automation`, `ui automation`, `locator` and
 * `automation tree` reached the Icon page, `getByTestId`, `connectStdio` and
 * `dragTo` returned nothing, and `e2e` reached Testing.
 *
 * The rows are authored; the names are not. `automation.test.ts` re-derives
 * every list from the installed declarations in both directions, so a member
 * the runtime adds fails until it is explained and an invented member fails by
 * name. Browser-safe: declaration text is passed in, never read from disk.
 */
import { interfaceFieldsIn } from "./native-elements";

export interface AutomationRow {
  readonly name: string;
  readonly summary: string;
}

export interface AutomationGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: ReadonlyArray<AutomationRow>;
}

/** The app-side switch, from `@gpuix/native/runtime` (`dist/runtime.d.ts`). */
export const appSideFunctions: ReadonlyArray<AutomationRow> = [
  {
    name: "createNativeRenderer",
    summary:
      "Creates the renderer `@gpuix/react` mounts into. When `process.stdin` is not a TTY — exactly what a spawned test process has — it wraps `init` so automation starts with the window.",
  },
  {
    name: "enableAutomation",
    summary:
      "Serves the protocol on stdin/stdout: `serveAutomationStdio(new InProcessBackend(liveRendererAsTest(renderer)))`. Call it once, after the renderer exists.",
  },
  {
    name: "installBrowserAutomation",
    summary:
      "The browser counterpart: returns an `App` bound to the page's renderer instead of serving stdio, so a wasm app can be driven in the same document.",
  },
  {
    name: "startFrameLoop",
    summary:
      "The frame pump automation relies on: a paced `tick()` loop, not a `setImmediate` spin. `render()` starts it for you.",
  },
];

/**
 * The automation entry's exports, grouped by what a reader is doing. Every
 * name `dist/automation/index.d.ts` exports appears here exactly once.
 */
export const automationEntryGroups: ReadonlyArray<AutomationGroup> = [
  {
    id: "drive",
    title: "Drive an app",
    note: "The client a test process uses. `launch` spawns, `connectStdio` attaches to a pipe you own, and `connectTest` attaches to a renderer in this process.",
    rows: [
      {
        name: "App",
        summary:
          "One connected app: locators, raw mouse input, the clock, screenshots and `close()`. It is a driver, not an assertion library.",
      },
      {
        name: "Locator",
        summary:
          "A selector plus the actions and reads scoped to its elements. Returned by `App.getBy*`; chainable with `getBy*`.",
      },
      {
        name: "launch",
        summary:
          "Spawns `{ command, args?, cwd?, env? }` with piped stdin/stdout, waits for `initialize` and returns the `App`. It kills the child on `close()`.",
      },
      {
        name: "connectStdio",
        summary:
          "Attaches to a transport you already have: `{ write, feed, close? }` carrying the SSE-framed wire messages.",
      },
      {
        name: "connectTest",
        summary:
          "Wraps a `TestAutomationRenderer` in an `App` without a process boundary — the in-process path `enableAutomation` serves.",
      },
    ],
  },
  {
    id: "serve",
    title: "Serve the app side",
    note: "What runs inside the app. `enableAutomation` composes the first two; use these directly for another transport.",
    rows: [
      {
        name: "AutomationBackend",
        summary:
          "The server interface: `call(method, params)` and `close()`. Implement it to put the protocol on a socket, a worker or a test harness.",
      },
      {
        name: "InProcessBackend",
        summary:
          "A backend over a renderer in the same process. It is what `enableAutomation` serves over stdio.",
      },
      {
        name: "SseBackend",
        summary:
          "A backend over two callbacks — `write` and `feed` — with request ids and pending promises. The transport `connectStdio` speaks.",
      },
      {
        name: "serveAutomationStdio",
        summary:
          "Reads the protocol from `process.stdin`, dispatches to a backend and writes replies to `process.stdout`. The zero-config path.",
      },
      {
        name: "handleAutomationRequest",
        summary:
          "Handles one raw wire message string against a backend and returns the reply string. For a host that owns its own loop.",
      },
    ],
  },
  {
    id: "browser",
    title: "Browser and wasm adapters",
    note: "A GPUI web app has two event surfaces — the canvas for the pointer, a hidden element for the keyboard — so these adapt a live renderer to the test interface.",
    rows: [
      {
        name: "browserRendererAsTest",
        summary:
          "Adapts a browser renderer to `TestAutomationRenderer`; pointer events go to the canvas, keyboard events to the IME mirror.",
      },
      {
        name: "liveRendererAsTest",
        summary:
          "Adapts a `LiveAutomationRenderer` (the native or browser renderer) to the test interface `InProcessBackend` takes.",
      },
      {
        name: "browserKeystrokeInit",
        summary:
          "Builds the `KeyboardEventInit` a browser GPUIX app reads for one key, including `isHeld` for a repeat.",
      },
      {
        name: "IME_MIRROR_SELECTOR",
        summary:
          "`[data-gpui-input]`, the hidden element `gpui_web` attaches its key and IME listeners to. Match the attribute alone; the tag changed from `input` to `textarea`.",
      },
    ],
  },
  {
    id: "options",
    title: "Options and renderer shapes",
    note: "The argument types and the two renderer views the adapters translate between.",
    rows: [
      {
        name: "MouseOptions",
        summary:
          '`button` (0 left, 1 middle, 2 right) and `modifiers` in `press()` syntax (`"cmd-shift"`).',
      },
      {
        name: "DragOptions",
        summary:
          "`MouseOptions` plus `steps` (default 8) and `offset` from the source centre. The steps are the point: one jump proves no snapping or live preview.",
      },
      {
        name: "PointTarget",
        summary:
          "A window-space `{ x, y }` or a `Locator` resolved to the centre of its last painted bounds.",
      },
      {
        name: "TestAutomationRenderer",
        summary:
          "The renderer methods a driver needs: simulated pointer and keys, focus, scroll, text, bounds, screenshots and the clock. `@gpuix/react/testing`'s `TestRenderer` satisfies it.",
      },
      {
        name: "LiveAutomationRenderer",
        summary:
          "A real renderer's automation methods, before `liveRendererAsTest` adapts them. `simulateKeystrokes`, `simulateKeyDown`, `simulateKeyUp`, `tick` and `captureScreenshot` are optional.",
      },
    ],
  },
  {
    id: "protocol",
    title: "The wire protocol",
    note: "For a driver in another language: the method table, the message parsers and the error type. A TypeScript consumer uses `App`/`Locator` instead.",
    rows: [
      {
        name: "PROTOCOL_VERSION",
        summary:
          "`1`. It is sent in `initialize`, and a mismatch is a `Protocol` error.",
      },
      {
        name: "methods",
        summary:
          "The single source of truth: every method name with its zod params and result schemas. `MethodName`, `ParamsOf` and `ResultOf` derive from it.",
      },
      {
        name: "parseRequest",
        summary: "Decodes one client request from unknown JSON.",
      },
      {
        name: "parseResponse",
        summary: "Decodes one server response from unknown JSON.",
      },
      {
        name: "parseWireMessage",
        summary:
          "Decodes either direction, so a transport can route before it validates.",
      },
      {
        name: "encodeSse",
        summary: "Frames one message as a Server-Sent Events chunk.",
      },
      {
        name: "decodeSseChunk",
        summary: "Decodes one SSE chunk without keeping state.",
      },
      {
        name: "createSseDecoder",
        summary:
          "A stateful decoder for a byte stream that splits chunks arbitrarily.",
      },
      {
        name: "AutomationError",
        summary:
          "An `Error` carrying a `code` from the eight names below and optional `data`.",
      },
      {
        name: "AutomationErrorCode",
        summary: "The union of the eight codes.",
      },
      {
        name: "AutomationRequest",
        summary: "`{ id, method, params }` for one method, discriminated.",
      },
      {
        name: "AutomationResponse",
        summary: "The success or error reply for one request id.",
      },
      {
        name: "AutomationServerEvent",
        summary:
          "An unsolicited server message, framed like a reply and told apart by `isServerEvent`.",
      },
      {
        name: "WireMessage",
        summary:
          "A request, a response or a server event, as the transport sees it.",
      },
      {
        name: "MethodName",
        summary: "`keyof typeof methods` — the 25 names below.",
      },
      {
        name: "ParamsOf",
        summary: "The params type of one method name.",
      },
      {
        name: "ResultOf",
        summary: "The result type of one method name.",
      },
      {
        name: "ElementBounds",
        summary: "`{ x, y, width, height }` in window coordinates.",
      },
      {
        name: "TreeNode",
        summary:
          "One element in `getAutomationTree()`: id, type, text, testId, style, events, custom props, bounds and children.",
      },
    ],
  },
];

/** `Locator`'s methods, in declaration order. */
export const locatorMethods: ReadonlyArray<AutomationRow> = [
  { name: "getByTestId", summary: "Narrow to a `testId` inside this locator." },
  {
    name: "getByText",
    summary: "Narrow to an element whose own or descendant text matches.",
  },
  {
    name: "getByType",
    summary: "Narrow to a host tag — `div`, `text`, `svg`, `input`.",
  },
  { name: "all", summary: "Every matching node, in tree order." },
  { name: "count", summary: "How many match. The empty-state assertion." },
  {
    name: "element",
    summary:
      "The one match; ambiguous or missing is an error, not `undefined`.",
  },
  { name: "bounds", summary: "The last painted bounds in window coordinates." },
  {
    name: "center",
    summary: "The centre of those bounds — where a gesture lands.",
  },
  {
    name: "click",
    summary:
      "Press and release at the centre, with optional button and modifiers.",
  },
  {
    name: "hover",
    summary:
      "Move the pointer to the centre, so hover styles and tooltips fire.",
  },
  {
    name: "wheel",
    summary: "One wheel event over the centre; negative `deltaY` scrolls down.",
  },
  {
    name: "dragTo",
    summary: "Press here, travel to a point or another locator, release there.",
  },
  {
    name: "dragBy",
    summary: "The same gesture with a pixel offset instead of a target.",
  },
  {
    name: "fill",
    summary: "Replace the element's text through the runtime's input path.",
  },
  { name: "press", summary: "Send one key while this element has focus." },
  {
    name: "textContent",
    summary: "Own text plus every descendant's, in document order.",
  },
  {
    name: "waitFor",
    summary:
      "Poll until the locator matches; `{ timeoutMs? }`. A timeout is an error.",
  },
];

/** `App`'s own methods, minus the `clock` and `mouse` blocks. */
export const appMethods: ReadonlyArray<AutomationRow> = [
  {
    name: "call",
    summary: "Send any protocol method directly and get its typed result.",
  },
  {
    name: "getByTestId",
    summary: "The recommended selector: the `testId` you wrote.",
  },
  { name: "getByText", summary: "A locator rooted in an element's text." },
  { name: "getByType", summary: "A locator rooted in a host tag." },
  {
    name: "screenshot",
    summary: "Writes a PNG to `{ path }` and returns the path.",
  },
  {
    name: "captureFrames",
    summary:
      "Writes frames at `timesMs` into a directory and returns their paths.",
  },
  {
    name: "close",
    summary: "Closes the backend; for `launch`, kills the child process.",
  },
];

/** `App.mouse`: raw window coordinates, for gestures that end outside a hitbox. */
export const mouseMethods: ReadonlyArray<AutomationRow> = [
  {
    name: "move",
    summary: "Move the pointer; `pressedButton` keeps a drag alive.",
  },
  { name: "down", summary: "Press at a point." },
  { name: "up", summary: "Release at a point." },
  { name: "click", summary: "Down and up at the same point." },
  {
    name: "wheel",
    summary: "A wheel event at a point with `deltaX`/`deltaY`.",
  },
  {
    name: "drag",
    summary: "Press, travel through `steps` move events, release.",
  },
];

/** `App.clock`: the app's own clock, not the test process's. */
export const clockMethods: ReadonlyArray<AutomationRow> = [
  {
    name: "pause",
    summary: "Stop time and return the current instant in milliseconds.",
  },
  { name: "set", summary: "Jump to an instant." },
  {
    name: "fastForward",
    summary: "Advance by a delta, running the timers that become due.",
  },
  { name: "resume", summary: "Return to real time." },
];

/** The 25 protocol methods, in declaration order. */
export const protocolMethods: ReadonlyArray<AutomationRow> = [
  {
    name: "initialize",
    summary:
      "Handshake: protocol version, client name; returns pid, capabilities and the window size.",
  },
  {
    name: "cancel",
    summary:
      "Cancel an in-flight request by id; its reply becomes `Cancelled`.",
  },
  { name: "click", summary: "Pointer down and up at window coordinates." },
  { name: "mouseDown", summary: "Press at window coordinates." },
  { name: "mouseUp", summary: "Release at window coordinates." },
  {
    name: "mouseMove",
    summary: "Move to window coordinates, optionally with a held button.",
  },
  { name: "scrollWheel", summary: "A wheel event at window coordinates." },
  {
    name: "keystrokes",
    summary: "Type a key sequence, optionally at one element id.",
  },
  {
    name: "keyDown",
    summary: "One key down; `isHeld` repeats without a key up.",
  },
  { name: "keyUp", summary: "One key up, optionally at one element id." },
  { name: "focus", summary: "Move focus to an element id." },
  { name: "blur", summary: "Clear focus." },
  { name: "scrollTo", summary: "Set a scroll container's offset." },
  {
    name: "getScrollOffset",
    summary: "Read `[x, y]`, or `null` when the element does not scroll.",
  },
  { name: "getTree", summary: "The automation tree with last-paint bounds." },
  {
    name: "getPaintedText",
    summary:
      "The text the renderer painted, including `<code>`, `<diff>` and `<markdown>`.",
  },
  { name: "getAllText", summary: "Every text node the tree holds." },
  { name: "getBounds", summary: "One element's bounds, or `null`." },
  {
    name: "getSelectedText",
    summary: "The current native selection, or `null`.",
  },
  { name: "clearSelection", summary: "Clear the native selection." },
  { name: "screenshot", summary: "Write a PNG to a path and return it." },
  { name: "clockPause", summary: "Pause the app clock; returns the instant." },
  { name: "clockSet", summary: "Set the app clock." },
  {
    name: "clockFastForward",
    summary: "Advance the app clock, running due timers.",
  },
  { name: "clockResume", summary: "Resume real time." },
];

/** The eight `AutomationError` codes. */
export const protocolErrorCodes: ReadonlyArray<AutomationRow> = [
  {
    name: "Timeout",
    summary: "A `waitFor` or a transport did not settle in time.",
  },
  { name: "NotFound", summary: "The selector matched nothing." },
  {
    name: "Ambiguous",
    summary:
      "The selector matched more than one element where one was required.",
  },
  { name: "Protocol", summary: "A malformed message or a version mismatch." },
  { name: "Closed", summary: "The app or the backend is gone." },
  {
    name: "Unsupported",
    summary: "The renderer or platform cannot perform the method.",
  },
  { name: "Security", summary: "The request was refused." },
  { name: "Cancelled", summary: "A caller cancelled the request." },
];

/** The nine `TreeNode` fields. */
export const treeNodeFields: ReadonlyArray<AutomationRow> = [
  {
    name: "id",
    summary:
      "The renderer's numeric element id — what the protocol's `*Id` params take.",
  },
  { name: "type", summary: "The host tag." },
  { name: "text", summary: "A text node's string, when the node has one." },
  {
    name: "testId",
    summary: "The `testId` the element was given; the stable selector.",
  },
  {
    name: "style",
    summary:
      "The authored style, the rule Testing's `TestElement.style` follows.",
  },
  { name: "events", summary: "The event names the element handles." },
  {
    name: "customProps",
    summary: "The non-style, non-event props the element carries.",
  },
  { name: "bounds", summary: "Last painted `{ x, y, width, height }`." },
  { name: "children", summary: "Child nodes, in tree order." },
];

/** The capabilities `initialize` can report. */
export const automationCapabilities: ReadonlyArray<AutomationRow> = [
  { name: "input", summary: "Pointer and keyboard simulation." },
  { name: "screenshot", summary: "PNG capture is available." },
  { name: "clock", summary: "The app clock can be paused and advanced." },
  { name: "tree", summary: "The automation tree and bounds can be read." },
];

export interface AutomationAbsence {
  readonly subject: string;
  readonly statement: string;
  /** The page that answers the question instead. */
  readonly owner?: string;
}

export const automationAbsences: ReadonlyArray<AutomationAbsence> = [
  {
    subject: "Assertions",
    statement:
      "Every method returns a value; nothing asserts. `expect(await locator.count()).toBe(1)` is the consumer's vitest, not the protocol.",
  },
  {
    subject: "Test runner",
    statement:
      "No runner, spec format or reporting is declared. `launch` starts a process; your runner decides when.",
  },
  {
    subject: "Visual diff",
    statement:
      "`screenshot` writes a PNG and `captureFrames` writes several. Nothing compares them: a pixel diff cannot say which token painted a pixel.",
  },
  {
    subject: "Network or idle wait",
    statement:
      "The only wait is `Locator.waitFor` polling the tree. There is no idle, request or frame-settled signal.",
  },
  {
    subject: "Multiple windows",
    statement:
      "`initialize` reports one window, and no method targets or enumerates windows. Drive one app window per session.",
  },
  {
    subject: "App log capture",
    statement:
      "The protocol has no console or log read. A failing app's output is the child process's stdout, which the transport owns.",
  },
  {
    subject: "DOM or accessibility tree",
    statement:
      "`getTree` returns the renderer's own nodes, not a DOM or the platform accessibility tree. Accessibility owns the ARIA surface the runtime declares.",
    owner: "/docs/accessibility",
  },
  {
    subject: "Headless mode",
    statement:
      "`launch` spawns a real command and the app opens a real window; there is no headless flag. A CI runner needs a desktop session.",
  },
  {
    subject: "Clipboard",
    statement:
      "Selection is readable and clearable, but no clipboard read or write is declared. Selection and find owns that absence.",
    owner: "/docs/selection",
  },
];

export interface AutomationSurfaceInput {
  /** `dist/automation/index.d.ts` of the installed package. */
  readonly automationEntry: string;
  /** `dist/automation/client.d.ts`. */
  readonly client: string;
  /** `dist/automation/protocol.d.ts`. */
  readonly protocol: string;
  /** `dist/runtime.d.ts`. */
  readonly runtime: string;
  /** The installed `@gpuix/react` root declarations. */
  readonly reactDeclarations: string;
  readonly groups?: ReadonlyArray<AutomationGroup>;
  readonly appSide?: ReadonlyArray<AutomationRow>;
  readonly locator?: ReadonlyArray<AutomationRow>;
  readonly app?: ReadonlyArray<AutomationRow>;
  readonly mouse?: ReadonlyArray<AutomationRow>;
  readonly clock?: ReadonlyArray<AutomationRow>;
  readonly methods?: ReadonlyArray<AutomationRow>;
  readonly errors?: ReadonlyArray<AutomationRow>;
  readonly tree?: ReadonlyArray<AutomationRow>;
  readonly capabilities?: ReadonlyArray<AutomationRow>;
  readonly absences?: ReadonlyArray<AutomationAbsence>;
}

const classBody = (declarations: string, name: string): string => {
  const start = declarations.indexOf(`export declare class ${name} `);
  const open = declarations.indexOf("{", start);
  const close = declarations.indexOf("\n}", open);
  return start < 0 || open < 0 || close < 0
    ? ""
    : declarations.slice(open + 1, close);
};

/** A declared class method; `call<M extends …>` has a generic parameter. */
const methodsIn = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^ {4}([A-Za-z][A-Za-z0-9]*)(?:<[^>]*>)?\(/gmu)].flatMap(
    (match) =>
      match[1] === undefined || match[1] === "constructor" ? [] : [match[1]],
  );

/** The `mouse`/`clock` object literals inside `App`. */
const blockIn = (body: string, name: string): string =>
  new RegExp(`\\n    readonly ${name}: \\{([\\s\\S]*?)\\n    \\};`, "u").exec(
    body,
  )?.[1] ?? "";

/** The members of an object-literal block: `move: (…) => …`, not `move(…)`. */
const blockMethodsIn = (block: string): ReadonlyArray<string> =>
  [...block.matchAll(/^ {8}([A-Za-z][A-Za-z0-9]*): \(/gmu)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

/** Every value and type name the automation entry exports. */
export const automationEntryNames = (
  automationEntry: string,
): ReadonlyArray<string> =>
  [...automationEntry.matchAll(/export (?:type )?\{([^}]*)\}/gu)].flatMap(
    (match) =>
      (match[1] ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
  );

/** The protocol method names declared in `methods`. */
export const protocolMethodNames = (protocol: string): ReadonlyArray<string> =>
  [...protocol.matchAll(/^ {4}readonly ([A-Za-z]+): \{/gmu)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

const arrayLiteral = (
  declarations: string,
  name: string,
): ReadonlyArray<string> =>
  [
    ...(new RegExp(
      `export declare const ${name}: readonly \\[([^\\]]*)\\]`,
      "u",
    )
      .exec(declarations)?.[1]
      ?.matchAll(/"([^"]+)"/gu) ?? []),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const capabilityNames = (protocol: string): ReadonlyArray<string> => {
  const capability = /capabilities: z\.ZodArray<z\.ZodEnum<\{([^}]*)\}>>/u.exec(
    protocol,
  )?.[1];
  return capability === undefined
    ? []
    : [...capability.matchAll(/: "([^"]+)"/gu)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      );
};

const runtimeFunctionNames = (runtime: string): ReadonlyArray<string> =>
  [
    ...runtime.matchAll(/export declare function ([A-Za-z][A-Za-z0-9]*)\(/gu),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => {
  const counts = new Map<string, number>();
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
};

const check = (input: {
  readonly installed: ReadonlyArray<string>;
  readonly authored: ReadonlyArray<string>;
  readonly group: string;
  readonly source: string;
}): ReadonlyArray<string> => [
  ...(input.installed.length === 0
    ? [`the installed declarations have no ${input.source} members`]
    : []),
  ...duplicates(input.authored).map(
    (name) => `${input.group}: ${name} is documented twice`,
  ),
  ...differences(input.authored, input.installed).map(
    (name) => `${input.group}: ${name} is documented but not declared`,
  ),
  ...differences(input.installed, input.authored).map(
    (name) => `${input.group}: ${name} is declared but undocumented`,
  ),
];

/**
 * Every way this module can disagree with the installed runtime, in both
 * directions. Pure, so `automation.test.ts` feeds it one fixture per rule and
 * the real declarations for the run.
 */
export const automationSurfaceViolations = (
  input: AutomationSurfaceInput,
): ReadonlyArray<string> => {
  const groups = input.groups ?? automationEntryGroups;
  const author = (value: ReadonlyArray<AutomationRow>) =>
    value.map((row) => row.name);
  const entry = automationEntryNames(input.automationEntry);
  const nameText = [
    ...entry,
    ...protocolMethodNames(input.protocol),
    ...interfaceFieldsIn(input.protocol, "TreeNode"),
  ].join(" ");
  const documented = groups.flatMap((group) =>
    group.rows.map((row) => row.name),
  );
  const appBody = classBody(input.client, "App");
  const mouse = blockIn(appBody, "mouse");
  const clock = blockIn(appBody, "clock");
  const entryText = [
    input.automationEntry,
    input.client,
    input.protocol,
    input.runtime,
  ].join("\n");
  const absentWhen = (
    subject: string,
    pattern: RegExp,
    where: string,
  ): ReadonlyArray<string> =>
    pattern.test(where)
      ? [`${subject} is now declared; the absence claim is stale`]
      : [];
  const absence = input.absences ?? automationAbsences;
  const stated = (subject: string) =>
    absence.find((row) => row.subject === subject) !== undefined;

  return [
    ...check({
      installed: entry,
      authored: documented,
      group: "automation entry",
      source: "exported",
    }),
    ...check({
      installed: runtimeFunctionNames(input.runtime),
      authored: author(input.appSide ?? appSideFunctions),
      group: "runtime",
      source: "function",
    }),
    ...check({
      installed: methodsIn(classBody(input.client, "Locator")),
      authored: author(input.locator ?? locatorMethods),
      group: "Locator",
      source: "Locator method",
    }),
    ...check({
      installed: methodsIn(appBody),
      authored: author(input.app ?? appMethods),
      group: "App",
      source: "App method",
    }),
    ...check({
      installed: blockMethodsIn(mouse),
      authored: author(input.mouse ?? mouseMethods),
      group: "App.mouse",
      source: "mouse method",
    }),
    ...check({
      installed: blockMethodsIn(clock),
      authored: author(input.clock ?? clockMethods),
      group: "App.clock",
      source: "clock method",
    }),
    ...check({
      installed: protocolMethodNames(input.protocol),
      authored: author(input.methods ?? protocolMethods),
      group: "protocol",
      source: "protocol method",
    }),
    ...check({
      installed: arrayLiteral(input.protocol, "automationErrorCodes"),
      authored: author(input.errors ?? protocolErrorCodes),
      group: "error code",
      source: "error code",
    }),
    ...check({
      installed: interfaceFieldsIn(input.protocol, "TreeNode"),
      authored: author(input.tree ?? treeNodeFields),
      group: "TreeNode",
      source: "TreeNode field",
    }),
    ...check({
      installed: capabilityNames(input.protocol),
      authored: author(input.capabilities ?? automationCapabilities),
      group: "capability",
      source: "capability",
    }),
    ...(stated("Assertions")
      ? absentWhen("an assertion helper", /assert|expect|matcher/iu, entryText)
      : []),
    ...(stated("Test runner")
      ? absentWhen("a test runner", /runner|vitest|jest/iu, entryText)
      : []),
    ...(stated("Visual diff")
      ? absentWhen(
          "a visual-diff helper",
          /baseline|snapshot|visualdiff/iu,
          entryText,
        )
      : []),
    ...(stated("Network or idle wait")
      ? absentWhen(
          "an idle or network wait",
          /idle|network|waitfor/iu,
          protocolMethodNames(input.protocol).join(" "),
        )
      : []),
    ...(stated("Multiple windows")
      ? absentWhen(
          "a window method",
          /window/iu,
          protocolMethodNames(input.protocol).join(" "),
        )
      : []),
    ...(stated("App log capture")
      ? absentWhen("a log read", /log|console/iu, nameText)
      : []),
    ...(stated("DOM or accessibility tree")
      ? absentWhen("a DOM or accessibility read", /dom|accessib/iu, nameText)
      : []),
    ...(stated("Headless mode")
      ? absentWhen("a headless flag", /headless\??:/u, entryText)
      : []),
    ...(stated("Clipboard")
      ? absentWhen("a clipboard method", /clipboard|paste/iu, entryText)
      : []),
    ...(input.reactDeclarations.includes("enableAutomation")
      ? []
      : [
          "@gpuix/react no longer declares enableAutomation; the re-export claim is stale",
        ]),
  ];
};
