import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Landing } from "@/components/landing";
import { baseOptions } from "@/lib/layout.shared";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [{ property: "og:url", content: absoluteUrl("/") }],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
  }),
});

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <Landing />
    </HomeLayout>
  );
}
