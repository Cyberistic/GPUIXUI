import { useEffect, useState } from "react";
import {
  liveBanner,
  liveButtonFill,
  liveIds,
  livePressBatch,
  livePressedFill,
  liveRestingFill,
  liveScene,
} from "@/lib/live-batch";
import {
  lookFromSearch,
  platformFromSearch,
  resolvePlatformTheme,
} from "@/lib/platform";
import { readRememberedChoice } from "@/lib/platform-storage";

/**
 * The live GPUix surface.
 *
 * The only page on the site that paints through the renderer rather than a DOM
 * reproduction: `@gpuix/native` ships a wasm build of the same renderer the
 * library runs on, so `/live` boots it, applies a mutation batch built from the
 * library's own `StyleDesc` resolver, and lets a real press reach JavaScript.
 *
 * It is **not** the native macOS runtime, and it is not the React reconciler:
 * the batch protocol is the one the reconciler emits, fed by hand here. The
 * label above the surface says both things; `docs/preview-strategy.md` records
 * why the reconciler mount is still owed.
 *
 * The module is loaded inside the effect, never at module scope, so the server
 * build never evaluates the wasm. The renderer's `applyBatch` takes a JSON
 * string — the wasm boundary, not a domain value — so `JSON.stringify` is the
 * wire encoder here.
 */

/** One mount per page load: the platform owns the canvas and refuses a second. */
let started = false;

type Status =
  | { readonly kind: "starting" }
  | { readonly kind: "painting" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "refused" }
  | { readonly kind: "failed"; readonly message: string };

/** The label a reader sees, and the sentence the guards hold. */
export const liveSurfaceLabel =
  "GPUix web build (WebGPU) — the real renderer in a browser, not the native macOS runtime.";

/** What a browser without either backend reads instead of an empty canvas. */
export const liveUnavailable =
  "This browser has no WebGPU or WebGL2, so the GPUix surface cannot start. The labelled component previews on the other pages still work.";

/** `init()` refuses a second document-level surface, so a reload is the remount. */
export const liveRefused =
  "The GPUix surface is already running in this page. Reload to mount it again.";

interface AdapterSource {
  readonly requestAdapter: () => Promise<unknown>;
}

const isAdapterSource = (value: unknown): value is AdapterSource =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "requestAdapter") === "function";

const hasBackend = async (): Promise<boolean> => {
  const gpu: unknown = Reflect.get(navigator, "gpu");
  if (isAdapterSource(gpu)) {
    const adapter = await gpu.requestAdapter().catch(() => undefined);
    if (adapter !== undefined && adapter !== null) return true;
  }
  const probe = document.createElement("canvas");
  return probe.getContext("webgl2") !== null;
};

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const boxOf = (value: unknown): Box | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const read = (key: string): number | undefined => {
    const field: unknown = Reflect.get(value, key);
    return typeof field === "number" ? field : undefined;
  };
  const x = read("x");
  const y = read("y");
  return x === undefined || y === undefined
    ? undefined
    : { x, y, width: read("width") ?? 0, height: read("height") ?? 0 };
};

const sizeOf = (value: unknown): { width: number; height: number } => {
  if (typeof value === "object" && value !== null) {
    const width: unknown = Reflect.get(value, "width");
    const height: unknown = Reflect.get(value, "height");
    if (typeof width === "number" && typeof height === "number") {
      return { width, height };
    }
  }
  return { width: 900, height: 560 };
};

/** The centre of a laid-out element, in page pixels. */
const centre = (origin: DOMRect, box: Box): { x: number; y: number } => ({
  x: Math.round(origin.left + box.x + box.width / 2),
  y: Math.round(origin.top + box.y + box.height / 2),
});

/** Write the report the probe reads. */
const report = (lines: ReadonlyArray<string>): void => {
  const out = document.getElementById("out");
  if (out !== null) out.textContent = lines.join("\n");
};

const platformOf = () => {
  const search = window.location.search;
  const remembered = readRememberedChoice(window.localStorage);
  return {
    platform: platformFromSearch(search) ?? remembered.platform,
    look: lookFromSearch(search) ?? remembered.look,
  };
};

/** The renderer appends its canvas a frame after `init()`, so wait for it. */
const awaitCanvas = async (): Promise<HTMLCanvasElement | undefined> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const canvas = document.querySelector("canvas");
    if (canvas !== null) return canvas;
    await new Promise((wait) => setTimeout(wait, 50));
  }
  return undefined;
};

