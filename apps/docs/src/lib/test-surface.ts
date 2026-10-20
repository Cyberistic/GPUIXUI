/**
 * Testing a GPUix component (plan 628).
 *
 * GPUix paints a native tree, so an adopter cannot reach for a DOM, jsdom or
 * React Testing Library. The runtime instead ships an offscreen renderer —
 * `createTestRoot`, `TestRenderer`, `hasNativeTestRenderer` — and no page owned
 * it: measured 2026-10-20, `createTestRoot`, `hasNativeTestRenderer`, `jsdom`,
 * `playwright` and `storybook` returned nothing, `test renderer` reached a
 * Hotkey input limitation, and `component test` reached the component index.
 *
 * Every row is authored here and checked against the installed declarations by
 * `test-surface.test.ts`: a member the package adds fails until it is explained,
 * a member this module invents fails by name, and a claimed absence fails when
 * the repository gains the dependency. The page renders these arrays.
 *
 * Browser-safe: declaration text is passed in, never read from disk.
 */
import { interfaceFieldsIn } from "./native-elements";

export interface TestingField {
  readonly name: string;
  readonly summary: string;
}

export interface TestingMethod {
  readonly name: string;
  readonly summary: string;
}

export interface TestingGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly methods: ReadonlyArray<TestingMethod>;
}

export interface ExcludedTestingField {
  readonly name: string;
  readonly owner: string;
}

export interface ExcludedTestingMethod {
  readonly name: string;
  readonly owner: string;
}

export interface TestingAbsence {
  readonly subject: string;
  readonly statement: string;
  /** A symbol that would make the absence false if the runtime gained it. */
  readonly symbol?: RegExp;
  /** A package that would make the absence false if the workspace installed it. */
  readonly deniedDependencies?: ReadonlyArray<string>;
}

/**
 * `TestWindowOptions`, minus `onSelectionChange`: `createTestRoot` accepts the
 * window handlers, and Selection and find owns what a selection event carries.
 */
export const testWindowFields: ReadonlyArray<TestingField> = [
  {
    name: "width",
    summary:
      "The offscreen window width in pixels. The native default is 1280; a behaviour suite fixes both dimensions so bounds assertions are stable.",
  },
  {
    name: "height",
    summary:
      "The offscreen window height in pixels. The native default is 800.",
  },
  {
    name: "dispatchEvent",
    summary:
      "The framework scheduling boundary for events drained from native. `createTestRoot` supplies React's, so set it only when the tree is not React.",
  },
  {
    name: "onKeyDown",
    summary:
      "A window-level key handler. An element's own handler runs first; a key action can consume the event before this sees it.",
  },
  {
    name: "onKeyUp",
    summary: "The window-level pair to `onKeyDown`.",
  },
];

/** `onSelectionChange` is a window handler this page does not own. */
export const excludedWindowFields: ReadonlyArray<ExcludedTestingField> = [
  {
    name: "onSelectionChange",
    owner: "Selection and find",
  },
];

/** `TestElement`, the record every find method returns. */
export const testElementFields: ReadonlyArray<TestingField> = [
  {
    name: "id",
    summary:
      "The numeric id the renderer assigns. Pass it to `focusElement`, `getElementBounds`, `scrollTo` and the other id-taking methods.",
  },
  {
    name: "type",
    summary:
      "The host tag: `div`, `text`, `svg`, `input`, `code` and the rest of Native elements.",
  },
  {
    name: "style",
    summary:
      "The authored style the element carries. It is the value the runtime was given, not a computed CSS declaration.",
  },
  {
    name: "text",
    summary:
      "A `<text>` node's content, or `null`. Native `<code>` and `<diff>` text is not here — use `getPaintedText`.",
  },
  {
    name: "events",
    summary: "The event names the element handles.",
  },
  {
    name: "children",
    summary: "The ids of the element's children, in order.",
  },
  {
    name: "parentId",
    summary: "The parent's id, or `null` at the root.",
  },
  {
    name: "testId",
    summary:
      "The id you passed to the component. It is the selector every find method should use, so a suite survives a change in internal order.",
  },
  {
    name: "customProps",
    summary: "The non-style, non-event props the element carries.",
  },
];

