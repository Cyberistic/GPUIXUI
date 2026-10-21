import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/landing";
import { absoluteUrl } from "@/lib/site";
import landingCss from "@/styles/landing.css?url";

// The marketing landing page: the "Hunter License" identity over the
// stacked-native hero. Docs live under `/docs`.
export const Route = createFileRoute("/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "GPUIxUI — one library, three native looks" },
      {
        name: "description",
        content:
          "GPUIxUI is a native UI component library for GPUix + React — one component set that looks at home on macOS, Windows 11 and Linux.",
      },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/") },
      { rel: "stylesheet", href: landingCss },
    ],
  }),
});

function Page() {
  return <Landing />;
}
