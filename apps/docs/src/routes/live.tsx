import { createFileRoute } from "@tanstack/react-router";
import { LiveSurface } from "@/components/docs/live-surface";
import liveCss from "@/styles/live.css?url";

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