/** The methods a component test uses, grouped by what the test is doing. */
export const testMethodGroups: ReadonlyArray<TestingGroup> = [
  {
    id: "find",
    title: "Finding what rendered",
    note: "Find by `testId`, not by index: the tree's ids and order are the renderer's, while a `testId` is the contract you wrote.",
    methods: [
      {
        name: "getRoot",
        summary:
          "The root `TestElement`, or `undefined` before the first flush.",
      },
      {
        name: "getElement",
        summary: "One element by the numeric `id` the tree assigns.",
      },
      {
        name: "findByTestId",
        summary:
          "The first element whose `testId` matches. The selector to use for every part you assert on.",
      },
      {
        name: "findByText",
        summary:
          "The first `<text>` element whose content contains the string.",
      },
      {
        name: "findByType",
        summary:
          "Every element of a host type, such as `div`, `text` or `svg`.",
      },
      {
        name: "getAllText",
        summary: "Every `<text>` node's content, depth-first.",
      },
      {
        name: "getPaintedText",
        summary:
          "Every string painted in the last frame, including the native `<code>`/`<diff>` text `getAllText` cannot see.",
      },
      {
        name: "toJSON",
        summary:
          "The retained tree as plain data, for a failure message. It walks from the root, so a detached node is invisible here.",
      },
      {
        name: "getRetainedElementCount",
        summary:
          "Every element the tree holds, reachable or not — the check for a node that was detached and leaked.",
      },
      {
        name: "getElementBounds",
        summary:
          "The measured `{ x, y, width, height }` of an element, or `null`. Click at the centre of these bounds, never at a guessed coordinate.",
      },
    ],
  },
  {
    id: "input",
    title: "Driving input",
    note: "`simulateKeystrokes` sends to whatever holds focus; every `nativeSimulate*` call goes through GPUI's real hit testing and event pipeline.",
    methods: [
      {
        name: "simulateKeystrokes",
        summary:
          'Send keystrokes (space-separated, e.g. `"a enter cmd-shift-p"`) to whatever currently holds focus. This focuses nothing first, which is the only way to prove that a click or `autoFocus` moved focus.',
      },
      {
        name: "nativeSimulateKeystrokes",
        summary:
          "Focus an element, then send keystrokes through GPUI. The element must handle `onKeyDown`/`onKeyUp`.",
      },
      {
        name: "nativeSimulateKeyDown",
        summary:
          "A single key down, with `isHeld` for a repeat. No key up follows, so this is how a held key is proved.",
      },
      {
        name: "nativeSimulateKeyUp",
        summary:
          "One key up. Pair it with `nativeSimulateKeyDown` when the component acts on the release.",
      },
      {
        name: "nativeSimulateClick",
        summary:
          "A click at window coordinates through real hit testing, with a button (`0` left, `2` right) and modifiers.",
      },
      {
        name: "nativeSimulateMouseDown",
        summary: "A mouse-down at coordinates. Start a drag here.",
      },
      {
        name: "nativeSimulateMouseUp",
        summary: "The mouse-up that ends a drag or a click.",
      },
      {
        name: "nativeSimulateMouseMove",
        summary:
          "A move, with an optional pressed button. Mouse-move is the only drag signal the runtime has.",
      },
      {
        name: "nativeSimulateScrollWheel",
        summary:
          "A wheel at coordinates. `deltaY` is negative to scroll down — the opposite of the DOM.",
      },
      {
        name: "nativeSimulateFileDrop",
        summary:
          "A Finder-style drop of paths at coordinates, for `onFileDrop`. There is no drag-and-drop host feature.",
      },
    ],
  },
  {
    id: "focus",
    title: "Focus",
    note: "Focus is native state: move it, read it back, then assert the ring, the roving tab stop or the focus return.",
    methods: [
      {
        name: "focusElement",
        summary:
          "Move native focus to an element id. `focusNextWithin` and `focusPreviousWithin` are the container-scoped forms.",
      },
      {
        name: "getFocusedElementId",
        summary:
          "The id that holds native focus, or `null`. Resolve it through `getElement` to get the focused `testId`.",
      },
      {
        name: "focusNext",
        summary: "The window's next tab stop.",
      },
      {
        name: "focusPrevious",
        summary: "The window's previous tab stop.",
      },
      {
        name: "focusNextWithin",
        summary:
          "Cycle forward inside one container and wrap at its end — how a dialog's Tab trap is proved.",
      },
      {
        name: "focusPreviousWithin",
        summary: "The same wrap, backwards.",
      },
    ],
  },
  {
    id: "time",
    title: "Time",
    note: "Two clocks: the motion clock (`clock*`) drives animation, and `advanceTime` runs the dispatcher's due timers.",
    methods: [
      {
        name: "clockPause",
        summary: "Stop the motion clock at its current value.",
      },
      {
        name: "clockSet",
        summary: "Set the motion clock to an absolute time in milliseconds.",
      },
      {
        name: "clockFastForward",
        summary:
          "Advance the motion clock by a delta. This moves animation, not timers — a toast's dismissal is `advanceTime`.",
      },
      {
        name: "clockResume",
        summary: "Restart the motion clock from its current value.",
      },
      {
        name: "advanceTime",
        summary:
          "Advance GPUI's test dispatcher and run due timers: caret blink, input drag autoscroll and list edge scroll.",
      },
    ],
  },
  {
    id: "scroll",
    title: "Scrolling",
    note: "Offsets are negative pixels: a larger negative `y` is further down.",
    methods: [
      {
        name: "scrollTo",
        summary:
          "Set a scroll container's offset. Call it after a layout pass, or the measured content may not be tall enough yet.",
      },
      {
        name: "scrollToItem",
        summary:
          "Scroll a child into view by its index, with `offsetInItem` pixels. A negative offset anchors the viewport top above the item, and the row stays pixel-stable while unmeasured rows are spliced in above it.",
      },
      {
        name: "scrollIntoView",
        summary: "Bring an element into view without choosing an offset.",
      },
      {
        name: "getScrollOffset",
        summary:
          "`[x, y]` for a scrollable element, or `null` when it is not one.",
      },
      {
        name: "getListScrollTop",
        summary:
          "A `<virtual-list>`'s logical anchor `[itemIndex, offsetInItemPx, viewportHeightPx]`, or `null` for another element. Exact even while row heights are estimates.",
      },
    ],
  },
  {
    id: "render",
    title: "The render loop",
    note: "The loop is synchronous. There is no `act` and no `waitFor`: a click becomes state after the dispatched events run.",
    methods: [
      {
        name: "flush",
        summary:
          "Run the real GPUI pipeline — render, layout and paint — once. Call it before measuring bounds.",
      },
      {
        name: "drainEvents",
        summary:
          "Collect the events both ends queued, without dispatching them.",
      },
      {
        name: "dispatchNativeEvents",
        summary:
          "Feed the queued events into React and run the resulting state updates until none remain. This is what makes a click visible.",
      },
      {
        name: "applyBatch",
        summary:
          "The renderer's mutation batch. `createTestRoot().render` calls it; call it directly only with a custom root.",
      },
    ],
  },
  {
    id: "inspect",
    title: "Paint and accessibility",
    note: "A screenshot is an artifact. Assert the painted text, the accessibility tree or a measured value instead.",
    methods: [
      {
        name: "getA11yTree",
        summary:
          "GPUI's accessibility dump for the last painted frame: role, label, description, value, expanded, selected and level per node. This is the same tree assistive technology reads.",
      },
      {
        name: "getWindowSize",
        summary:
          "The offscreen window size, so `useWindowSize()` returns the test window rather than zero.",
      },
      {
        name: "captureScreenshot",
        summary:
          "Write the current frame to a PNG path. It is an artifact for a human, never an assertion — a pixel diff cannot say which token painted it.",
      },
      {
        name: "setImage",
        summary:
          "Supply encoded bytes to an `<img>`, so an image or avatar test needs no fixture file on disk.",
      },
      {
        name: "setImagePixels",
        summary: "Supply raw RGBA pixels and their dimensions to an `<img>`.",
      },
    ],
  },
];

