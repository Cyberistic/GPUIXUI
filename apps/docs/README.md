# apps/docs — the GPUixUI documentation site

The docs site is a real Fumadocs app on TanStack Start, deployed as a Cloudflare
Worker by `packages/deploy/alchemy.run.docs.ts` at
**https://gpuixui.sudokw.com**. It documents the native library; it does not
reimplement it. The browser site never pretends to be GPUix.

## Layout

```
content/docs/       MDX pages and their meta.json navigation
public/             Static assets (favicon)
src/routes/         TanStack Start routes: docs splat, search, root redirect
src/lib/source.ts   Fumadocs collection and page-tree loader
src/lib/            Shared app name, git config and layout options
src/styles/app.css  Tailwind, Fumadocs presets and the GPUixUI palette
source.config.ts    Fumadocs MDX collection definition
```

## Commands

```sh
nub run dev:docs                               # dev server
nub run --filter @gpuixui/docs build           # production build
nub run --filter @gpuixui/docs check-types     # tsc
```

## Deploy

```sh
cd packages/deploy
nub run deploy:docs
```

The stack deploys `Cloudflare.Website.Vite` as `gpuixui-docs` with
`rootDir: "../../apps/docs"`. Alchemy injects the Cloudflare Vite plugin, builds
the app and attaches the custom domain. Cloudflare credentials come from the
environment; no secret is stored in this repository.
