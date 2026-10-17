# apps/docs — the Fumadocs site

A **browser** application. It documents and showcases the GPUix-native library;
it does not render it. See `MISSION.md`, plan `410-docs-site.md`, and
`docs/preview-strategy.md`.

## Stack

Fumadocs + TanStack Start (SSR), built with Vite, Tailwind 4 and
`fumadocs-mdx`. It deploys as a Cloudflare Worker through
`packages/deploy/alchemy.run.docs.ts` (`rootDir: "../../apps/docs"`).

## Commands

```sh
nub run --filter docs dev           # http://localhost:3000
nub run --filter docs build         # SSR bundle + client assets
nub run --filter docs check-types   # fumadocs-mdx generate + tsc --noEmit
nub run --filter docs test          # registry, IA, search, theme and preview tests
nub run check                       # repo gate: test quality, lint, format, types
```

## Layout

```
content/docs/**              the MDX pages; meta.json sets the sidebar order
src/routes/                  TanStack Start routes (landing, docs catch-all, search)
src/lib/source.ts            the Fumadocs content source
src/components/              MDX components (index, state, previews)
src/component-meta/          the component registry (plan 411)
public/screenshots/          real native screenshots (plan 412)
```

## Theme

The site's light and dark palette **is** the library's palette. The Fumadocs
variables in `src/styles/app.css` are the semantic roles from `@gpuixui/tokens`,
mapped in `src/lib/docs-theme.ts`; `src/styles/theme.test.ts` asserts every mapped
value equals `lightTheme.colors` / `darkTheme.colors` in both modes. Change the
token package first, then the stylesheet — a mismatch fails the suite.

The theming and typography pages render `<TokenColors />`, `<TypeScale />` and
`<PlatformTypes />` from the package's data, so the documented values are the
shipped values. The token root entry is the **only** `@gpuixui/*` import the site
may make (`@gpuixui/tokens/react` is forbidden, as is every GPUix runtime
package); `src/architecture.test.ts` enforces the allow-list.

## Public URL

Canonical links, OpenGraph `og:url` and the sitemap use `SITE_URL` from
`src/lib/site.ts`. It defaults to `https://docs.gpuixui.dev` — the domain
declared by `packages/deploy/alchemy.run.docs.ts` — and `VITE_SITE_URL`
overrides it for previews or self-hosting:

```sh
VITE_SITE_URL=https://preview.example.com nub run --filter docs build
```

`/sitemap.xml` and `/robots.txt` are generated from the Fumadocs source by
`src/routes/sitemap[.]xml.ts` and `src/routes/robots[.]txt.ts`; a new page needs
no sitemap edit. `src/lib/sitemap.test.ts` proves every page appears once.

## Adding a component page

The first real page is `content/docs/components/button.mdx` (plan 422); all 20
Tier 1 pages followed it (plan 423) and the 22 Tier 2 pages after that (plan
425). Each shows the whole chain: a `wip` registry record, generated status and
preview blocks, a real API table, the real component source and a
runtime-mounted example. Copy their shape.

1. Add a record to `src/component-meta/entries.ts`. **Titles must match the
   `COMPONENTS.md` row exactly** — `registry.test.ts` proves the two agree.
   Start `status: "planned"`, `gpuix: "unverified"`; a delivered component moves
   to `wip`/`done` only with a real `sourcePath` and **the exact status word its
   `COMPONENTS.md` row carries** — the same test parses the inventory table and
   fails on any difference (plan 429). A `done` record with `gpuix: "partial"`
   must carry at least one documented limitation; `done` never sits on
   `unverified` support. The `planned`/`delivered` helpers default `parts` to
   `[]`, `pattern` to `"static"` and `persistence` to `null`; a compound or
   workspace record overrides them (plan 427).
2. Add `content/docs/components/<slug>.mdx` using the template below, and add
   the slug to `content/docs/components/meta.json`. `registry.test.ts` asserts
   that sidebar equals `index` plus every non-planned slug, so a forgotten
   entry (or a component with no page) fails the suite.
