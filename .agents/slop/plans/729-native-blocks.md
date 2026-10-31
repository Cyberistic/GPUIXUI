# 729 — Eight new blocks, each a kind of Mac app

| Field | Value |
| ----- | ----- |
| Owner | `docs-site` + `examples/blocks` |
| Depends on | `728` Part A (the block contract), `722`, `724`, `725` |
| Status | planned |

## Why

The blocks are the product's best argument: a reader sees an app they would
build, and copies it. Today's set leans dashboard/web (dashboard, sign-in,
kanban, management console). These eight are **kinds** of native Mac app —
archetypes, never a copy of a specific product's layout, name or branding.

Every block follows `728` Part A exactly: one compiled module under
`examples/blocks/src/<slug>/`, `data.ts`, `logic.ts` + test, an HTML
reproduction over `window-frame.tsx`, a `block-<slug>` live probe, a capture
PNG, an `.mdx` page, a `meta.json` entry. **One block per commit**, in the
order below (each later block reuses an earlier one's parts).

## The blocks

### 1. `notes` — three-pane writing app

Sidebar (folders, `SourceList`) · note list (title, 2-line excerpt, date; 64pt
rows) · editor (`@gpuixui/editor` in prose mode if it has one — check its
README — else `TextArea` with the editor's toolbar). Toolbar: new note, share,
search. **Probe:** select the 3rd note, type "x" in the editor, assert the list
row's excerpt updates.

### 2. `settings` — a System-Settings-style preferences window

Grows the compiled `Settings` block plan `060` landed (hoisted by `728` to
`examples/blocks/src/settings/`) — extend it, keep its Look control and its
`blocks.test.tsx` cases green; the docs `settings` slug stays.
Sidebar with a search field and grouped panes with 20pt coloured icon tiles ·
pane content built only from `InsetGroup`, `Switch`, `PopUpButton`,
`SegmentedControl`, `Slider`. Window is fixed-width 715 (not resizable),
`toolbar="unified"` with the pane title. **Probe:** search "notif", assert the
sidebar shows only Notifications; toggle a switch, assert its row reads on.

### 3. `launcher` — the ⌘K command HUD

A 680×420 panel: search field (22pt text), grouped results with 32pt rows,
icon, title, subtitle, trailing shortcut glyphs, a footer action bar ("↵ Open
· ⌘↵ Actions"). Built on `CommandMenu`. Paints `materialFill("hud")`.
Shown as a **centred overlay in the window** until plan `706` (overlay windows)
lands; then it becomes a borderless floating window — leave a `// TODO:` citing
`706`. **Probe:** type "rel", assert the first result is "Releases"; ↓↵ fires
its action.

### 4. `menubar` — a menu-bar extra's popover

A 320-wide popover: header with status, a list of 4 toggles/rows, a
`Progress`, a footer with Settings… and Quit. Paints `materialFill("popover")`,
radius 10. Rendered in a 320×420 window until plans `702` (tray) and `706`
land; the page says so in one sentence and links both. **Probe:** toggle row 2,
assert the header status line changes.

### 5. `agent` — an AI coding assistant window

Sidebar of sessions · `Chat` (plan `716`) with streamed `Message`s, a tool-call
row, a reasoning `Shimmer`, a diff card using `@gpuixui/editor`'s diff view ·
inspector with the touched files (`FileTree`). Toolbar: model `PopUpButton`,
stop button while streaming. Streaming is driven by a `Clock`-based fake
stream in `logic.ts` (Effect `Stream`, `TestClock` in the test). **Probe:**
send a prompt, advance the stream, assert the reply row grows and the stop
button returns to send.

### 6. `calendar` — week view

Sidebar: mini month (`Calendar`) + calendar list with coloured checkboxes ·
week grid: 7 columns × 24 hourly rows in a `ScrollArea`, events as absolutely
placed boxes in the calendar's colour at 85% fill with a 3pt leading bar.
Toolbar: ‹ Today ›, `SegmentedControl` Day/Week/Month. Overlap layout is a pure
rule (`layoutDay(events) → columns`). **Probe:** press ›, assert the header
week advances 7 days; unchecking a calendar hides its events.

### 7. `welcome` — first-run window

A 800×520 non-resizable window, no sidebar: app icon (our mark), title, 3
feature rows (icon, title, line), a primary "Continue" and a secondary
"Import…" that calls `windowActions.pickPaths` (`@gpuixui/shell`). A 3-step
`Stepper` advances in place. **Probe:** Continue twice, assert step 3 is shown;
the Import button calls the injected `WindowHost.pickPaths`.

### 8. `viewer` — media viewer with a floating HUD

Sidebar of albums · grid of thumbnails (`@gpuixui/media` `ImagePreview`) ·
opening one shows it full-content with a floating HUD bar (`materialFill("hud")`,
radius 12, bottom-centred) holding ‹ › zoom and info. Space toggles the open
image (Quick Look habit). **Probe:** select a thumbnail, press Space, assert the
HUD exists; Esc closes.

## Page + index

- `apps/docs/content/docs/blocks/meta.json` — order: pipeline, notes,
  settings, launcher, agent, calendar, viewer, menubar, welcome, then the
  existing blocks. Remove `dashboard-management` from the landing (it stays a
  block).
- `apps/docs/content/docs/blocks/index.mdx` — a lead sentence: "Each block is a
  real native window. Run any of them with `nub run --filter @gpuixui/blocks
  dev -- <slug>`."

## Test plan

Per block: `logic.test.ts` with at least one inversion-proven case (named in
the block's section above), the `block-<slug>` probe, and the docs registry
test from `728` (source is the compiled module).

```sh
nub run --filter @gpuixui/blocks test
nub run --filter playground build && nub apps/playground/dist/live/run.js --only block-<slug>
```

End of plan (cross-cutting, once): the full headless suite
`nub run --filter playground smoke`.

## Acceptance

- Eight blocks, each green in its probe, each with a native capture and a page.
- `COMPONENTS.md` unchanged except where a block exposed a component gap — that
  gap is a new row in `TODO.md`, not a fix hidden in the block.
- `nub run check`, `lint`, `test` green after every block commit.

## STOP

- Stop if a block needs a component the library lacks beyond `725`'s five:
  record the gap, do not paint it inside the block.
- Stop if a block needs `canvas` or `transform` (both unsupported,
  `packages/runtime/src/capabilities.ts`).
