# 744 — The `macos` desktop block and the three-OS chat flip

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Package | `examples/blocks` (`src/macos/`), `apps/playground/src/film`, `apps/docs` |
| Depends on | 728 Part A (block contract), 729 (Mac-app windows), 067 (tiling) |
| Blocks | 066 (the film's platform beat) |
| Status | landed |

## Why (owner, 2026-11-02)

The platform beat shows the same *Settings window* in three looks, but the
reference the owner sent (three desktops with the same chat window) needs a
desktop behind the app — and the library has Windows (`desktop`) and Linux
(`tiling`) desktops but no macOS one.

"The platform images flip between Windows 11, Linux and macOS with the chat
block on top" — so: one macOS desktop block, then three takes that put the
*chat block* (the `agent` block, window chrome per platform) on each desktop,
flipped in the film.

## The block

`MacosDesktop({ children })` — one screen, 1280×800 by default:

- **Wallpaper**: stacked two-stop gradients and translucent rounded shapes (the
  runtime paints no blur and no filters, so depth is layered fills, not glass).
- **Menu bar** (28 px): the Gon mark, the focused app's name in bold, then
  File · Edit · View · Go · Window · Help; on the right a search glyph, the
  battery and the clock in the theme's menu-bar ink.
- **A menu opens on press**: pressing a menu title paints its items over the
  bar; pressing it again, or pressing the backdrop, closes it. Items come from
  a small table in `data.ts` (they are labels, not commands — nothing pretends
  to act).
- **Dock**: a centred translucent plate with rounded app tiles (library
  `Icon`s); the running apps wear a dot beneath.
- **`children`** is the floating window layer, so a caller can put a real
  window (`<Window><Agent /></Window>`) on the desktop.

Files: `src/macos/{data.ts,logic.ts,logic.test.ts,macos.tsx}`, an
`exports["./macos"]`, a `main.tsx` entry (`macos`), a `blocks.test.tsx` case,
a docs page `content/docs/blocks/macos.mdx`, a `blocks.tsx` record with
`CaptureRender`, a `public/blocks/macos.webp` capture, and a
`.agents/slop/COMPONENTS.md` row.

## The takes (film)

Three takes at 1280×800, one still each (30 frames, no pointer):

```tsx
"chat-mac":   <MacosDesktop><AgentWindow look="darwin" /></MacosDesktop>
"chat-win":   <DesktopBlock look="aero" /> + <AgentWindow look="win32" /> over it
"chat-linux": <TilingDesktop palette="tokyo-night" /> + <AgentWindow look="linux" />
```

`AgentWindow` is `<Window platform={look} title="Agent" width=…>` wrapping the
`Agent` block, positioned by the take at a fixed six-by-seven ratio.

The film uses them as three 0.7 s stills with the platform captions
(macOS / Windows / Linux) already wired for the Settings beat.

## Test plan

- `logic.test.ts`: `nextMenu(current, pressed)` opens, re-presses close, a
  different title switches; `dockRunning(slug)` marks the running apps.
- `blocks.test.tsx`: pressing the File title paints its items; pressing the
  backdrop removes them (the two directions).
- `nub run --filter @gpuixui/blocks check-types test`; `nub run check` at the
  repo root; docs `nub run --filter @gpuixui/docs check-types`.

## STOP

- No wallpaper *image*: the ground is drawn from gradients and shapes.
- No fake menu commands: items are inert labels with checked styling only.
- The flip never shows a platform twice in a row, and each still is the same
  chat window in that platform's chrome.

## Landed

- `macos`: `examples/blocks/src/macos/{data,logic,logic.test,macos}.tsx`, an
  `exports["./macos"]`, a `main.tsx` entry, a `blocks.test.tsx` case (open, close
  on the same press, close on the desktop) and `press-routing` clean.
- `editor`, `music`, `monitor`: the same shape, each with its pure logic and its
  native behaviour case (a file press changes the status line, a row press
  changes the title, a range press changes the window label).
- Docs: `content/docs/blocks/{macos,editor,music,monitor}.mdx`, their
  `blocks.tsx` records with the native captures in `public/blocks/`, and the
  `blocks/meta.json` entries.
- Film: `chat-mac`, `chat-win`, `chat-linux` takes (the chat on each desktop),
  and the editor/music/monitor takes in the "real apps" montage.