/**
 * Public members this page does not document, with the page that owns each. The
 * guard requires the union of documented and excluded names to equal the class.
 */
export const excludedTestMethods: ReadonlyArray<ExcludedTestingMethod> = [
  { name: "dragSelect", owner: "Selection and find" },
  { name: "getSelectedText", owner: "Selection and find" },
  { name: "clearSelection", owner: "Selection and find" },
  { name: "getPaintedHighlights", owner: "Selection and find" },
  { name: "promptForPaths", owner: "The Application window" },
  { name: "setWindowSelectionChange", owner: "Selection and find" },
  { name: "setWindowKeyEvents", owner: "Component API" },
  { name: "getSyntaxCacheStats", owner: "Performance" },
  { name: "setDebugFrameOverlay", owner: "The Application window" },
  { name: "getDebugFrameOverlay", owner: "The Application window" },
  { name: "cycleDebugFrameOverlay", owner: "The Application window" },
  { name: "resetDebugFrameOverlayStats", owner: "The Application window" },
  { name: "getDebugFrameOverlayStats", owner: "The Application window" },
  { name: "getAutomationTree", owner: "Previews" },
  { name: "dispatchScrollWheel", owner: "Performance" },
  { name: "dispatchMouseMove", owner: "Performance" },
];

/**
 * What a GPUix test cannot do, and what to do instead. `deniedDependencies` is
 * checked against every workspace manifest, so the claim fails the day the
 * repository installs the tool it says it does not use.
 */
