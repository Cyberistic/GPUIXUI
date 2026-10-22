# `@gpuixui/files`

File and inspector surfaces rendered by GPUix through React — a file tree, a log
viewer and a property panel. Each is a composition over the generic packages,
with a **pure half** a store or an Effect can drive without the component.

## Why a package

A file tree, a log viewer and a property panel are inspector surfaces, not data
presentation: they share the file-path and severity vocabulary of an IDE, not
the column vocabulary of `@gpuixui/data`. Folding them into the data package
would make every consumer of a table pay for the file/severity model, so they
live here and depend on the packages below them.

## What it reuses

| Surface | Reuses | Adds |
| ------- | ------ | ---- |
| `FileTree` | `@gpuixui/data`'s tree (`useExpandedRows`, `TreeView`) and selection (`pressSelection`) | a glyph per kind, single/multi selection |
| `LogViewer` | `@gpuixui/data`'s `VirtualList` | the `level message` parser, the level filter, the follow toggle, per-level tints |
| `PropertyPanel` | `@gpuixui/primitives`' `Input`, `NumberField`, `Switch`, `Select` | the row/record model and the whole-record edit |

## Shape

```
src/
  tree/       FileTree, buildFileTree, fileKindOf, fileIcon
  log/        LogViewer, parseLogLine, filterByLevel, levelTone
  property/   PropertyPanel, propertyRecord, setProperty
  theme.ts    the single seam over @gpuixui/tokens
  recipe.ts   the recipe compile cache
examples/     mountable screens (registered in examples/index.ts)
docs/         one page per surface
```

## Usage

```tsx
import { buildFileTree, FileTree, LogViewer, PropertyPanel } from "@gpuixui/files";

<FileTree
  aria-label="Files"
  height={280}
  roots={buildFileTree(["src/index.ts", "readme.md"])}
  keyOf={(n) => n.path}
  childrenOf={(n) => n.children ?? []}
  labelOf={(n) => n.name}
  onSelectionChange={setChosen}
/>;

<LogViewer height={240} lines={lines} followTail={follow} onFollowTailChange={setFollow} />;

<PropertyPanel
  title="Shape"
  rows={rows}
  onChange={(record) => apply(record)}
/>;
```

## Styling

Resting appearance is a Tailwind class recipe compiled through `@gpuixui/tw`'s
default registry, cached once per recipe per theme. Colour roles come from the
caller's theme through `src/theme.ts`; geometry the runtime exposes as behaviour
(row height, column width) is set in `style`.

## Commands

```sh
nub run --filter @gpuixui/files test          # the pure logic
nub run --filter @gpuixui/files check-types
```
