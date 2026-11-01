<p align="center"><img src="apps/docs/public/logo.svg" width="96" alt="GPUIxUI"></p>

<h1 align="center">GPUIxUI</h1>

<p align="center">
  <strong>Build super fast GPU-powered for Mac, Windows, Linux & your terminal</strong><br>
  GPUI + React + shadcn + Base UI + Tailwind = GPUIxUI
</p>

<p align="center">
  <a href="https://gpuixui.sudokw.com">Docs</a> ·
  <a href="https://gpuixui.sudokw.com/components">Components</a> ·
  <a href="https://gpuixui.sudokw.com/blocks">Blocks</a>
</p>

<p align="center">
  <img alt="Node 24" src="https://img.shields.io/badge/node-24.18.0-339933?logo=node.js&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black">
  <img alt="Effect 4" src="https://img.shields.io/badge/effect-4-000000">
</p>

## What it is

GPUIxUI is a native UI component library for desktop apps, rendered on the GPU by
[GPUix](https://github.com/remorses/gpuix) through React (no DOM or webview). It keeps the
developer experience of [shadcn/ui](https://ui.shadcn.com): Base UI-style
compound parts, Tailwind-style class styling, and components you install as
source you own. One component tree wears a macOS, Windows or Linux look, follows
an Omarchy desktop theme, and can run in a terminal.

## Quick start

Requires Node 24.18.0 (`.node-version`).

```sh
nub install
nub run dev:docs         # the documentation site
nub run dev:playground   # the native playground window
```

Add a component to your own app with the shadcn CLI:

```sh
npx shadcn@latest add @sudokw/primitives-button
```

The item installs the source, the `@gpuixui/*` runtime it imports and the npm
packages, under `src/components/ui/gpuixui/`. The copied files need
`"jsxImportSource": "@gpuix/react"` in the project's `tsconfig.json`, because the
CLI drops each file's leading comment, where the source declares it. The
[registry page](https://gpuixui.sudokw.com/registry) has the full walkthrough.

`@gpuix/native` ships prebuilt binaries for Apple Silicon, Linux x64 and
Windows. On an Intel Mac, build it once with
`sh apps/playground/scripts/build-native-binding.sh`.



## License

MIT
