/**
 * The frame loop and the application lifecycle (plan 637).
 *
 * `@gpuix/react@0.10.0` owns how an app runs: `render()` creates the renderer,
 * opens the window, starts a paced `tick()` loop and mounts the tree;
 * `startFrameLoop` is that loop; `resetRender` tears it down. The site
 * documented the window, the event payload, the test renderer and the driver,
 * but never the loop — measured 2026-10-21, `requiresTick`, `resetRender`,
 * `cpu`, `throttle`, `taskpolicy` and `requestAnimationFrame` returned nothing
 * while `frame loop` and `startFrameLoop` landed on Automation.
 *
 * The rows are authored; the names, signatures, defaults and modes are not.
 * `frame-loop.test.ts` re-derives every one from the installed
 * `@gpuix/react@0.10.0` entry, reconciler, runtime and CPU sources in both
 * directions, so a runtime upgrade fails by name instead of leaving the page
 * guessing. Browser-safe: the sources are passed in, never read here.
 */

export type LifecycleKind = "function" | "constant" | "type" | "interface";

export interface LifecycleExportRow {
  readonly name: string;
  readonly kind: LifecycleKind;
  readonly summary: string;
}

/**
 * Every lifecycle name the React entry exports. The guard compares this list
 * with the entry's own exports filtered to the frame-loop vocabulary, so an
 * added or removed export fails by name.
 */
export const lifecycleExports: ReadonlyArray<LifecycleExportRow> = [
  {
    name: "render",
    kind: "function",
    summary:
      "Mounts the tree into the process-wide slot. The first call creates the renderer, initializes the window, installs the process error handlers and starts the loop; a later call remounts on the same window. Returns a `Root`.",
  },
  {
    name: "createRenderer",
    kind: "function",
    summary:
      "Creates the one `GpuixRenderer` the app paints through, routing native events and errors to the handlers. The three-call recipe calls it before `createRoot` and `startFrameLoop`.",
  },
  {
    name: "createRoot",
    kind: "function",
    summary:
      "The React root over a renderer, with the root event handlers (`onEvent`, `onKeyDown`, `onKeyUp`, `onSelectionChange`, `onUncaughtError`). `render()` uses it, and the three-call recipe passes it the renderer you own.",
  },
  {
    name: "startFrameLoop",
    kind: "function",
    summary:
      "Pumps `tick()` on a paced timer until the last window closes. A no-op when the renderer does not require ticking; the options are `frameMs`, `onTerminated` and `onError`.",
  },
  {
    name: "resetRender",
    kind: "function",
    summary:
      "Stops the loop, unmounts the tree, closes browser automation and clears the process-wide slot. A later `render()` opens a fresh renderer and window.",
  },
  {
    name: "flushSync",
    kind: "function",
    summary:
      "Applies a pending React update synchronously. `render()` uses it for the first commit, so the window paints the tree before the call returns.",
  },
  {
    name: "FrameLoop",
    kind: "interface",
    summary:
      "The handle `startFrameLoop` returns: one method, `stop()`. There is no pause and no resume.",
  },
  {
    name: "Root",
    kind: "interface",
    summary:
      "What `render()` and `createRoot()` return: `render(node)` and `unmount()`.",
  },
  {
    name: "RenderOptions",
    kind: "interface",
    summary:
      "The window options plus the three React-level fields this page owns: `onEvent`, `renderer` and `debugFrameOverlay`.",
  },
  {
    name: "MAC_CPU_THROTTLES",
    kind: "constant",
    summary:
      "The three clamp classes the macOS helper accepts: `utility`, `background` and `maintenance`.",
  },
  {
    name: "MacCpuThrottle",
    kind: "type",
    summary: "The union of those three class names.",
  },
  {
    name: "readMacCpuThrottle",
    kind: "function",
    summary:
      "Reads `THROTTLE`, trims and lowercases it, returns `null` when unset and throws when the value is not one of the three classes.",
  },
  {
    name: "applyMacCpuThrottleFromEnv",
    kind: "function",
    summary:
      "Re-execs the process under `taskpolicy -c <mode>`, marking the child with `GPUIX_CPU_THROTTLE_APPLIED` so it cannot recurse, then exits with the child's status.",
  },
];

