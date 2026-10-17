/** @jsxImportSource @gpuix/react */
/**
 * Renders one live surface (plans 455 and 456): the real library component on
 * GPUix's published WebAssembly renderer, in the docs' active mode and platform
 * style.
 *
 * The document is isolated from the docs app on purpose. It publishes one fact
 * to its parent and to the smoke check — `data-gpuix="ready"` once GPUI's window
 * is initialised and the scene is mounted, `data-gpuix="failed"` with a reason in
 * `data-reason` — so a broken surface degrades to a labelled notice and is never
 * mistaken for a painted one.
 */
import { render, useGpuix, useWindowSize } from "@gpuix/react";
import { Text, ThemeProvider } from "@gpuixui/primitives";
import {
  platformTheme,
  themes,
  type PlatformName,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";
import { useEffect, useState } from "react";
import { initGpuixWeb } from "./gpuix-web";
import { isWindowReady } from "./renderer-ready";
import { LIVE_SCENE_VIEWS, LiveSurface } from "./scene-views";
import { isLiveScene, type LiveScene } from "./scenes";

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

/**
 * The surface chrome. It renders before the renderer is ready, so the document
 * has something to paint rather than a blank frame.
 */
const Surface = ({
  scene: activeScene,
  theme,
  ready,
}: {
  readonly scene: LiveScene;
  readonly theme: Theme;
  readonly ready: boolean;
}) => {
  const size = useWindowSize();
  const View = LIVE_SCENE_VIEWS[activeScene];
  return (
    <ThemeProvider theme={theme}>
      <LiveSurface size={{ width: size.width, height: size.height }}>
        {ready ? (
          <View />
        ) : (
          <Text role="caption" tone="muted">
            Preparing the scene…
          </Text>
        )}
      </LiveSurface>
    </ThemeProvider>
  );
};

/**
 * Mounts the scene only once GPUI's window exists. `render()` returns before
 * asynchronous graphics init finishes, and neither that return nor the DOM
 * canvas is the signal: both precede the window handle. `isWindowReady` asks the
 * renderer precisely when the handle exists, which is the point at which
 * `focusElement` and friends stop throwing "GPUIX web window is not ready". The
 * Dialog scene needs exactly that, because it moves focus during its first
 * layout effect (plan 456 §10).
 */
const SceneRoot = ({
  scene: activeScene,
  theme,
}: {
  readonly scene: LiveScene;
  readonly theme: Theme;
}) => {
  const { renderer } = useGpuix();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let frame = 0;
    const poll = (): void => {
      if (isWindowReady(renderer)) {
        setReady(true);
        return;
      }
      if (Date.now() > deadline) {
        markFailed("GPUix's window did not initialise in time.");
        return;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [ready, renderer]);

  useEffect(() => {
    if (ready) markReady();
  }, [ready]);

  return <Surface scene={activeScene} theme={theme} ready={ready} />;
};

const renderSurface = (): void => {
  if (!isLiveScene(scene)) {
    markFailed(`No live scene is named "${scene}".`);
    return;
  }
  const theme = platformTheme(themes[mode], platform);
  render(<SceneRoot scene={scene} theme={theme} />, {
    title: "GPUixUI live preview",
    width: 640,
    height: 360,
  });
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
