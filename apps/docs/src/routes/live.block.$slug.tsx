import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { EventPayload } from "@gpuix/native";
import { liveBlockOf } from "@/lib/live-blocks";
import { LiveBlockScene } from "@/lib/live-block-scene";
import {
  lookFromSearch,
  platformFromSearch,
  resolvePlatformTheme,
} from "@/lib/platform";
import liveBlockCss from "@/styles/live-block.css?url";

/**
 * One block, painted by the real renderer.
 *
 * The docs' block pages frame this route in an iframe: the renderer owns one
 * document-level canvas, so each live block needs its own document. The route
 * is client-only — both packages are imported inside the effect, so the server
 * build never evaluates the wasm — and it paints nothing of its own: the canvas
 * is the block's pixels and the page behind it is transparent, which lets the
 * block page's capture show through until the first frame.
 */
export const Route = createFileRoute("/live/block/$slug")({
  component: Page,
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — live GPUix block — GPUIxUI` }],
    links: [{ rel: "stylesheet", href: liveBlockCss }],
  }),
});

type Status =
  | { readonly kind: "starting" }
  | { readonly kind: "painting" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "failed"; readonly message: string };

const isEventPayload = (value: unknown): value is EventPayload =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "eventType") === "string" &&
  typeof Reflect.get(value, "elementId") === "number";

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
  return document.createElement("canvas").getContext("webgl2") !== null;
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

const unavailable =
  "This browser has no WebGPU or WebGL2, so the block cannot be painted here.";

function Page() {
  const { slug } = Route.useParams();
  const [status, setStatus] = useState<Status>({ kind: "starting" });
  const entry = liveBlockOf(slug);

  useEffect(() => {
    if (entry === undefined) {
      setStatus({ kind: "failed", message: `no live block named "${slug}"` });
      return;
    }
    const choice = {
      platform: platformFromSearch(window.location.search),
      look: lookFromSearch(window.location.search),
    };
    const theme = resolvePlatformTheme(
      choice.platform ?? "darwin",
      "light",
      choice.look,
    );

    const start = async (): Promise<void> => {
      if (!(await hasBackend())) {
        setStatus({ kind: "unavailable" });
        return;
      }

      const glue = await import("@gpuix/native/wasm/gpuix-web.js");
      const wasm = await import("@gpuix/native/wasm/gpuix-web_bg.wasm?url");
      await glue.default({ module_or_path: wasm.default });

      const react = await import("@gpuix/react");
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
      canvas.style.zIndex = "1";

      const View: () => ReactNode = await entry.load(
        new URLSearchParams(window.location.search).get("variant") ?? undefined,
      );
      react.createRoot(host).render(
        <LiveBlockScene theme={theme}>
          <View />
        </LiveBlockScene>,
      );
      setStatus({ kind: "painting" });
    };

    start().catch((error: unknown) => {
      setStatus({
        kind: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, [entry, slug]);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        margin: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {status.kind === "unavailable" ? (
        <p className="live-block-note">{unavailable}</p>
      ) : status.kind === "failed" ? (
        <p className="live-block-note" role="alert">
          The live block did not start: {status.message}
        </p>
      ) : null}
    </main>
  );
}