/** The lifecycle names, in the order the page's table renders them. */
export const lifecycleExportNames: ReadonlyArray<string> = lifecycleExports.map(
  (row) => row.name,
);

export interface LoopOptionRow {
  readonly name: string;
  readonly type: string;
  readonly default: string;
  readonly summary: string;
}

export const loopOptions: ReadonlyArray<LoopOptionRow> = [
  {
    name: "frameMs",
    type: "number",
    default: "8 (DEFAULT_FRAME_MS)",
    summary:
      "The per-frame budget in milliseconds. The next tick is scheduled only after the current one returns, waiting `frameMs` minus the time the tick took, so a slow frame delays the next instead of queueing timers.",
  },
  {
    name: "onTerminated",
    type: "() => void",
    default: "—",
    summary:
      "Called once when `tick()` returns `false`, after the loop stops. `render()` passes `process.exit(0)`, so the last window closing ends the process.",
  },
  {
    name: "onError",
    type: "(error: unknown) => void",
    default: "—",
    summary:
      "Receives a throw from `tick()`. The loop keeps its timer, because on macOS that timer is the AppKit pump: a dead timer freezes the window.",
  },
];

/** The loop's default budget, compared with `DEFAULT_FRAME_MS` by the guard. */
export const defaultFrameMs = 8;

export interface TickRow {
  readonly name: string;
  readonly signature: string;
  readonly summary: string;
}

export const tickContract: ReadonlyArray<TickRow> = [
  {
    name: "init",
    signature: "init(options?: WindowOptions): void",
    summary:
      "Opens the window with the options `render()` receives. Called once, on the first `render()` or by the three-call recipe.",
  },
  {
    name: "tick",
    signature: "tick(): boolean",
    summary:
      "Pumps the native event loop and asks GPUI for a frame. Returns `false` after the last window closes.",
  },
  {
    name: "requiresTick",
    signature: "requiresTick(): boolean",
    summary:
      "Whether JavaScript must keep calling `tick()`. macOS pumps AppKit; Windows and Linux only report whether the UI thread is still inside `Platform::run`.",
  },
  {
    name: "isInitialized",
    signature: "isInitialized(): boolean",
    summary: "Whether `init()` has opened the window.",
  },
];

export interface RenderOptionRow {
  readonly name: string;
  readonly type: string;
  readonly owner: string;
  readonly ownerHref: string;
  readonly summary: string;
}

/** The three React-level `render()` options; window options belong to Window. */
export const renderOptions: ReadonlyArray<RenderOptionRow> = [
  {
    name: "onEvent",
    type: "(event: EventPayload) => void",
    owner: "Events",
    ownerHref: "/docs/events",
    summary:
      "The raw event tap, before any element handler runs. Events owns the payload's fields.",
  },
  {
    name: "renderer",
    type: "NativeRenderer",
    owner: "Testing your components",
    ownerHref: "/docs/testing",
    summary:
      "Paint into a renderer you own instead of creating a window. Passing one also skips the frame loop.",
  },
  {
    name: "debugFrameOverlay",
    type: "DebugFrameOverlayMode",
    owner: "Application window",
    ownerHref: "/docs/window",
    summary:
      "The GPUI scene overlay: `hidden`, `minimal` or `full`. Window owns the overlay and its measured statistics.",
  },
];

export interface CpuThrottleRow {
  readonly mode: string;
  readonly summary: string;
}

/**
 * The modes are the runtime's list. It passes the mode to `taskpolicy -c` and
 * documents no ordering between them, so this table does not invent one.
 */
