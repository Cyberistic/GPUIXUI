import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/landing";
import { landingMeta } from "@/lib/page-meta";
import landingCss from "@/styles/landing.css?url";

// The marketing landing page: the "Hunter License" identity over the
// stacked-native hero. Docs live under `/docs`.
export const Route = createFileRoute("/")({
  component: Page,
  head: () => {
    const meta = landingMeta();
    return {
      meta: meta.meta,
      links: [...meta.links, { rel: "stylesheet", href: landingCss }],
    };
  },
});

function Page() {
  return <Landing />;
}
