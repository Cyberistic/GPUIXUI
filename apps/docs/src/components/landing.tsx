import type { ReactNode } from "react";
import { Link } from "fumadocs-core/link";
import { platformTypes } from "@gpuixui/tokens";
import { components, groupTitles, groups } from "@/component-meta/registry";
import { themeColors } from "@/lib/docs-theme";

/**
 * The commands the landing page's quick start shows. `landing.test.tsx` keeps
 * them identical to the first shell block in `installation.mdx`, so the two
 * places a newcomer reads cannot drift apart.
 */
export const QUICK_START = [
  "nub install",
  "nub run --filter @gpuixui/basic-app dev",
] as const;

/**
 * The design system in one glance. Eight roles, not the whole catalogue: the
 * Theming page generates all 47. Every value here is read from
 * `@gpuixui/tokens`; a literal would be a second palette, which `landing.test`
 * rejects (plan 440).
 */
export const PALETTE_ROLES = [
  "background",
  "foreground",
  "primary",
  "accent",
  "destructive",
  "success",
  "warning",
  "border",
] as const;

/** The six honest preview tiers, worded after `docs/preview-strategy.md`. */
export const PREVIEW_TIERS: ReadonlyArray<{
  readonly label: string;
  readonly detail: string;
}> = [
  {
    label: "Live GPUix surface",
    detail:
      "the real component code on the GPUix WebAssembly renderer, labelled as the browser renderer",
  },
  {
    label: "Native run",
    detail: "a screen in the companion playground, where one exists",
  },
  {
    label: "Native capture",
    detail: "a frame from the GPUix runtime, with its provenance sidecar",
  },
  {
    label: "Native coverage",
    detail: "the suite and command that drive the component in the renderer",
  },
  {
    label: "Illustrative approximation",
    detail: "browser layout for static pages, always labelled not GPUix",
  },
  {
    label: "Source and limitation",
    detail: "when the runtime cannot do it, the source and the reason",
  },
];

const MODES = ["light", "dark"] as const;
const PLATFORMS = ["darwin", "linux", "win32"] as const;

function Palette({ mode }: { readonly mode: (typeof MODES)[number] }) {
  return (
    <div data-palette={mode} className="flex flex-col gap-2">
      <p className="text-sm font-medium capitalize">{mode}</p>
      <ul aria-label={`${mode} theme colour roles`} className="flex gap-2">
        {PALETTE_ROLES.map((role) => {
          const value = themeColors[mode][role];
          return (
            <li
              key={role}
              role="img"
              aria-label={`${role} ${value}`}
              title={`${role} · ${value}`}
              data-role={role}
              data-mode={mode}
              className="size-8 rounded-md border border-fd-border"
              style={{ backgroundColor: value }}
            />
          );
        })}
      </ul>
    </div>
  );
}

/** One landing-page section; the heading id is the section's accessible name. */
function Section({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The landing page body. Extracted from the route so it can be tested. */
export function Landing() {
  const documented = components.filter(
    (component) => component.status !== "planned",
  ).length;

  return (
    <div
      id="main-content"
      tabIndex={-1}
      data-skip-target=""
      className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-4 py-20"
    >
      <header className="flex flex-col gap-5">
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
      </header>

      <Section id="system" title="The design system is the source of truth">
        <p className="max-w-2xl text-sm text-fd-muted-foreground">
          Semantic roles, not literal colours, in both themes. These swatches
          are the library's own palette, read from{" "}
          <code className="text-fd-foreground">@gpuixui/tokens</code> — the same
          values a component paints in the native runtime. This site is a
          browser: it shows the values here, and a page with a live scene runs
          them on GPUix's WebAssembly renderer.
        </p>
        <div className="flex flex-wrap gap-8">
          {MODES.map((mode) => (
            <Palette key={mode} mode={mode} />
          ))}
        </div>
        <dl className="grid gap-3 pt-2 sm:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <div key={platform} className="flex flex-col gap-1">
              <dt className="text-sm font-medium">
                {platformTypes[platform].label}
              </dt>
              <dd
                className="font-mono text-xs text-fd-muted-foreground"
                data-mono={platform}
              >
                {platformTypes[platform].mono}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-fd-muted-foreground">
          Each platform style is an editable theme, not a stylesheet.{" "}
          <Link href="/docs/theming">
            See the token reference and the toggle
          </Link>
          .
        </p>
      </Section>

      <Section id="inventory" title="What is documented">
        <ul className="flex flex-col gap-2">
          {groups.map((group) => {
            const done = group.items.filter(
              (component) => component.status !== "planned",
            ).length;
            return (
              <li
                key={`${group.tier}-${group.group}`}
                data-group={group.group}
                data-documented={done}
                data-tracked={group.items.length}
                className="flex flex-wrap items-baseline gap-2 text-sm"
              >
                <span className="font-medium">
                  Tier {group.tier} — {groupTitles[group.group] ?? group.group}
                </span>
                <span className="text-fd-muted-foreground">
                  {done} documented of {group.items.length} tracked
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-fd-muted-foreground">
          Every documented component has a page with its real source, generated
          props and the native suite that drives it. Planned rows have no
          implementation yet.{" "}
          <Link href="/docs/components">
            Browse all {documented} documented components
          </Link>
          .
        </p>
      </Section>

      <Section id="quick-start" title="Quick start">
        <p className="text-sm text-fd-muted-foreground">
          The packages are not on a registry yet, so start from a checkout. The
          example's <code>dev</code> script currently needs Bun, the GPUix
          native binding and a desktop session;{" "}
          <code>nub run --filter @gpuixui/basic-app check-types</code> verifies
          the composition without launching a window. Pages with a live scene
          run GPUix's WebAssembly renderer in the browser; the playground is
          where the desktop window runs, and every other preview is labelled as
          native evidence.
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
      </Section>

      <Section id="previews" title="Every preview is labelled">
        <p className="max-w-2xl text-sm text-fd-muted-foreground">
          A component page says exactly what its preview is — a live GPUix
          WebAssembly surface, native evidence, or a labelled approximation —
          and never presents an imitation as the real thing.
        </p>
        <ol className="flex flex-col gap-2 text-sm">
          {PREVIEW_TIERS.map((tier, index) => (
            <li key={tier.label} className="flex flex-wrap gap-2">
              <span className="font-medium">
                {index + 1}. {tier.label}
              </span>
              <span className="text-fd-muted-foreground">— {tier.detail}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-fd-muted-foreground">
          The rule and its evidence are in{" "}
          <Link href="/docs/architecture">Architecture</Link>.
        </p>
      </Section>
    </div>
  );
}
