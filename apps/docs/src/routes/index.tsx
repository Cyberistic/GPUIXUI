import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "fumadocs-core/link";
import { baseOptions } from "@/lib/layout.shared";
import { components, statusCounts } from "@/component-meta/registry";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const counts = statusCounts();
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-20">
        <p className="text-sm font-medium text-fd-muted-foreground">
          A native UI component library
        </p>
        <h1 className="text-4xl font-semibold">
          Build native desktop UI with GPUix and React.
        </h1>
        <p className="max-w-2xl text-fd-muted-foreground">
          GPUIXUI is a reusable component library rendered by GPUix — the GPU
          runtime behind Zed's UI toolkit. The components run in the real native
          runtime; this site documents them honestly and links to a native
          playground for every preview.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
          >
            Read the docs
          </Link>
          <Link
            href="/docs/components"
            className="rounded-lg border border-fd-border px-4 py-2 text-sm font-medium"
          >
            Browse components
          </Link>
        </div>
        <dl className="flex gap-8 pt-4 text-sm">
          <div>
            <dt className="text-fd-muted-foreground">Components tracked</dt>
            <dd className="text-2xl font-semibold" data-total-components>
              {components.length}
            </dd>
          </div>
          <div>
            <dt className="text-fd-muted-foreground">Implemented</dt>
            <dd className="text-2xl font-semibold">
              {counts.get("done") ?? 0}
            </dd>
          </div>
        </dl>
      </main>
    </HomeLayout>
  );
}
