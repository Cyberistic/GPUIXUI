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
primitives, TailwindCSS class styling, and components you install as
source you own. One component gives you a macOS, Windows or Linux look, follows
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

The item installs the component, the `@gpuixui/*` runtime it imports and the npm
packages, under `src/components/ui/gpuixui/`. More information on the
[registry page](https://gpuixui.sudokw.com/registry).

`@gpuix/native` ships prebuilt binaries for Apple Silicon, Linux x64 and
Windows. On an Intel Mac, build it once with
`sh apps/playground/scripts/build-native-binding.sh`.

## Effects

Fire, liquid metal, glass and backdrop effects painted by GPUI between your components, from
[`@gpuixui/fx/shader-layer`](https://gpuixui.sudokw.com/effects/shader-layer). Stock GPUI has fixed
primitives, so these need the patched binary in `packages/native` (`nub scripts/build.ts`). It covers
Metal and wgpu, including WebGPU in the browser; DirectX is not implemented yet.

## References & Credits

This library is built on top of [GPUIx](https://github.com/remorses/gpuix) which is built on top of Zed's [GPUI](https://github.com/zed-industries/zed/tree/main/crates/gpui) while heavily references other work (is this distillation?). Throughout development, I kept pointing my agent at https://shoogle.dev/ and tried my best to keep track of all open-source libraries used as reference (or copied verbatim). Here is a list of the most important ones, you can find the rest [here](.agents/slop/LICENSES).

List of libraries I tried to mimic or build on top of:
1. Shadcn, obviously - [https://ui.shadcn.com/](https://github.com/shadcn-ui/ui)
3. Base-ui - https://github.com/mui/base-ui
4. TailwindCSS - https://github.com/tailwindlabs/tailwindcss
5. Lucide Icons - https://github.com/lucide-icons/lucide
6. Tanstack (Virtualizer, table, hotkeys..) - https://tanstack.com/
7. Rune - https://github.com/anomalyco/rune (MIT; the fire, material, glass and light effects are ported from `rune-fx` and `rune-light`)

List of heavily used references:
1. Base-gpui - https://github.com/LukeTandjung/base-gpui
2. GPUI motion - https://github.com/1bye/gpui-motion
3. GPUI-Kit - https://gpui-kit.com/


## License

[MIT](./LICENSE)
