# 722 — The native window: one `Window` recipe every block wears

| Field | Value |
| ----- | ----- |
| Owner | `shell` (`packages/shell`) |
| Depends on | `721` |
| Feeds | `728`, `729`, `727`, the launch film (`apps/playground/src/film`) |
| Status | planned |

## Why

Every block draws its own window: the hunter block's painted chrome, the docs
reproductions' per-block window CSS, and `TitleBar` itself paints opaque `bg-muted`
(`packages/shell/src/platform/title-bar.tsx:22`). A Mac window has one anatomy:
a sidebar that runs **edge to edge under the traffic lights**, a **unified
toolbar** over the content column, opaque content, and an optional inspector.
This plan ships that anatomy once.

## The anatomy

```
┌──────────── sidebar (material) ─┬──── toolbar (52pt, over content) ─────────┐
│ ● ● ●                           │ ‹ ›  Title          [seg] [search…] [⊕]  │
│ ─ Source list ─                 ├───────────────────────────────────────────┤
│                                 │ content (opaque)          │ inspector     │
└─────────────────────────────────┴───────────────────────────┴───────────────┘
```

## Step 1 — window options from the theme

`packages/shell/src/platform/window-options.ts` (new, ~30 LOC):

```ts
/** The `WindowOptions` a theme's chrome needs; spread into `render(…, options)`. */
export const nativeWindowOptions = (theme: Theme): Pick<WindowOptions,
  "titlebarTransparent" | "windowBackground" | "trafficLightX" | "trafficLightY">
```

darwin: `titlebarTransparent: true`, `windowBackground: theme.window`,
`trafficLightX: 20`, `trafficLightY` = the toolbar's centre line (`toolbar
height / 2 - 6` → `20` for 52pt, `13` for 38pt). Other platforms: `{}`.

## Step 2 — `Window` and its parts

`packages/shell/src/window/window.tsx` (new). Compound parts, shadcn-shaped:

```tsx
<Window toolbar="unified">            {/* unified 52 | compact 38 | none */}
  <Window.Sidebar width={220}>…</Window.Sidebar>
  <Window.Main>
    <Window.Toolbar title="Inbox" leading={…} actions={…} />
    <Window.Content>…</Window.Content>
  </Window.Main>
  <Window.Inspector width={260}>…</Window.Inspector>
</Window>
```

Rules:

- `Window.Sidebar` paints `materialFill(theme, "sidebar")`, starts at `y = 0`,
  and pads its top by the toolbar height so its first row sits under the
  lights. Its trailing edge is a `borderWidth.thin` hairline in `border`.
- `Window.Toolbar` paints `materialFill(theme, "titlebar")` over the main
  column, `height` from `toolbar`. When there is **no** sidebar it reserves
  `TRAFFIC_LIGHT_INSET`; with a sidebar it does not (the lights are over the
  sidebar). Title: `text-sm font-semibold` (13pt semibold, as AppKit).
- `Window.Content` paints `background` (opaque). `Window.Inspector` paints
  `background` with a leading hairline.
- Sidebar and Inspector widths are resizable through `@gpuixui/dock`'s
  existing split handle — reuse it, do not write a second drag handler. Read
  `packages/dock/README.md` for the handle's API first.
- The whole window background is unpainted on darwin (so the material shows),
  `background` elsewhere.

Fold the existing `TitleBar` into this: `TitleBar` becomes
`Window.Toolbar` with `toolbar="compact"` semantics, and its file is deleted
once its one consumer (the docs page, `packages/shell/docs`) moves. Keep
`titleBarPadding`/`TITLE_BAR_HEIGHT` in `logic.ts`, renamed
`toolbarHeight` = `{ unified: 52, compact: 38, none: 0 }`.

## Step 3 — `SourceList`

`packages/shell/src/window/source-list.tsx` (new) — the sidebar's list:

- Section header: 11pt semibold `mutedForeground`, 8pt top gap, collapsible
  through `@gpuixui/components/collapsible`.
- Row: 28pt high, 16pt icon (`iconSize.md`) in `primary`, label 13pt, trailing
  count badge in `mutedForeground`, radius `radius.md` (6), inset 10pt from
  the sidebar edges.
- Selection: `primary` fill with `primaryForeground` text when the window is
  key; `muted`-on-material (`#0000001A` light, `#FFFFFF1A` dark — tokens, not
  literals: add `selectionInactive` to `selection.ts`) when it is not.
- **No hover wash.** Mac sidebars do not highlight on hover.
- Keyboard: ↑/↓ move selection, ←/→ fold a section, type-ahead through the
  existing `@gpuixui/components/typeahead`.

Check `packages/components/src/sidebar.tsx` first: if its menu parts already
do selection and typeahead, `SourceList` composes them with the Mac recipe
instead of re-implementing — report which in the commit message.

## Step 4 — docs and inventory

- `packages/shell/docs/window.mdx`, `source-list.mdx` — page, anatomy, the
  `nativeWindowOptions` call, the measured limits from `docs/gpuix-capabilities.md:144`.
- `COMPONENTS.md` — rows for `Window` and `SourceList`; the `Toolbars` row
  points at `Window.Toolbar`.
- `apps/docs` HTML reproduction: `apps/docs/src/components/docs/window-frame.tsx`
  (new) — the same anatomy over `--material-*` and `.gx-material`, used by
  every block in `728`/`729`. Delete the per-block window CSS as each block
  moves to it.

## Test plan

Unit (`nub run --filter @gpuixui/shell test`):

| Case | Inversion |
| ---- | --------- |
| darwin asks for a transparent titlebar and the theme's window | return `{}` for darwin |
| the lights centre on the unified toolbar | `trafficLightY: 0` |
| a toolbar without a sidebar reserves the lights | always pad 12 |
| a toolbar beside a sidebar does not reserve them | always pad `TRAFFIC_LIGHT_INSET` |
| a source-list row paints no hover wash | add `hover:bg-accent` to the row recipe |
| an unfocused window paints the inactive selection | always paint `primary` |

Native (live runner, scoped):

- Add `window-anatomy` to `apps/playground/src/live/registry.ts`: mount
  `Window` with a sidebar, toolbar, content and inspector at 900×520;
  assert by `getElementBounds` that the sidebar starts at `(0,0)`, the toolbar
  is 52 high and starts at the sidebar's right edge, content starts at
  `y = 52`, and ↓ in the source list moves the selected row.

```sh
nub run --filter playground build && nub apps/playground/dist/live/run.js --only window-anatomy --only window-chrome
```

Expected: both green. By eye on darwin: lights over the sidebar, centred on
the toolbar's line; record a `screencapture -l` in `.agents/slop/evidence/722-window.png`.

## Acceptance

- Unit + `window-anatomy` green; `nub run check`, `lint`, `test` green.
- `TitleBar` deleted, its consumers moved.
- The film's frame (`apps/playground/src/film/frame.tsx`, plan `060`) is **not**
  changed: it draws the OS's chrome (lights, caption buttons) because an
  offscreen capture has none. Its own `Window` name is a film-local frame, not
  this component; the shell `Window` draws the app's chrome *under* the OS's.
  A capture of a shell `Window` therefore still goes inside `frame.tsx`.

## STOP

- Stop if `trafficLightY` does not move the lights (by eye): the input is not
  honoured on this host; report with the capture.
- Stop if the dock split handle cannot host a sidebar edge without a new drag
  implementation.
