<p align="center"><img src="apps/docs/public/logo.svg" width="96" alt="GPUIxUI"></p>

<h1 align="center">GPUIxUI</h1>

<p align="center">
  <strong>One library. Three native looks.</strong><br>
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
[GPUix](https://github.com/remorses/gpuix) through React — no DOM, no webview. It keeps the
developer experience of [shadcn/ui](https://ui.shadcn.com): Base UI-style
compound parts, Tailwind-style class recipes, and components you install as
source you own. One component tree wears a macOS, Windows or Linux look, follows
an Omarchy desktop theme, and can paint into a kitty or Ghostty terminal.

## Quick start

Requires Node 24.18.0 (`.node-version`) and [nub](https://nub.dev).

```sh
nub install
nub run dev:docs         # the documentation site
nub run dev:playground   # the native playground window
```

Add a component to your own app with the shadcn CLI:

```sh
npx shadcn@latest add https://gpuixui.sudokw.com/primitives-button.json
```

`@gpuix/native` ships prebuilt binaries for Apple Silicon, Linux x64 and
Windows. On an Intel Mac, build it once with
`sh apps/playground/scripts/build-native-binding.sh`.

## Repository

| Path | What it is |
| --- | --- |
| `apps/docs` | The documentation site (Fumadocs on TanStack Start) |
| `apps/playground` | The native playground and the smoke suites |
| `packages/*` | The library: tokens, primitives, components, data, shell, dock, editor and more |
| `examples/blocks` | Whole screens composed from the library |
| `examples/slang` | Slang, the fx-991ES Plus calculator app: `@gpuixui/calc` in a native window or a terminal |
| `media/launch` | The launch film, cut from real native windows |

## Slang

<img src="examples/slang/media/logo.svg" width="48" alt="Slang" align="left">

[`examples/slang`](examples/slang) is **Slang**, the fx-991ES Plus scientific
calculator as a native app: the device's own key grid and LCD, the eight modes
in the manual, ⌘K over every command, in a window or a kitty/Ghostty terminal.

```sh
nub run --filter @gpuixui/slang dev
nub run --filter @gpuixui/slang terminal
```

The engine is [`@gpuixui/calc`](packages/calc); its model seam is where a TI-84
will land.

## Development

```sh
nub run check   # tests-can-fail gate, exports, lint, format, type-check
nub run lint
nub run test
```

## Documentation

Everything is documented at **[gpuixui.sudokw.com](https://gpuixui.sudokw.com)**:
installation, theming, every component with its API and keyboard notes, and the
blocks.

## Contributing

Contributions follow the repository rules in [`AGENTS.md`](AGENTS.md): Effect-first
domain code, tokens as the single source of style, tests that can fail, and every
component verified in the native runtime. Read it before opening a change.

## License

MIT, as declared by the public package [`@sudokw/gpuixui`](npm/gpuixui).
Third-party licences and attribution are recorded in
[`.agents/slop/LICENSES/`](.agents/slop/LICENSES/).
