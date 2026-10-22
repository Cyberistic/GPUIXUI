import { createFileRoute } from "@tanstack/react-router";
import { LiveSurface } from "@/components/docs/live-surface";
import liveCss from "@/styles/live.css?url";

/**
 * The live GPUix surface.
 *
 * A whole-page route on purpose: the wasm renderer owns one document-level
 * canvas, so the docs chrome cannot sit behind it. The bar above the surface is
 * the way back; everything below it is the renderer's own pixels.
 */
export const Route = createFileRoute("/live")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Live GPUix surface — GPUIxUI" },
      {
        name: "description",
        content:
          "The real GPUix renderer (wasm web build) painting a library control in the browser.",
      },
    ],
    links: [{ rel: "stylesheet", href: liveCss }],
  }),
});

function Page() {
  return <LiveSurface />;
}