export const cpuThrottles: ReadonlyArray<CpuThrottleRow> = [
  {
    mode: "utility",
    summary: "`THROTTLE=utility` re-execs under `taskpolicy -c utility`.",
  },
  {
    mode: "background",
    summary: "`THROTTLE=background` re-execs under `taskpolicy -c background`.",
  },
  {
    mode: "maintenance",
    summary:
      "`THROTTLE=maintenance` re-execs under `taskpolicy -c maintenance`.",
  },
];

export const throttleEnvironmentVariable = "THROTTLE";
export const throttleAppliedVariable = "GPUIX_CPU_THROTTLE_APPLIED";

export interface LoopAbsence {
  readonly subject: string;
  readonly statement: string;
}

export const loopAbsences: ReadonlyArray<LoopAbsence> = [
  {
    subject: "requestAnimationFrame",
    statement:
      "There is no `requestAnimationFrame`. The loop is a `setTimeout` chain, so a component cannot hook a frame.",
  },
  {
    subject: "vsync",
    statement:
      "No vsync, refresh-rate or frame-callback query. The pace is a millisecond budget, not a display signal.",
  },
  {
    subject: "pause and resume",
    statement:
      "`FrameLoop` has one operation, `stop()`. There is no pause or resume; the last window closing is what terminates the process.",
  },
  {
    subject: "the loop handle from render",
    statement:
      "`render()` returns a `Root`, not the loop, so an app that must own the pace calls `createRenderer`, `createRoot` and `startFrameLoop` itself.",
  },
  {
    subject: "frame time",
    statement:
      "No JavaScript frame-time or frame-rate read. `getDebugFrameOverlayStats()` on the renderer is the recorded data path, and Window owns it.",
  },
  {
    subject: "automatic remount",
    statement:
      "No automatic remount after an uncaught render error. The runtime paints an error overlay whose Reload control remounts the last tree; Troubleshooting owns that path.",
  },
  {
    subject: "cpu clamp outside macOS",
    statement:
      "The CPU clamp is macOS only: `applyMacCpuThrottleFromEnv` throws on any other platform.",
  },
];

export const loopAbsenceSubjects: ReadonlyArray<string> = loopAbsences.map(
  (row) => row.subject,
);

export interface FrameLoopInput {
  /** Installed `@gpuix/react/dist/index.d.ts`. */
  readonly reactEntry: string;
  /** Installed `@gpuix/react/dist/reconciler/renderer.js`. */
  readonly reactRenderer: string;
  /** Installed `@gpuix/react/dist/reconciler/renderer.d.ts`. */
  readonly reactRendererDeclarations: string;
  /** Installed `@gpuix/native/dist/runtime.d.ts`. */
  readonly nativeRuntimeDeclarations: string;
  /** Installed `@gpuix/native/dist/runtime.js`. */
  readonly nativeRuntimeSource: string;
  /** Installed `@gpuix/native/index.d.ts`. */
  readonly nativeDeclarations: string;
  /** Installed `@gpuix/native/dist/cpu-throttle.js`. */
  readonly nativeCpuThrottleSource: string;
  /** Every installed `@gpuix/react/dist/**\/*.js` file. */
  readonly reactDistSources: ReadonlyArray<string>;
}

/** The exports whose names put them in this page's vocabulary. */
const LIFECYCLE_NAME =
  /(?:FrameLoop|Throttle|THROTTLE|RenderOptions|^render$|^Root$|^flushSync$|^createRoot$|^createRenderer$|^resetRender$|^startFrameLoop$)/u;

/** The identifiers an `export { … }` declaration re-exports. */
const exportedNames = (declarations: string): ReadonlyArray<string> =>
  [...declarations.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/gu)]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map(
      (entry) =>
        entry
          .trim()
          .replace(/^type\s+/u, "")
          .split(/\s+as\s+/u)
          .pop() ?? "",
    )
    .filter((name) => name.length > 0);

/** The keys of an object type body, for one `options?: { … }` parameter. */
const objectKeys = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\s*([A-Za-z_$][\w$]*)\??:/gmu)].map(
    (match) => match[1] ?? "",
  );

