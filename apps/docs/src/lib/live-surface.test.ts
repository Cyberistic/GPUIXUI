import { readFileSync } from "node:fs";
import { themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  liveBanner,
  liveButtonFill,
  liveIds,
  livePressBatch,
  livePressedFill,
  liveRestingFill,
  liveScene,
  type LiveOp,
} from "./live-batch";

/**
 * `/live`'s screen, and the route that mounts it.
 *
 * The page is the one surface on the site whose pixels come from GPUix, so the
 * batch it feeds the renderer is what the reader actually sees. Two things can
 * go wrong silently: a style that drifts from the library's recipe (the batch is
 * hand-written, so nothing would fail), and a listener that stops being
 * registered (the button still paints). The probe measures both in a browser;
 * these cases hold the same claims in Node, where the failure names the op.
 */

const root = new URL("../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const theme = themes.dark;
const box = { width: 1_000, height: 700 } as const;

/** The closed mutation set `applyBatch` documents. */
const operations = new Set([
  "createElement",
  "destroyElement",
  "appendChild",
  "insertBefore",
  "setStyle",
  "setText",
  "setEventListener",
  "setRoot",
  "setKeyboardFocusDim",
  "setCustomProp",
]);

const ops = liveScene(theme, box);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The style the batch sets on an element, if it sets one. */
const styleOf = (
  batch: ReadonlyArray<LiveOp>,
  id: number,
): Record<string, unknown> | undefined => {
  const style = batch.find(
    (entry) => entry[0] === "setStyle" && entry[1] === id,
  )?.[2];
  return isRecord(style) ? style : undefined;
};

describe("the live surface's batch", () => {
  it("uses only the protocol's own operations", () => {
    const unknown = [...liveScene(theme, box), ...livePressBatch(theme, 1)]
      .map((op) => op[0])
      .filter((name) => !operations.has(String(name)));

    // An operation the renderer does not parse is dropped without a word, so a
    // typo paints less than the page promises.
    expect(unknown).toEqual([]);
  });

  it("paints the button in the role controlStyle resolves", () => {
    // Not a re-read of `liveButtonFill`: the check is that the batch's own op
    // carries the theme's primary, which is the fill the recipe resolves.
    expect(styleOf(ops, liveIds.button)?.backgroundColor).toBe(
      theme.colors.primary,
    );
    expect(liveButtonFill(theme)).toBe(theme.colors.primary);
  });

  it("registers the press listener on the button, and only there", () => {
    const listeners = ops.filter((op) => op[0] === "setEventListener");
    const clickOnButton = listeners.filter(
      (op) => op[1] === liveIds.button && op[2] === "click",
    );

    // The probe presses through the renderer's input path; without this op the
    // press reaches nothing and the page looks exactly the same.
    expect(listeners).toHaveLength(1);
    expect(clickOnButton).toHaveLength(1);
    expect(read("src/components/docs/live-surface.tsx")).toContain(
      'field("eventType") !== "click"',
    );
  });

  it("sets the root once, after the tree it holds", () => {
    const rootOp = ops.findIndex((op) => op[0] === "setRoot");
    const lastAppend = ops.reduce(
      (last, op, index) => (op[0] === "appendChild" ? index : last),
      -1,
    );

    expect(rootOp).toBe(ops.length - 1);
    expect(lastAppend).toBeLessThan(rootOp);
  });

  it("changes the banner to a fill the probe can tell from the resting one", () => {
    const pressed = styleOf(livePressBatch(theme, 1), liveIds.banner);

    expect(pressed?.backgroundColor).toBe(livePressedFill(theme));
    expect(styleOf(ops, liveIds.banner)?.backgroundColor).toBe(
      liveRestingFill(theme),
    );
    expect(livePressedFill(theme)).not.toBe(liveRestingFill(theme));
    expect(pressed?.height).toBe(liveBanner.height);
  });

  it("counts the press in the sentence a reader sees", () => {
    const status = (presses: number): unknown =>
      livePressBatch(theme, presses).find(
        (op) => op[0] === "setText" && op[1] === liveIds.status,
      )?.[2];

    expect(status(1)).toBe("Pressed 1 time");
    expect(status(2)).toBe("Pressed 2 times");
  });
});

describe("the live surface's route", () => {
  it("boots the renderer once, inside the effect", () => {
    const surface = read("src/components/docs/live-surface.tsx");
    const sources = [
      surface,
      read("src/routes/live.tsx"),
      read("src/lib/live-batch.ts"),
    ].join("\n");

    // The platform refuses a second surface, and a module-scope import would
    // evaluate the wasm in the Worker.
    expect(sources.match(/new glue\.GpuixRenderer\(/g) ?? []).toHaveLength(1);
    expect(sources.match(/\.init\(\{\}\)/g) ?? []).toHaveLength(1);
    expect(surface).toContain(
      'await import("@gpuix/native/wasm/gpuix-web.js")',
    );
    expect(surface.indexOf("useEffect")).toBeLessThan(
      surface.indexOf("await import("),
    );
  });

  it("says what the surface is, and what a browser without a backend reads", () => {
    const surface = read("src/components/docs/live-surface.tsx");

    expect(surface).toContain("not the native macOS runtime");
    expect(surface).toContain("has no WebGPU or WebGL2");
    expect(surface).toContain("already running");
    expect(read("src/routes/live.tsx")).toContain("<LiveSurface />");
  });

  it("isolates /live in development and in production, and nothing else", () => {
    const vite = read("vite.config.ts");
    const start = read("src/start.ts");
    const headers = [
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Embedder-Policy",
    ];

    // The wasm shares its memory; without both headers it never starts.
    for (const header of headers) {
      expect(vite).toContain(header);
      expect(start.toLowerCase()).toContain(header.toLowerCase());
    }

    // Both are scoped to the one route: isolating /docs would lock the rest of
    // the site's embeds for a renderer it never loads.
    expect(vite).toContain('startsWith("/live")');
    expect(start).toContain('pathname.startsWith("/live")');
    expect(start).toContain(
      'if (!pathname.startsWith("/live")) return response;',
    );
  });

  it("links the real surface from every component preview's honesty note", () => {
    // A reader who has just been told "this is a drawing" is the reader who
    // wants the real thing; the link cannot be retired while /live exists.
    expect(read("src/components/docs/component-preview.tsx")).toContain(
      'href="/live"',
    );
    expect(read("src/routes/live.tsx")).toContain("LiveSurface");
  });

  it("resolves the wasm past the package's exports, in one place", () => {
    const vite = read("vite.config.ts");

    expect(vite).toContain("@gpuix/native/wasm/");
    expect(vite).toContain('"gpuix-web-wasm"');
    expect(read("tsconfig.json")).toContain('"@gpuix/native/wasm/*"');
  });
});