export const testingAbsences: ReadonlyArray<TestingAbsence> = [
  {
    subject: "A DOM",
    statement:
      "There is no `document`, `window` or `HTMLElement`, and no `querySelector` or `getBoundingClientRect`. The tree is `TestElement` records; find by `testId`.",
    symbol: /querySelector|getBoundingClientRect|innerHTML/u,
  },
  {
    subject: "jsdom or happy-dom",
    statement:
      "There is no HTML renderer to install them into. `createTestRoot` mounts the real GPUix tree in an offscreen window.",
    deniedDependencies: ["jsdom", "happy-dom"],
  },
  {
    subject: "React Testing Library",
    statement:
      "`render`, `screen` and `fireEvent` query a DOM that does not exist. Use `createTestRoot`, `findByTestId` and the `nativeSimulate*` input methods.",
    deniedDependencies: [
      "@testing-library/dom",
      "@testing-library/react",
      "@testing-library/user-event",
    ],
  },
  {
    subject: "A browser or desktop e2e driver",
    statement:
      "No Playwright, Cypress or WebDriver is installed, and none could drive the native window. The desktop renderer's test API is the end-to-end path; the browser smokes test this docs site only.",
    deniedDependencies: ["playwright", "cypress", "webdriverio"],
  },
  {
    subject: "Storybook",
    statement:
      "There is no Storybook. A component page's live scene, its labelled tier-A preview and the native playground are the showcase; Component pages documents how to add a scene.",
    deniedDependencies: [
      "storybook",
      "@storybook/react",
      "@storybook/react-vite",
    ],
  },
  {
    subject: "Snapshot or golden-image assertions",
    statement:
      "`captureScreenshot` writes a PNG for a human. A pixel diff cannot say which token painted it, so suites assert measured bounds, painted text or the runtime's own style report.",
  },
  {
    subject: "`act` and `waitFor`",
    statement:
      "The render loop is synchronous: `flush` runs layout and paint, and `dispatchNativeEvents` runs React's updates until none remain. There is no pending async commit to wait for.",
  },
  {
    subject: "A mocked renderer",
    statement:
      "`createTestRoot` mounts the real renderer; `hasNativeTestRenderer` says whether the host can, so an unsupported host skips the suite instead of receiving a fake. Mock your own effects, not the renderer.",
  },
  {
    subject: "Coverage measurement",
    statement:
      "No line or branch coverage is measured. The Roadmap states what coverage the project does publish: the component inventory, its runtime verdicts and the site's own checks.",
  },
];

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => {
  const counts = new Map<string, number>();
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
};

/**
 * Every public member of the installed `TestRenderer`, derived from the class
 * declaration. Both shapes count: `flush(` methods and the `readonly focusNext:`
 * function properties the class assigns in its constructor.
 */
