import {
  isDistinctiveName,
  type GeneratedSearchEntry,
} from "./generated-search";
import {
  cpuThrottles,
  defaultFrameMs,
  lifecycleExports,
  loopAbsences,
  loopOptions,
  renderOptions,
  tickContract,
} from "./frame-loop";

/**
 * The Frame loop page renders its tables from `frame-loop.ts`, so the page index
 * cannot see the exports, options or renderer methods (plan 637). The simple
 * index also tokenises `startFrameLoop`, `requiresTick` and `frameMs` as single
 * words, so distinctive names are promoted — the rule plans 587, 635 and 636 set.
 *
 * Only distinctive names are promoted. `render`, `tick`, `createRoot` and
 * `flushSync` stay prose: the first two are plain words with other owners, and
 * the last two are documented by Testing and Window. `fps` and `frame rate`
 * keep Performance, which owns measurement.
 */
export const frameLoopSearchEntry: GeneratedSearchEntry = {
  names: [
    "startFrameLoop",
    "requiresTick",
    "resetRender",
    "createRenderer",
    "frameMs",
    "isInitialized",
    "MAC_CPU_THROTTLES",
    "MacCpuThrottle",
    "readMacCpuThrottle",
    "applyMacCpuThrottleFromEnv",
    "GPUIX_CPU_THROTTLE_APPLIED",
    "THROTTLE",
    "FrameLoop",
    "RenderOptions",
  ].filter(isDistinctiveName),
  index: {
    title: "Frame loop",
    description:
      "How a GPUix app is driven — render and remount, the paced tick loop and its 8 ms budget, what ends the process, how to own or stop the loop, the macOS CPU clamp, and what is not provided.",
    content: [
      ...lifecycleExports.map(
        (row) => `${row.name} (${row.kind}): ${row.summary}`,
      ),
      ...loopOptions.map(
        (row) =>
          `startFrameLoop option ${row.name} (${row.type}, default ${row.default}): ${row.summary}`,
      ),
      ...tickContract.map(
        (row) => `${row.name}: ${row.signature}. ${row.summary}`,
      ),
      ...renderOptions.map(
        (row) => `render() option ${row.name} (${row.type}): ${row.summary}`,
      ),
      `The loop's default budget is ${defaultFrameMs} ms per frame.`,
      ...cpuThrottles.map((row) => `${row.mode}: ${row.summary}`),
      ...loopAbsences.map(
        (absence) => `${absence.subject}: ${absence.statement}`,
      ),
    ].join("\n"),
    url: "/docs/frame-loop",
    breadcrumbs: ["Frame loop"],
    keywords:
      "frame loop frame pacing frame budget tick hot reload remount process exit cpu throttle taskpolicy background throttle",
  },
};
