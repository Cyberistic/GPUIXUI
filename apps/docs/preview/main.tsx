/** @jsxImportSource @gpuix/react */
/**
 * Renders one live surface (plan 455): the real library component on GPUix's
 * published WebAssembly renderer, in the docs' active mode and platform style.
 *
 * The document is isolated from the docs app on purpose. It publishes one fact
 * to its parent and to the smoke check — `data-gpuix="ready"` once the GPUI
 * canvas exists, `data-gpuix="failed"` with a reason in `data-reason` — so a
 * broken surface degrades to a labelled notice and is never mistaken for a
 * painted one.
 */
import { initGpuixWeb } from "./gpuix-web";
import { render, useWindowSize } from "@gpuix/react";
import { ThemeProvider } from "@gpuixui/primitives";
import {
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { LIVE_SCENE_VIEWS, LiveSurface } from "./scene-views";
import { isLiveScene } from "./scenes";

const READY_TIMEOUT_MS = 10_000;

const params = new URLSearchParams(window.location.search);

const parsePlatform = (value: string | null): PlatformName => {
  const known = (name: string): name is Exclude<PlatformName, "default"> =>
    name === "darwin" || name === "linux" || name === "win32";
  return value !== null && known(value) ? value : "default";
};

const parseMode = (value: string | null): ThemeMode =>
  value === "dark" ? "dark" : "light";

const platform = parsePlatform(params.get("platform"));
const mode = parseMode(params.get("mode"));
const scene = params.get("scene") ?? "";

const status = document.querySelector("[data-gpuix-status]");
const root = document.documentElement;

const markReady = (): void => {
  root.dataset.gpuix = "ready";
  status?.remove();
};

const markFailed = (reason: string): void => {
  root.dataset.gpuix = "failed";
  root.dataset.reason = reason;
  if (status !== null) status.textContent = reason;
};

/** Wait for GPUI to append and size its own canvas, then report success. */
const whenPainted = (deadline: number): void => {
  if (document.querySelector("canvas") !== null) {
    markReady();
    return;
  }
  if (Date.now() > deadline) {
    markFailed("GPUix did not create its canvas in time.");
    return;
  }
  requestAnimationFrame(() => whenPainted(deadline));
};

const renderSurface = (): void => {
  if (!isLiveScene(scene)) {
    markFailed(`No live scene is named "${scene}".`);
    return;
  }
  const View = LIVE_SCENE_VIEWS[scene];
  const theme = platformTheme(themes[mode], platform);
  const Surface = () => {
    const size = useWindowSize();
    return (
      <ThemeProvider theme={theme}>
        <LiveSurface size={{ width: size.width, height: size.height }}>
          <View />
        </LiveSurface>
      </ThemeProvider>
    );
  };
  render(<Surface />, {
    title: "GPUixUI live preview",
    width: 640,
    height: 360,
  });
  whenPainted(Date.now() + READY_TIMEOUT_MS);
};

window.addEventListener("error", (event) => {
  markFailed(event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  markFailed(String(event.reason));
});

initGpuixWeb().then(
  () => {
    try {
      renderSurface();
    } catch (error) {
      markFailed(error instanceof Error ? error.message : String(error));
    }
  },
  (error: unknown) => {
    markFailed(
      `The GPUix renderer did not load: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  },
);