export const testRendererMethodNames = (
  declarations: string,
): ReadonlyArray<string> => {
  const body = declarations.slice(
    declarations.indexOf("export declare class TestRenderer"),
  );
  const open = body.indexOf("{");
  const close = body.indexOf("\n}");
  if (open < 0 || close < 0) return [];
  return [
    ...body
      .slice(open + 1, close)
      .matchAll(/^ {4}(?:readonly )?([A-Za-z][A-Za-z0-9]*)[(:]/gmu),
  ].flatMap((match) =>
    match[1] === undefined || match[1] === "constructor" ? [] : [match[1]],
  );
};

/** `TestWindowOptions` is `TestRendererOptions & WindowKeyEventHandlers`. */
export const testWindowOptionNames = (
  declarations: string,
): ReadonlyArray<string> => [
  ...interfaceFieldsIn(declarations, "TestRendererOptions"),
  ...interfaceFieldsIn(declarations, "WindowKeyEventHandlers"),
];

const fieldViolations = (input: {
  readonly interfaceName: string;
  readonly installed: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<TestingField>;
  readonly excluded: ReadonlyArray<string>;
}): ReadonlyArray<string> => {
  const authored = input.rows.map((row) => row.name);

  return [
    ...(input.installed.length === 0
      ? [`the installed declarations have no ${input.interfaceName} body`]
      : []),
    ...duplicates(authored).map(
      (name) => `${input.interfaceName}: ${name} is documented twice`,
    ),
    ...differences(authored, input.installed).map(
      (name) =>
        `${input.interfaceName}: ${name} is documented but not declared`,
    ),
    ...differences(input.installed, [...authored, ...input.excluded]).map(
      (name) => `${input.interfaceName}: ${name} is declared but undocumented`,
    ),
  ];
};

/**
 * Every way this module can disagree with the installed runtime, in both
 * directions. Pure, so `test-surface.test.ts` feeds it fixtures per rule and the
 * real declarations for the run.
 */
export const testingViolations = (input: {
  readonly declarations: string;
  readonly window: ReadonlyArray<TestingField>;
  readonly excludedWindow: ReadonlyArray<ExcludedTestingField>;
  readonly element: ReadonlyArray<TestingField>;
  readonly groups: ReadonlyArray<TestingGroup>;
  readonly excludedMethods: ReadonlyArray<ExcludedTestingMethod>;
  readonly absences: ReadonlyArray<TestingAbsence>;
  readonly dependencies: ReadonlyArray<string>;
}): ReadonlyArray<string> => {
  const installedMethods = testRendererMethodNames(input.declarations);
  const documentedMethods = input.groups.flatMap((group) =>
    group.methods.map((method) => method.name),
  );
  const excludedMethods = input.excludedMethods.map((method) => method.name);

  return [
    ...fieldViolations({
      interfaceName: "TestWindowOptions",
      installed: testWindowOptionNames(input.declarations),
      rows: input.window,
      excluded: input.excludedWindow.map((field) => field.name),
    }),
    ...fieldViolations({
      interfaceName: "TestElement",
      installed: interfaceFieldsIn(input.declarations, "TestElement"),
      rows: input.element,
      excluded: [],
    }),
    ...(input.groups.length === 0 ? ["no TestRenderer group is declared"] : []),
    ...duplicates(documentedMethods).map(
      (name) => `TestRenderer: ${name} is documented twice`,
    ),
    ...differences(documentedMethods, installedMethods).map(
      (name) => `TestRenderer: ${name} is documented but not declared`,
    ),
    ...differences(excludedMethods, installedMethods).map(
      (name) => `TestRenderer: ${name} is excluded but not declared`,
    ),
    ...documentedMethods
      .filter((name) => excludedMethods.includes(name))
      .map((name) => `TestRenderer: ${name} is both documented and excluded`),
    ...differences(installedMethods, [
      ...documentedMethods,
      ...excludedMethods,
    ]).map((name) => `TestRenderer: ${name} is declared but undocumented`),
    ...input.absences.flatMap((absence) => {
      const found =
        absence.symbol === undefined
          ? null
          : input.declarations.match(absence.symbol);
      const symbolViolation =
        found === null || found === undefined
          ? []
          : [
              `${absence.subject}: the page says it is absent, but the declarations now contain ${found[0]}`,
            ];
      const dependencyViolations = (absence.deniedDependencies ?? []).flatMap(
        (dependency) =>
          input.dependencies.includes(dependency)
            ? [
                `${absence.subject}: the workspace installs ${dependency}, but the page says it is absent`,
              ]
            : [],
      );
      return [...symbolViolation, ...dependencyViolations];
    }),
  ];
};