/** The body between a declaration's opening brace and its matching close. */
const blockAfter = (source: string, opening: string): string => {
  const start = source.indexOf(opening);
  if (start < 0) return "";
  const from = source.indexOf("{", start);
  if (from < 0) return "";
  // A character scan, not collection iteration: brace depth has to be read in
  // order, and the declaration bodies this module inspects do not nest.
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(from + 1, index);
  }
  return "";
};

const sameSet = (
  label: string,
  claimed: ReadonlyArray<string>,
  installed: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const claimedSet = new Set(claimed);
  const installedSet = new Set(installed);
  const missing = [...claimedSet].filter((name) => !installedSet.has(name));
  const extra = [...installedSet].filter((name) => !claimedSet.has(name));
  return [
    ...missing.map((name) => `${label}: ${name} is claimed but not present`),
    ...extra.map((name) => `${label}: ${name} is present but has no row`),
  ];
};

/**
 * Every mismatch between this page's rows and the installed runtime, as a
 * message naming the member. An empty list means the page and the dependency
 * agree (plan 637).
 */
export const frameLoopViolations = (
  input: FrameLoopInput,
): ReadonlyArray<string> => {
  const violations: Array<string> = [];

  // 1. The lifecycle exports exist, and the page lists all of them.
  violations.push(
    ...sameSet(
      "exports",
      lifecycleExportNames,
      exportedNames(input.reactEntry).filter((name) =>
        LIFECYCLE_NAME.test(name),
      ),
    ),
  );

  // 2. The loop's options and handle.
  const optionsStart =
    input.nativeRuntimeDeclarations.indexOf("startFrameLoop(");
  const optionsBlock =
    optionsStart < 0
      ? ""
      : blockAfter(
          input.nativeRuntimeDeclarations.slice(optionsStart),
          "options?:",
        );
  violations.push(
    ...sameSet(
      "loop options",
      loopOptions.map((row) => row.name),
      objectKeys(optionsBlock),
    ),
  );
  const frameLoopBlock = blockAfter(
    input.nativeRuntimeDeclarations,
    "export interface FrameLoop",
  );
  const frameLoopMembers = [
    ...frameLoopBlock.matchAll(/^\s*(\w+)\s*\(/gmu),
  ].map((match) => match[1] ?? "");
  if (frameLoopMembers.join(",") !== "stop") {
    violations.push(
      `loop handle: expected only stop(), found ${frameLoopMembers.join(", ") || "nothing"}`,
    );
  }

  // 3. The pacing rule this page describes.
  const defaultFrame = /const DEFAULT_FRAME_MS = (\d+);/u.exec(
    input.nativeRuntimeSource,
  );
  if (Number(defaultFrame?.[1]) !== defaultFrameMs) {
    violations.push(
      `pacing: DEFAULT_FRAME_MS is ${defaultFrame?.[1] ?? "absent"}, the page states ${defaultFrameMs}`,
    );
  }
  const pacing: ReadonlyArray<readonly [string, string]> = [
    ["early return", "if (!renderer.requiresTick())"],
    ["scheduling", "Math.max(0, frameMs - (performance.now() - started))"],
    ["try", "try {"],
    ["tick", "running = renderer.tick();"],
    ["stop on false", "if (running === false)"],
    ["termination", "options.onTerminated?.()"],
  ];
  violations.push(
    ...pacing
      .filter(([, needle]) => !input.nativeRuntimeSource.includes(needle))
      .map(([label, needle]) => `pacing: ${label} (${needle}) is absent`),
  );

  // 4. The renderer methods the page's tick table names.
  const rendererBlock = blockAfter(
    input.nativeDeclarations,
    "export declare class GpuixRenderer",
  );
  violations.push(
    ...tickContract
      .filter((row) => {
        const declares = new RegExp(`\\b${row.name}\\(`, "u");
        if (!declares.test(rendererBlock)) return true;
        return (
          row.signature.endsWith(": boolean") &&
          !new RegExp(`\\b${row.name}\\([^)]*\\): boolean`, "u").test(
            rendererBlock,
          )
        );
      })
      .map((row) => `tick: ${row.name} is not declared as ${row.signature}`),
  );

  // 5. The React-level render options, and the two parents they extend.
  const renderOptionsBlock = blockAfter(
    input.reactRendererDeclarations,
    "export interface RenderOptions",
  );
  violations.push(
    ...sameSet(
      "render options",
      renderOptions.map((row) => row.name),
      objectKeys(renderOptionsBlock),
    ),
  );
  violations.push(
    ...["WindowOptions", "WindowKeyEventHandlers"]
      .filter(
        (parent) =>
          !new RegExp(`export interface RenderOptions[^{]*${parent}`, "u").test(
            input.reactRendererDeclarations,
          ),
      )
      .map(
        (parent) => `render options: RenderOptions no longer extends ${parent}`,
      ),
  );

  // 6. What render() does — the remount, the loop and the exit.
  const renderSteps: ReadonlyArray<readonly [string, string]> = [
    ["remount", "slot.root.unmount()"],
    ["loop", "startFrameLoop(host"],
    ["exit", "process.exit(0)"],
    ["remount log", "[gpuix] remount: unmount previous tree"],
  ];
  violations.push(
    ...renderSteps
      .filter(([, needle]) => !input.reactRenderer.includes(needle))
      .map(([label, needle]) => `render(): ${label} (${needle}) is absent`),
  );

  // 7. The macOS clamp: the mode list, the two variables and the errors.
  const modes = /export const MAC_CPU_THROTTLES = \[([^\]]*)\];/u.exec(
    input.nativeCpuThrottleSource,
  );
  violations.push(
    ...sameSet(
      "cpu modes",
      cpuThrottles.map((row) => row.mode),
      [...(modes?.[1] ?? "").matchAll(/"([^"]+)"/gu)].map(
        (match) => match[1] ?? "",
      ),
    ),
  );
  const clampFacts: ReadonlyArray<readonly [string, string]> = [
    ["THROTTLE", "process.env.THROTTLE"],
    ["applied variable", "process.env.GPUIX_CPU_THROTTLE_APPLIED"],
    ["taskpolicy", '"taskpolicy"'],
    ["platform error", "needs macOS taskpolicy"],
    ["worker error", "must wrap the vitest process"],
  ];
  violations.push(
    ...clampFacts
      .filter(([, needle]) => !input.nativeCpuThrottleSource.includes(needle))
      .map(([label, needle]) => `cpu clamp: ${label} (${needle}) is absent`),
  );
  const entryExports = exportedNames(input.reactEntry);
  violations.push(
    ...["MAC_CPU_THROTTLES", "readMacCpuThrottle", "applyMacCpuThrottleFromEnv"]
      .filter((name) => !entryExports.includes(name))
      .map((name) => `cpu clamp: @gpuix/react no longer exports ${name}`),
  );

  // 8. The absences the page states.
  const frames = input.reactDistSources.filter((source) =>
    /requestAnimationFrame|\bvsync\b/iu.test(source),
  );
  if (frames.length > 0) {
    violations.push(
      `absence: a React dist file now uses requestAnimationFrame or vsync (${frames.length} file(s))`,
    );
  }
  if (/\b(?:pause|resume)\s*\(/u.test(frameLoopBlock)) {
    violations.push("absence: FrameLoop gained pause/resume");
  }
  if (
    !/export declare function render\(node: ReactNode, options\?: RenderOptions\): Root;/u.test(
      input.reactRendererDeclarations,
    )
  ) {
    violations.push("absence: render() no longer returns Root");
  }
  if (/\b(?:frameTime|frameRate|fps)\b/u.test(input.nativeDeclarations)) {
    violations.push(
      "absence: the renderer declarations gained a frame-time read",
    );
  }

  return violations;
};
