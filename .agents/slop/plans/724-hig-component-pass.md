# 724 — The HIG pass: every shipped component feels like AppKit on darwin

| Field | Value |
| ----- | ----- |
| Owner | `primitives` + `components` (each in its own worktree; one commit per family) |
| Depends on | `721`, `722` (the `Window` the audit renders in) |
| Status | planned |

## Why

The components are correct and tested, but they behave like shadcn on the web:
hover washes everywhere, web control heights, and overlays that appear without
physics. The darwin platform style must make them behave like AppKit **without**
forking the components: every difference below is a token or a platform style
value the component already reads, or one new token it learns to read.

## The darwin deltas (the whole spec)

| Concern | Today | darwin target | Where it lives |
| ------- | ----- | ------------- | -------------- |
| Control height `sm`/`md`/`lg` | web density | **19 / 22 / 28** pt | `platforms.ts` density for darwin |
| Body / small / mini text | 14 / 12 | **13 / 11 / 10** pt | darwin `typography` |
| Hover on buttons, rows, list items, tabs | `accent` wash | **none** (press darkens 8%) | new `interaction.hover: "wash" \| "none"` in `Theme`; darwin `none` |
| Hover on menu items | wash | **`primary` fill, `primaryForeground` text** (selection follows the pointer) | menu recipe reads `interaction.menuHover: "accent" \| "primary"` |
| Toolbar buttons | ghost + wash | ghost, bezel (`muted`) **only on hover** — the one AppKit hover | `Window.Toolbar` passes `variant="toolbar"` |
| Focus ring | `ring` shadow | `primary` at 50% alpha, 3pt, outside the edge | darwin `focusRing` values |
| Menu | 8 radius, 32 rows | **6 radius, 22pt rows, 4pt inset, ⌘ glyphs right-aligned in `mutedForeground`**, `popover` material | `dropdown-menu.tsx`, `context-menu.tsx`, `app-menu` recipes |
| Popover / dialog entry | fade | **spring** scale-from-anchor is unsupported (no `transform`) → opacity + 6pt slide on `motion.spring.snappy` | `@gpuixui/motion`, `presence` contract |
| Sheet (`Dialog` with `presentation="sheet"`) | centred dialog | **slides from under the toolbar**, top-anchored, window-width − 80 | `sheet.tsx` gains `edge="toolbar"` |
| Switch | 44×24 | **38×22**, knob shadow `elevation.sm` | darwin `SwitchMetrics` |
| Table rows | 36 | **24**, alternating `muted` at 50% | `@gpuixui/data` density for darwin |
| Tooltip delay | 300 ms | **1000 ms**, no arrow, 11pt | darwin tooltip token |
| Scrollbars | always | overlay, shown on scroll | `ScrollArea` `type="scroll"` default on darwin |

Every value is a starting value from Apple's HIG and AppKit defaults. Before
committing a family, **capture System Settings (or Finder) on this Mac** at
the same scale and compare: a mismatch over 2pt is fixed to the capture, and
the capture goes in `.agents/slop/evidence/724-<family>.png`.

## Order (one commit each)

1. tokens: `interaction` and the darwin values above (`packages/tokens`).
2. primitives: `Button`, `IconButton`, `Toggle`, `ToggleGroup`, `Switch`,
   `Checkbox`, `RadioGroup`, `Select`, `Slider`, `Input`, `Tooltip`,
   `ScrollArea` read `interaction.hover` instead of painting a hover literal.
   Find every hover site first: `rg -n "hover" packages/primitives/src/components packages/tw/src`.
3. components: menus (`dropdown-menu`, `context-menu`, `command-menu`,
   `navigation-menu`), `popover`, `dialog`, `sheet`, `tabs`, `sidebar`, `list`,
   `item`.
4. data: `Table`, `TableView` darwin density.
5. shell: `app-menu`, `Toolbar` → `variant="toolbar"`.

## Test plan

Each family gets **one** platform test file beside it, e.g.
`packages/primitives/src/components/darwin.test.tsx`, driven by the existing
headless renderer:

| Case | Inversion |
| ---- | --------- |
| a darwin button paints no hover fill | read `colors.accent` on hover again |
| a non-darwin button keeps its hover wash | gate the hover on `interaction` for every platform |
| a darwin menu item hovered paints `primary` with `primaryForeground` text | paint `accent` |
| darwin control heights are 19 / 22 / 28 | swap `md` to 24 |
| a darwin sheet starts at the toolbar's bottom edge | anchor at `0` |

Native scoped check per family:

```sh
nub run --filter playground build && nub apps/playground/dist/live/run.js --only theme-gallery --only focus-visible
```

`theme-gallery` (plan `150`) must still pass for every platform — it is the
guard that non-darwin looks did not move.

## Acceptance

- Every row in the table is implemented or recorded as a limitation in
  `COMPONENTS.md` with the evidence.
- No component reads `platform === "darwin"`; they read tokens.
- `nub run check`, `lint`, `test` green.

## STOP

- Stop if a delta needs `transform` (the sheet's scale, a popover's scale):
  use the opacity + slide fallback named above, never a hack.
- Stop if a family needs more than one new token: the table is the budget.
