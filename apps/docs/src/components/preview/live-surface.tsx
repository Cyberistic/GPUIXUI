import { useState } from "react";
import type { PlatformName, ThemeMode } from "@gpuixui/tokens";
import { usePreviewState } from "./theme-surface";

/**
 * The label a live surface must carry (plan 455). The surface is a real GPUix
 * renderer, but it is the WebAssembly/WebGPU build inside this tab, not the
 * native desktop window the playground runs. The two claims are not
 * interchangeable, so the label names both.
 */
export const LIVE_SURFACE_NOTICE =
  "Live GPUix surface — the library's real component code, run by GPUix's " +
  "WebAssembly renderer through WebGPU in this tab. It is not the native " +
  "desktop window: run the playground for that.";

/** The measured size of the published `gpuix-web_bg.wasm` in 0.10.0. */
export const LIVE_SURFACE_DOWNLOAD = "about 20 MB";

/** Where the isolated surface lives; it is a build artefact, not a route. */
export const LIVE_SURFACE_PATH = "/gpuix-preview/";

export interface LivePreviewSource {
  readonly scene: string;
  readonly platform: PlatformName;
  readonly mode: ThemeMode;
}

/** The iframe URL, so the docs' platform toggle and dark mode reach the surface. */
export const livePreviewSrc = ({
  scene,
  platform,
  mode,
}: LivePreviewSource): string => {
  const params = new URLSearchParams({ scene, platform, mode });
  return `${LIVE_SURFACE_PATH}?${params.toString()}`;
};

type LoadState = "idle" | "checking" | "loading" | "missing";

/**
 * A live GPUix surface, loaded on request. `build:preview` emits the bundle;
 * a checkout that has not run it says so instead of showing a blank frame.
 */
export function LiveSurface({
  scene,
  title,
}: {
  readonly scene: string;
  readonly title: string;
}) {
  const { platform, mode } = usePreviewState();
  const [state, setState] = useState<LoadState>("idle");
  const src = livePreviewSrc({ scene, platform, mode });

  const start = (): void => {
    setState("checking");
    fetch(src, { method: "HEAD" }).then(
      (response) => setState(response.ok ? "loading" : "missing"),
      () => setState("missing"),
    );
  };

  return (
    <section
      data-preview-tier="live"
      data-preview-scene={scene}
      className="not-prose my-4 flex flex-col gap-3"
    >
      <p
        role="note"
        className="rounded-md border border-fd-border bg-fd-muted px-3 py-2 text-sm text-fd-muted-foreground"
      >
        {LIVE_SURFACE_NOTICE}
      </p>
      {state === "idle" || state === "checking" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={state === "checking"}
            className="rounded-md border border-fd-border bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-60"
          >
            {state === "checking" ? "Loading…" : "Load live preview"}
          </button>
          <span className="text-xs text-fd-muted-foreground">
            Loads GPUIXUI's real GPUix renderer ({LIVE_SURFACE_DOWNLOAD}).
          </span>
        </div>
      ) : null}
      {state === "missing" ? (
        <p className="rounded-md border border-fd-border px-3 py-2 text-sm text-fd-muted-foreground">
          The live surface is not built in this checkout. Run{" "}
          <code>nub run --filter docs build:preview</code>, or use the
          playground for the native window.
        </p>
      ) : null}
      {state === "loading" ? (
        <iframe
          key={src}
          src={src}
          title={`Live GPUix surface: ${title}`}
          sandbox="allow-scripts allow-same-origin"
          className="h-[360px] w-full max-w-[640px] rounded-md border border-fd-border bg-fd-background"
        />
      ) : null}
    </section>
  );
}
