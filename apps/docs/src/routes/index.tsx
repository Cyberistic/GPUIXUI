import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Landing } from "@/components/landing";
import { SkipLink } from "@/components/skip-link";
import { baseOptions } from "@/lib/layout.shared";
import { absoluteUrl } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-head";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { property: "og:title", content: SITE_NAME },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
  }),
});

function Home() {
  return (
    <>
      <SkipLink href="#main-content" />
      <HomeLayout {...baseOptions()}>
        <Landing />
      </HomeLayout>
    </>
  );
}