export function LiveSurface() {
  const [status, setStatus] = useState<Status>({ kind: "starting" });

  useEffect(() => {
    if (started) {
      setStatus({ kind: "refused" });
      return;
    }
    started = true;
    const choice = platformOf();
    const theme = resolvePlatformTheme(choice.platform, "dark", choice.look);

    const start = async (): Promise<void> => {
      if (!(await hasBackend())) {
        report(["status=unavailable"]);
        setStatus({ kind: "unavailable" });
        return;
      }

      const glue = await import("@gpuix/native/wasm/gpuix-web.js");
      const wasm = await import("@gpuix/native/wasm/gpuix-web_bg.wasm?url");
      await glue.default({ module_or_path: wasm.default });

      let presses = 0;
      const renderer = new glue.GpuixRenderer(
        (...args: ReadonlyArray<unknown>) => {
          const event = args.length > 1 ? args[1] : args[0];
          const field = (key: string): unknown =>
            typeof event === "object" && event !== null
              ? Reflect.get(event, key)
              : undefined;
          // The payload names the event `eventType` and the target `elementId`.
          if (
            field("eventType") !== "click" ||
            field("elementId") !== liveIds.button
          ) {
            return;
          }
          presses += 1;
          renderer.applyBatch(JSON.stringify(livePressBatch(theme, presses)));
        },
      );

      renderer.init({});

      const canvas = await awaitCanvas();
      if (canvas === undefined) {
        report(["status=failed no-canvas"]);
        setStatus({
          kind: "failed",
          message: "the renderer appended no canvas",
        });
        return;
      }
      canvas.style.position = "fixed";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.zIndex = "0";

      renderer.applyBatch(
        JSON.stringify(liveScene(theme, sizeOf(renderer.getWindowSize()))),
      );

      const origin = canvas.getBoundingClientRect();
      const laidOut = async (): Promise<{ button?: Box; banner?: Box }> => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const button = boxOf(renderer.getElementBounds(liveIds.button));
          const banner = boxOf(renderer.getElementBounds(liveIds.banner));
          if (button !== undefined && banner !== undefined)
            return { button, banner };
          await new Promise((wait) => requestAnimationFrame(wait));
        }
        return {};
      };
      const { button, banner } = await laidOut();
      if (button === undefined || banner === undefined) {
        report(["status=failed no-bounds"]);
        setStatus({
          kind: "failed",
          message: "the renderer laid no control out",
        });
        return;
      }

      // Sample the button's own fill, off the label: a centre pixel lands on a
      // glyph and reads the text's antialiasing, not the control's paint.
      const at = {
        x: Math.round(origin.left + button.x + 4),
        y: Math.round(origin.top + button.y + button.height / 2),
      };
      const stripe = centre(origin, {
        ...banner,
        y: banner.y + (banner.height - liveBanner.height) / 2,
        height: liveBanner.height,
      });

      // The probe presses through the renderer's own input path, exactly as a
      // pointer would: the listener above is the only thing that repaints.
      Reflect.set(window, "__gpuixLive", {
        press: () =>
          renderer.simulateClick(at.x - origin.left, at.y - origin.top),
        sample: { button: at, banner: stripe },
        fills: {
          button: liveButtonFill(theme),
          resting: liveRestingFill(theme),
          pressed: livePressedFill(theme),
        },
        presses: () => presses,
      });

      report([
        "status=painting",
        "canvas=yes",
        `text=${renderer.getAllText().join(",")}`,
        `button=${at.x},${at.y}`,
        `banner=${stripe.x},${stripe.y}`,
        `fill=${liveButtonFill(theme)}`,
        `resting=${liveRestingFill(theme)}`,
        `pressed=${livePressedFill(theme)}`,
      ]);

      setStatus({ kind: "painting" });
    };

    start().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      report([`status=failed ${message}`]);
      if (message.includes("already running")) setStatus({ kind: "refused" });
      else setStatus({ kind: "failed", message });
    });
  }, []);

  return (
    <div className="live-surface">
      <header className="live-surface-bar">
        <a href="/docs">Back to the docs</a>
        <span>{liveSurfaceLabel}</span>
      </header>
      {status.kind === "unavailable" ? (
        <p className="live-surface-note">{liveUnavailable}</p>
      ) : status.kind === "refused" ? (
        <p className="live-surface-note">{liveRefused}</p>
      ) : status.kind === "failed" ? (
        <p className="live-surface-note" role="alert">
          The GPUix surface did not start: {status.message}
        </p>
      ) : null}
      <pre id="out" hidden>
        status=starting
      </pre>
    </div>
  );
}
