# 717 — FileTree on shadcn's AI Elements `file-tree`

## Why

`@gpuixui/files`' `FileTree` is a generic data tree with a leading checkbox, a
glyph per kind and a flat row list. shadcn's AI Elements file tree is a
different composition: declarative `FileTreeFolder` / `FileTreeFile` parts, a
single selected path, `expanded` / `defaultExpanded`, guide lines down each
level, a chevron that turns with the folder, type icons and a monospace label.

The checkbox was also a measured defect: its press reached the row as well, so
it could not add a row to the selection (TODO.md → Interlocks). Replacing the
selection model with one selected path removes the gesture rather than patching
it.

Reference: `vercel/ai-elements` `packages/elements/src/file-tree.tsx` and
`skills/ai-elements/references/file-tree.md`; shadcn's published page
`/docs/ai-elements/base/file-tree`.

## Target anatomy

```
FileTree                  role=tree, one tab stop, height clip + scroll
├── row (folder)          guides · chevron · open/closed folder · name
│   └── row (nested)      one guide cell per ancestor depth
├── row (file)            guides · blank chevron slot · type icon · name
└── FileTreeIcon          a row's icon slot (custom content)
    FileTreeName          a row's truncated monospace name
```

The reference's `FileTreeActions` is not shipped: the task's surface names the
folder, file, icon and name parts, and an actions rail inside a pressable row
needs a press-routing contract of its own. It can land later without changing
the tree's model.

## Decisions

- **Parts declare, the root paints.** `FileTree` reads its `children` once into
  `FileNode[]` (the type `buildFileTree` already answers) and paints one flat
  row list. A flat list is what makes the roving tab stop, arrow walking and
  Left/Right possible; a recursive part renderer would need a second
  registration pass to know the visible order.
- **The generic tree owns the keyboard.** `useTree` from
  `@gpuixui/data/tree/use-tree` provides the one tab stop, native focus moves,
  Left/Right collapse/expand, Enter/Space and type-ahead. `flattenTree` /
  `treeCursorMove` stay the package's model.
- **One selected path.** `selected` is the controlled file path; `onSelect`
  fires once per file press (pointer, Enter or Space). A folder press toggles
  only its own subtree and never calls `onSelect`.
- **Expansion is store-friendly.** `expanded` / `defaultExpanded` accept any
  iterable of paths and are read through `@gpuixui/data`'s `expandedSet`, so a
  saved JSON list reopens the same tree. `onExpandedChange` reports the sorted
  open paths.
- **No transform, no absolute positioning.** The chevron swaps
  `chevron-right` / `chevron-down`; guide lines are inline cells with a
  `borderLeftWidth`, not a positioned rail.
- **Monospace-ish.** The name uses the theme's `code` type role (its mono
  family), the row height is the density's `rowHeight`.

## Files

Rewrite:

- `packages/files/src/tree/logic.ts` — keep `buildFileTree`, `fileKindOf`,
  `fileIcon`; add `fileTreeSpec`, `visibleFileRows`, `fileTreeTab`,
  `fileTreePaths`.
- `packages/files/src/tree/file-tree.tsx` — `FileTree`, `FileTreeFolder`,
  `FileTreeFile`, `FileTreeIcon`, `FileTreeName`, one internal row.
- `packages/files/src/tree/recipe.ts` — the root frame recipe.
- `packages/files/src/theme.ts` — re-export `themeColors`, `pointerWash`.
- `packages/files/src/index.ts`, `packages/files/src/docs.test.ts`,
  `packages/files/src/tree/logic.test.ts`, the package README and page.

Create:

- `packages/files/src/behaviour/file-tree.test.tsx`
- `packages/files/vitest.behaviour.config.ts`
- `packages/files/package.json` — the `test:behaviour` script.

Update:

- `packages/primitives/src/core/index.ts` — publish `storedText`, the read a
  stored `selected` path uses.
- `apps/docs/src/components/docs/file-tree-demo.tsx` + test + `demos.css` —
  the drawing follows the new anatomy.
- `apps/playground/src/live/file-tree*.ts(x)`, registry, README section.
- `COMPONENTS.md`, `TODO.md`, `packages/files/README.md`.

## Tests

`packages/files/src/tree/logic.test.ts`:

- a stored expanded list (`["src"]`, not a `Set`) paints exactly the rows a
  `HashSet` does, and a stored `null` paints the collapsed tree;
- the tab row is the selected file when it is visible, the first row when the
  selection is absent or hidden;
- toggling `src` leaves `docs` and every ancestor untouched.

`packages/files/src/behaviour/file-tree.test.tsx` (real GPUix window):

- a press on `src` paints its children, leaves `assets` closed, and reports
  one path;
- a press on `readme.md` selects it and calls `onSelect` exactly once;
- the tab stop is the selected row at mount, the first row without one;
- Down/Up walk the visible rows with native focus; Right opens, Left closes;
- `defaultExpanded={["src"]}` paints the same rows a press-opened `src` does.

Every case is inverted once (source edit) before the branch is called done.

## Gates

```sh
nub run --filter @gpuixui/files test
nub run --filter @gpuixui/files test:behaviour
nub run --filter @gpuixui/docs test
nub run check
```

Screenshots: the playground's `file-tree-lifecycle` capture, and one browser
screenshot of `/docs/files/file-tree` through `playwright-core`.

## STOP

- Stop if `useTree` cannot be imported from its subpath; the alternative is a
  local keyboard that would duplicate the tab-stop rule. Report instead.
- Stop if the native renderer cannot paint a per-depth `borderLeftWidth` cell;
  the fallback is a text guide (`│`) and must be recorded, not silently faked.