3. Move the record out of `planned` only when the component is real. The tests
   then require a `sourcePath`, the page file, the sidebar entry, and a `## Source`
   section on the page that includes that path (see below).
4. When the playground has captured the component, add the PNGs under
   `public/screenshots/<slug>/` **and** the `provenance.json` sidecar the capture
   script writes. A screenshot without a sidecar is never rendered.

```mdx
---
title: Button
description: Triggers an action; the primary interactive control.
---

<ComponentState slug="button" />

<NativePreview slug="button" />

## Usage

## Variants

## Sizes

## States

## Composition

## API reference

## Keyboard and focus

## Theming

## Accessibility and limitations

## Dependencies

## Source

## Related

<RelatedComponents slug="button" />
```

A compound or workspace record owes extra sections, in the order below. The
required list is `sectionsFor(pattern)` in `src/component-meta/contract.ts`, and
`component-pages.test.ts` applies it to every finished record.

```mdx
## State and ownership

## Anatomy

## Persistence
```

- `stateful` (a data grid, a split host, tabs) adds **State and ownership**
  directly after **Composition**. It names the state the component owns and the
  state the consumer owns.
- `workspace` (panels, docking, a workspace) also adds **Anatomy** directly
  after **Usage** and **Persistence** directly after **State and ownership**.
  **Anatomy** names the parts and the one-way ownership relationship;
  **Persistence** names the serialised shape and says the app writes it — the
  renderer stores nothing.

The section list is a contract, not a suggestion: `src/component-pages.test.ts`
fails when a page for a component that is no longer `planned` is missing a
section, its `<ComponentState slug>` block or its `<NativePreview slug>` block,
and when this template stops listing one. It also fails when the page's
frontmatter `title`/`description` drift from the registry record. A component
with no variants or sizes still gets the section — say "none" rather than
deleting it, so a reader can tell the difference between "not documented" and
"does not apply".

`<RelatedComponents>` links a related record only when it is no longer
`planned`; a planned record renders as a plain "(planned)" label, because a link
would 404. `src/components/related-components.test.tsx` guards that rule.

## Dependencies

The `Dependencies` section states what the component needs, and it is not
hand-written: it renders `<ComponentDependencies slug="…" />`, which reads the
record's `dependencies`. That list is **derived from the component's real entry
file** by `src/lib/source-imports.ts` (plan 428):

- the entry file's non-relative module imports are the modules (React and
  `@gpuix/react` are the peer packages every component has, so the block states
  them once instead of listing them 42 times);
- a relative import that resolves to another delivered record's `sourcePath` is
  recorded as that record's slug and rendered as a **Composes** link; a relative
  import into `internal/`, `core/`, `menu/`, `toast/` or `combobox/` is a private
  helper and is not a dependency;
- `src/component-meta/dependencies.test.ts` re-derives every record and fails
  with the expected list when an import and the docs disagree. Fix it by copying
  the expected list into the record; never loosen the test.

Prop tables use `fumadocs-typescript`'s remark plugin: write
`<auto-type-table path="./relative/path.ts" name="ButtonProps" />` in the MDX
and annotate the real props type with tsdoc (`@internal` hides a prop). The
table is generated at build time from the component source, so it cannot drift.

## Copyable source

Never paste a component's source into a page. Include the real file with
Fumadocs' `<include>` tag (plan `414-copyable-component-source.md`); the plugin
reads it at build time and the page gets the same highlighted, copyable code
block as any other fence:

```mdx
<include lang="tsx" meta='title="packages/primitives/src/button/button.tsx"'>
  ../../../../../packages/primitives/src/button/button.tsx
</include>
```

- The path is relative to the MDX file. A page under `content/docs/components/`
  reaches the repository root with **five** `../` segments.
- The title is the repo-relative path; `lang` matches the extension.
- A region (`#name`, marked `// #region name`) includes part of a file instead of
  all of it.
- `<include … />` with no body renders **nothing** and says nothing, so always
  use the paired tag.

