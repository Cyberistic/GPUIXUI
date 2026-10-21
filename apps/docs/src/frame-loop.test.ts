import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Schema from "effect/Schema";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CpuThrottleTable,
  LoopAbsences,
  LoopFunctions,
  LoopOptions,
  RenderOptionsTable,
  TickContract,
} from "./components/frame-loop-tables";
import {
  cpuThrottles,
  defaultFrameMs,
  frameLoopViolations as violations,
  lifecycleExports,
  loopAbsences,
  loopOptions,
  renderOptions,
  tickContract,
} from "./lib/frame-loop";
import { frameLoopSearchEntry } from "./lib/frame-loop-search";
import {
  installedNativeDeclarations,
  installedNativeRoot,
  installedReactDeclarations,
} from "./lib/native-declarations.testing";
import {
  installedReactDistSources,
  installedReactRendererDeclarations,
  installedReactRendererSource,
} from "./lib/react-declarations.testing";
import { generatedSearchEntries, search } from "./lib/search";

/**
 * Guards the Frame loop page (plan 637). The bug being prevented is the app's
 * own runtime having no owner: measured 2026-10-21, `requiresTick`,
 * `resetRender`, `cpu`, `throttle`, `taskpolicy`, `flushSync` and
 * `requestAnimationFrame` returned nothing, `frame loop` and `startFrameLoop`
 * landed on Automation, `hot reload` on Hotkey input, and `/docs/window`
 * claimed a second `render()` throws while the installed source remounts.
 *
 * These cases fail when the runtime adds, renames or removes a lifecycle export,
 * a loop option, a renderer method or a CPU clamp mode; when the pacing rule or
 * the remount disappears; when a promised absence appears; when the page invents
 * a field; when a section, table or example leaves the page; or when a query is
 * stolen from Performance, Testing, Window or Automation. `node:fs` is a
 * test-only boundary import, as in `events.test.ts`: the docs bundle must never
 * import the native runtime.
 */
const appRoot = new URL("../", import.meta.url);
const nativeRoot = installedNativeRoot();

const source = (path: string): string =>
  readFileSync(new URL(`content/docs/${path}`, appRoot), "utf8");

const FRAME_LOOP_PAGE = source("frame-loop.mdx");
const WINDOW_PAGE = source("window.mdx");
const META = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
)(source("meta.json"));
const MDX_REGISTRY = readFileSync(
  new URL("src/components/mdx.tsx", appRoot),
  "utf8",
);

const reactEntry = installedReactDeclarations();
const realInput = {
  reactEntry,
  reactRenderer: installedReactRendererSource(),
  reactRendererDeclarations: installedReactRendererDeclarations(),
  nativeRuntimeDeclarations: readFileSync(
    join(nativeRoot, "dist/runtime.d.ts"),
    "utf8",
  ),
  nativeRuntimeSource: readFileSync(
    join(nativeRoot, "dist/runtime.js"),
    "utf8",
  ),
  nativeDeclarations: installedNativeDeclarations().join("\n"),
  nativeCpuThrottleSource: readFileSync(
    join(nativeRoot, "dist/cpu-throttle.js"),
    "utf8",
  ),
  reactDistSources: installedReactDistSources(),
};

const messages = (
  overrides: Partial<typeof realInput> = {},
): ReadonlyArray<string> => violations({ ...realInput, ...overrides });

/** Resolve a page URL through the real search merge. */
const firstUrl = async (query: string): Promise<string> => {
  const results = await search(query, 3);
  return results[0]?.url ?? "(none)";
};

