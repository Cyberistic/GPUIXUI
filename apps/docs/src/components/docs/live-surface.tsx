import { useEffect, useState } from "react";
import type { EventPayload } from "@gpuix/native";
import {
  liveBanner,
  liveButtonFill,
  liveIds,
  livePressedFill,
  liveRestingFill,
  LiveScene,
} from "@/lib/live-scene";
import { resolvePlatformTheme } from "@/lib/platform";
import { browserChoiceStorage, openingChoice } from "@/lib/platform-storage";
import { mainContentId } from "@/components/skip-link";

let started = false;

type Status =
  | { readonly kind: "starting" }
  | { readonly kind: "painting" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "refused" }
  | { readonly kind: "failed"; readonly message: string };

export const liveSurfaceLabel =
  "GPUix web build (WebGPU) — the real renderer in a browser, not the native macOS runtime.";

export const liveUnavailable =
  "This browser has no WebGPU or WebGL2, so the GPUix surface cannot start. The labelled component previews on the other pages still work.";

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
  const width = read("width");
  const height = read("height");
  return x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
    ? undefined
    : { x, y, width, height };
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

const isEventPayload = (value: unknown): value is EventPayload =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "eventType") === "string" &&
  typeof Reflect.get(value, "elementId") === "number";

const report = (lines: ReadonlyArray<string>): void => {
  const out = document.getElementById("out");
  if (out !== null) out.textContent = lines.join("\n");
};

const platformOf = () => openingChoice(browserChoiceStorage());

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

      const react = await import("@gpuix/react");

      let presses = 0;
      let renderer: InstanceType<typeof glue.GpuixRenderer> | undefined;
      renderer = new glue.GpuixRenderer((...args: ReadonlyArray<unknown>) => {
        const event = args.length > 1 ? args[1] : args[0];
        if (renderer !== undefined && isEventPayload(event)) {
          react.handleGpuixEvent(event, renderer);
        }
      });
      const host = renderer;
      host.init({});

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

      const params = new URLSearchParams(window.location.search);
      if (params.get("scene") === "parity") {
        const { ThemeProvider } = await import("@gpuixui/tokens/react");
        const { PARITY_CHARTS, ParityGallery } =
          await import("@gpuixui/data/examples");
        const only = params.get("only");
        const chosen =
          only === null
            ? undefined
            : PARITY_CHARTS.find(
                (row: { readonly id: string }) => row.id === only,
              );
        react
          .createRoot(host)
          .render(
            <ThemeProvider theme={theme}>
              {chosen === undefined ? <ParityGallery /> : chosen.view}
            </ThemeProvider>,
          );
        report([
          "status=painting",
          "canvas=yes",
          `scene=parity`,
          `only=${only ?? "all"}`,
          `text=${host.getAllText().join(",")}`,
        ]);
        setStatus({ kind: "painting" });
        return;
      }

      react.createRoot(host).render(
        <LiveScene
          box={sizeOf(host.getWindowSize())}
          theme={theme}
          onPress={(count) => {
            presses = count;
          }}
        />,
      );
      const runtime = await import("@gpuix/native/runtime");
      const automation = runtime.installBrowserAutomation(host);

      const buttonLocator = automation.getByTestId(liveIds.button);
      const bannerLocator = automation.getByTestId(liveIds.banner);
      const laidOut = async (): Promise<{ button?: Box; banner?: Box }> => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const button = boxOf(
            await buttonLocator.bounds().catch(() => undefined),
          );
          const banner = boxOf(
            await bannerLocator.bounds().catch(() => undefined),
          );
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

      const at = {
        x: Math.round(button.x + 4),
        y: Math.round(button.y + button.height / 2),
      };
      const stripe = {
        x: Math.round(banner.x + banner.width / 2),
        y: Math.round(
          banner.y +
            (banner.height - liveBanner.height) / 2 +
            liveBanner.height / 2,
        ),
      };

      Reflect.set(window, "__gpuixLive", {
        press: () => buttonLocator.click(),
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
        `text=${host.getAllText().join(",")}`,
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
    <main className="live-surface" id={mainContentId} tabIndex={-1}>
      <header className="live-surface-bar">
        <a href="/introduction">Back to the docs</a>
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
    </main>
  );
}
