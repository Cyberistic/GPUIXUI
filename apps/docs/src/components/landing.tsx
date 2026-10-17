import { Link } from "fumadocs-core/link";
import { components, statusCounts } from "@/component-meta/registry";

/**
 * The commands the landing page's quick start shows. `landing.test.tsx` keeps
 * them identical to the first shell block in `installation.mdx`, so the two
 * places a newcomer reads cannot drift apart.
 */
export const QUICK_START = [
  "nub install",
  "nub run --filter @gpuixui/basic-app dev",
] as const;

/** The landing page body. Extracted from the route so it can be tested. */
export function Landing() {
  const counts = statusCounts();

  return (
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
        runtime; this site documents them honestly and points at the native
        playground once a screen exists.
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

      <section className="flex flex-col gap-3 pt-6">
        <h2 className="text-xl font-medium">Quick start</h2>
        <p className="text-sm text-fd-muted-foreground">
          The packages are not on a registry yet, so start from a checkout. The
          example is a real native application; this site never renders GPUix,
          so it links to the playground instead of imitating it.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4 text-sm">
          <code>{QUICK_START.map((command) => `${command}\n`).join("")}</code>
        </pre>
        <p className="text-sm text-fd-muted-foreground">
          Then read <Link href="/docs/installation">Installation</Link> for the
          intended registry install, or{" "}
          <Link href="/docs/getting-started">Getting started</Link> to render
          the first window.
        </p>
      </section>

      <dl className="flex gap-8 pt-4 text-sm">
        <div>
          <dt className="text-fd-muted-foreground">Components tracked</dt>
          <dd className="text-2xl font-semibold">{components.length}</dd>
        </div>
        <div>
          <dt className="text-fd-muted-foreground">Implemented</dt>
          <dd className="text-2xl font-semibold">{counts.get("done") ?? 0}</dd>
        </div>
      </dl>
    </main>
  );
}