describe("the frame-loop surface", () => {
  it("agrees with the installed runtime", () => {
    expect(messages()).toEqual([]);
  });

  it("documents every lifecycle export exactly once", () => {
    const names = lifecycleExports.map((row) => row.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("startFrameLoop");
    expect(names).toContain("applyMacCpuThrottleFromEnv");
  });

  it("fails when the entry loses an export", () => {
    const changed = messages({
      reactEntry: reactEntry.replace(/\s*startFrameLoop,/u, ""),
    });
    expect(changed.join("\n")).toContain(
      "exports: startFrameLoop is claimed but not present",
    );
  });

  it("fails when the entry gains a lifecycle export", () => {
    const changed = messages({
      reactEntry: reactEntry.replace(
        'export { createRoot, flushSync } from "./reconciler/index.js";',
        'export { createRoot, flushSync, pauseFrameLoop } from "./reconciler/index.js";',
      ),
    });
    expect(changed.join("\n")).toContain(
      "exports: pauseFrameLoop is present but has no row",
    );
  });

  it("fails when the loop gains an option", () => {
    const changed = messages({
      nativeRuntimeDeclarations: realInput.nativeRuntimeDeclarations.replace(
        /options\?: \{/u,
        "options?: {\n    intervalMs?: number;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "loop options: intervalMs is present but has no row",
    );
  });

  it("fails when the handle gains a pause", () => {
    const changed = messages({
      nativeRuntimeDeclarations: realInput.nativeRuntimeDeclarations.replace(
        "export interface FrameLoop {",
        "export interface FrameLoop {\n    pause(): void;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "loop handle: expected only stop(), found pause, stop",
    );
  });

  it("fails when the default budget moves", () => {
    const changed = messages({
      nativeRuntimeSource: realInput.nativeRuntimeSource.replace(
        `const DEFAULT_FRAME_MS = ${defaultFrameMs};`,
        "const DEFAULT_FRAME_MS = 16;",
      ),
    });
    expect(changed.join("\n")).toContain(
      `pacing: DEFAULT_FRAME_MS is 16, the page states ${defaultFrameMs}`,
    );
  });

  it("fails when the loop stops pacing", () => {
    const changed = messages({
      nativeRuntimeSource: realInput.nativeRuntimeSource.replace(
        "Math.max(0, frameMs - (performance.now() - started))",
        "0",
      ),
    });
    expect(changed.join("\n")).toContain("pacing: scheduling");
  });

  it("fails when a tick method changes its return", () => {
    const changed = messages({
      nativeDeclarations: realInput.nativeDeclarations.replace(
        "tick(): boolean",
        "tick(): void",
      ),
    });
    expect(changed.join("\n")).toContain(
      "tick: tick is not declared as tick(): boolean",
    );
  });

  it("fails when render() gains a React-level option", () => {
    const changed = messages({
      reactRendererDeclarations: realInput.reactRendererDeclarations.replace(
        "export interface RenderOptions extends WindowOptions, WindowKeyEventHandlers {",
        "export interface RenderOptions extends WindowOptions, WindowKeyEventHandlers {\n    onError?: (error: unknown) => void;",
      ),
    });
    expect(changed.join("\n")).toContain(
      "render options: onError is present but has no row",
    );
  });

  it("fails when the remount disappears from render()", () => {
    const changed = messages({
      reactRenderer: realInput.reactRenderer.replace("slot.root.unmount()", ""),
    });
    expect(changed.join("\n")).toContain(
      "render(): remount (slot.root.unmount()) is absent",
    );
  });

  it("fails when a CPU clamp mode is removed", () => {
    const changed = messages({
      nativeCpuThrottleSource: realInput.nativeCpuThrottleSource.replace(
        '"utility", "background", "maintenance"',
        '"utility", "background"',
      ),
    });
    expect(changed.join("\n")).toContain(
      "cpu modes: maintenance is claimed but not present",
    );
  });

  it("fails when the runtime grows a frame callback", () => {
    const changed = messages({
      reactDistSources: [
        ...realInput.reactDistSources,
        "requestAnimationFrame(loop)",
      ],
    });
    expect(changed.join("\n")).toContain(
      "a React dist file now uses requestAnimationFrame or vsync",
    );
  });
});

describe("the Frame loop page", () => {
  it("is ordered in the sidebar after the window page", () => {
    const pages = [...META.pages];
    expect(pages.indexOf("frame-loop")).toBe(pages.indexOf("window") + 1);
  });

  it("registers and renders every generated table", () => {
    const tags = [
      "LoopFunctions",
      "LoopOptions",
      "TickContract",
      "RenderOptionsTable",
      "CpuThrottleTable",
      "LoopAbsences",
    ];
    expect(tags.filter((tag) => !MDX_REGISTRY.includes(tag))).toEqual([]);
    expect(
      tags.filter((tag) => !FRAME_LOOP_PAGE.includes(`<${tag} />`)),
    ).toEqual([]);
  });

  it("keeps every section the page promises", () => {
    const headings = [
      "## What render() does",
      "## Remounting and hot reload",
      "## The loop",
      "## Tick, and why the platform matters",
      "## The default budget",
      "## Stopping the loop",
      "## What render() takes",
      "## CPU limits on macOS",
      "## What is not provided",
      "## Related",
    ];
    expect(
      headings.filter((heading) => !FRAME_LOOP_PAGE.includes(heading)),
    ).toEqual([]);
  });

  it("renders every declared row, not an empty table", () => {
    const exports = renderToStaticMarkup(createElement(LoopFunctions));
    const options = renderToStaticMarkup(createElement(LoopOptions));
    const tick = renderToStaticMarkup(createElement(TickContract));
    const render = renderToStaticMarkup(createElement(RenderOptionsTable));
    const cpu = renderToStaticMarkup(createElement(CpuThrottleTable));
    const absences = renderToStaticMarkup(createElement(LoopAbsences));

    expect(exports.match(/data-frame-loop-export=/gu)).toHaveLength(
      lifecycleExports.length,
    );
    expect(options.match(/data-frame-loop-option=/gu)).toHaveLength(
      loopOptions.length,
    );
    expect(tick.match(/data-frame-loop-method=/gu)).toHaveLength(
      tickContract.length,
    );
    expect(render.match(/data-frame-loop-render-option=/gu)).toHaveLength(
      renderOptions.length,
    );
    expect(cpu.match(/data-frame-loop-throttle=/gu)).toHaveLength(
      cpuThrottles.length,
    );
    expect(absences.match(/data-frame-loop-absence=/gu)).toHaveLength(
      loopAbsences.length,
    );
  });

  it("carries a compiled example and no placeholder", () => {
    expect(FRAME_LOOP_PAGE).toContain("```tsx");
    expect(FRAME_LOOP_PAGE).toContain("startFrameLoop(");
    expect(FRAME_LOOP_PAGE).not.toMatch(
      /\bTODO\b|\bplaceholder\b|\bcoming soon\b/iu,
    );
  });

  it("states the budget as nominal, never as a measured rate", () => {
    expect(FRAME_LOOP_PAGE).toContain("nominal budget");
    expect(FRAME_LOOP_PAGE).toMatch(/this site has\s+recorded none/u);
    expect(FRAME_LOOP_PAGE).toContain("/docs/performance");
  });

  it("links the pages that own the neighbouring subjects", () => {
    const links = [
      "/docs/window",
      "/docs/window#the-frame-overlay",
      "/docs/performance",
      "/docs/automation",
      "/docs/testing",
      "/docs/events",
      "/docs/troubleshooting",
    ];
    expect(links.filter((link) => !FRAME_LOOP_PAGE.includes(link))).toEqual([]);
  });
});

describe("the pages that used to misstate the loop", () => {
  it("Window describes a remount instead of a second-render throw", () => {
    expect(WINDOW_PAGE).not.toContain("a second `render()` throws");
    expect(WINDOW_PAGE).toContain("remount");
    expect(WINDOW_PAGE).toContain("/docs/frame-loop");
  });

  it("no other page claims a measured frame rate", () => {
    const pages = ["testing", "automation", "architecture", "window"];
    expect(
      pages.filter((page) => /\b\d+\s?fps\b/iu.test(source(`${page}.mdx`))),
    ).toEqual([]);
  });
});

describe("the Frame loop search document", () => {
  it("is one of the generated documents", () => {
    expect(generatedSearchEntries).toContain(frameLoopSearchEntry);
  });

  it("promotes the runtime's names, not plain words or another page's owner", () => {
    expect(frameLoopSearchEntry.names).toContain("startFrameLoop");
    expect(frameLoopSearchEntry.names).toContain("requiresTick");
    expect(frameLoopSearchEntry.names).toContain("MAC_CPU_THROTTLES");
    expect(frameLoopSearchEntry.names).not.toContain("render");
    expect(frameLoopSearchEntry.names).not.toContain("tick");
    expect(frameLoopSearchEntry.names).not.toContain("createRoot");
    expect(frameLoopSearchEntry.names).not.toContain("fps");
  });
});

describe("a reader's loop query reaches the page", { timeout: 120_000 }, () => {
  it.each([
    "frame loop",
    "frame pacing",
    "frame budget",
    "tick loop",
    "hot reload",
    "hot reloading",
    "process lifecycle",
    "app lifecycle",
    "cpu",
    "cpu usage",
    "cpu throttle",
    "limit cpu",
    "throttle",
    "background throttle",
    "taskpolicy",
    "why does the app exit",
    "requestAnimationFrame",
    "request animation frame",
    "startFrameLoop",
    "requiresTick",
    "resetRender",
    "flushSync",
    "isInitialized",
    "applyMacCpuThrottleFromEnv",
    "readMacCpuThrottle",
    "MAC_CPU_THROTTLES",
  ])("%s → /docs/frame-loop", async (query) => {
    expect(await firstUrl(query)).toBe("/docs/frame-loop");
  });
});

describe("the queries whose owners must not move", { timeout: 120_000 }, () => {
  it.each([
    ["fps", "/docs/performance"],
    ["frame rate", "/docs/performance"],
    ["benchmark", "/docs/performance"],
    ["test render loop", "/docs/testing"],
    ["createRoot", "/docs/testing"],
    ["frame overlay", "/docs/window"],
    ["debug frame overlay", "/docs/window"],
    ["closing the window", "/docs/window"],
    ["createNativeRenderer", "/docs/automation"],
    ["enableAutomation", "/docs/automation"],
    ["tick", "/docs/components/checkbox"],
  ])("%s → %s", async (query, url) => {
    expect((await firstUrl(query)).startsWith(url)).toBe(true);
  });
});