`src/content-references.test.ts` fails if an include points at a file that does
not exist, names a region the file does not contain, is written self-closing, or
if a component that is no longer `planned` has a page without its real source.

## API tables

Prop tables are generated from the component's **real TypeScript** by
`fumadocs-typescript`'s remark plugin; the generator lives in
`src/lib/type-table-generator.ts` and is wired in `source.config.ts` (that file
may only export collections, which is why the generator is separate). The
mechanism is verified in this app: `api-reference.mdx` renders a table from a
real type, and the dev server emits one row per prop
(`type-table-<file>-<Type>-<prop>`).

The contract a component props type must satisfy (`src/lib/type-table.fixture.tsx`
is its executable form, pinned by `src/lib/type-table.test.ts`):

1. The type is **exported** from a real `.ts`/`.tsx` file the page can reach.
2. Every public prop carries tsdoc text; the table shows it in the row.
3. A prop that must not appear on the site carries `@internal` — hidden by
   default, shown only when a page asks for `allowInternal`.
4. An optional prop uses `?`, so the table marks it optional.

Two gotchas the tests exist to catch:

- an unknown type `name`, or a props type in a single-line inline `type` string,
  generates **nothing** and no error — `content-references.test.ts` fails on the
  first;
- the generator's file cache is keyed by `${path}:${name}:${content}`, so it does
  **not** distinguish options: never generate the same type twice with different
  options (e.g. `allowInternal`) in one build. No page does.

The page's `<title>`, `description`, `og:title`, `og:description` and canonical
link come from its frontmatter through `src/lib/page-meta.ts`, so a new page
never inherits the site title.

## Prose truth

The pages outside `components/` make factual claims about the repository —
which packages exist, which example runs, whether the playground is built.
Those claims drift silently: a page still builds after a package lands. Plan
`426-prose-truth-and-examples.md` adds `src/prose-truth.test.ts`, which derives
the facts from the tree (a package is real when it has a `package.json`) and
fails when a page contradicts them:

- no page may call an implemented package "future work";
- no page may deny that an example exists while `examples/*` has a package;
- once `apps/playground/package.json` lands, every "not built yet" playground
  claim fails until the page is updated;
- every backticked `packages/`, `apps/`, `examples/`, `docs/` or `LICENSES/`
  path on any page must exist, or be registered as planned in its directory
  README.

When you add a page, name real paths and re-read the package/example state you
describe. When the playground becomes runnable, update `getting-started.mdx`
and `examples/index.mdx` in the same change — the guard is inverted so it fails
until you do.

## Pattern pages

A pattern page documents a **real composition**, not a component. The first is
`content/docs/patterns/settings-form.mdx`, built from
`examples/basic-app/src/App.tsx`. Its contract (`src/pattern-pages.test.ts`) is:
six sections (`The task`, `Composition`, `State`, `What is verified`, `Source`,
`Related`), at least one real `<include>` that resolves inside the repository,
no placeholder prose, and any `nub run --filter <package> <script>` claim must
name a script the example package really defines. A pattern with no runnable
source does not get a page.

## Previews

`<NativePreview slug>` picks the strongest honest tier from the record plus the
capture sidecars (`src/components/preview/select-preview.ts`):

- a listed screenshot **with** its `provenance.json` → the real capture (tier S);
  a sidecar with `kind: "interaction"` is captioned `Recorded in GPUix — …`
  instead of `Captured from GPUix — …`;
- otherwise a `playgroundScreen` → the run instructions (tier N);
- otherwise the "not verified" notice (tier X).

An approximation is never a fallback. The only way to render one is
`<IllustrativeApproximation>`, which always renders the mandated banner.

## Honesty rules

Every preview obeys `docs/preview-strategy.md`. This app must never import
`@gpuixui/*` runtime code or `@gpuix/react` — it reads the real TypeScript
*source* for prop tables and copyable snippets, and nothing else.
`src/architecture.test.ts` enforces that boundary over `src/**`.
