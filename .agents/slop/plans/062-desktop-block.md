# 062 — The `desktop` block: a whole XP-era / Aero-era desktop, from the library

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream (agreed with `native-mac`, 2026-10-31) |
| Depends on | `728` Part A (the block contract; this plan performs its hoist), `packages/tokens/src/retro.ts` (`luna`, `aero`) |
| Status | in progress |

## Why

The owner wants the theming story told by a desktop a viewer recognises on sight —
"we don't even need to say its name in the video". The `luna` and `aero` looks
already restyle every control; nothing shows them as a **desktop**: wallpaper,
taskbar, Start button and menu, windows with their era's chrome. This block is that,
and the film (plan 064) uses it.

## Rules

- **No copied artwork.** No Bliss, no Windows logo or flag, no system icons or
  bitmaps. The wallpaper is drawn here (sky, a rolling green hill, clouds as
  ellipses), the Start button is a green pill with the word, icons are
  `@gpuixui/icons` glyphs on coloured tiles. The **chrome values** are the era's
  own, as `retro.ts` already records (Luna `#0A246A`→`#3A6EA5` title family,
  `#ECE9D8` face; Aero glass greys, `#3399FF` highlight).
- **Every name is Hunter × Hunter** (owner, 2026-10-31): the user is Gon Freecss;
  folders are Greed Island, Heavens Arena, Yorknew City; the recycle bin is real.
- **Runtime limits, honestly:** two-stop gradients only (multi-band gloss is stacked
  layers), no per-element blur (Aero glass is a translucent fill with a sheen over the
  wallpaper — stated in the docs page), SVG paints one tint (a two-colour glyph is two
  stacked `Icon`s), no `zIndex` (the Start menu and the active window render last).
- Content inside windows is **library components** under `retroTheme(…, look)`:
  that is the theming claim.

## Files

| Path | What |
| ---- | ---- |
| `examples/blocks/` | new private workspace `@gpuixui/blocks` (728 Part A), `package.json` + `tsconfig.json` from `examples/basic-app` |
| `examples/blocks/src/{settings,kanban,inbox}/` | the three film blocks, moved from `apps/playground/src/blocks` (`git mv`) and split into `<slug>.tsx` / `data.ts` / `logic.ts` |
| `examples/blocks/src/desktop/desktop.tsx` | `DesktopBlock({ look })`: wallpaper, icons, windows, taskbar, Start menu |
| `examples/blocks/src/desktop/chrome.tsx` | `EraWindow`: title bar, caption buttons and frame per look |
| `examples/blocks/src/desktop/taskbar.tsx`, `start-menu.tsx`, `wallpaper.tsx` | one part each |
| `examples/blocks/src/desktop/data.ts` | icons, programs, folders, files (Hunter × Hunter) |
| `examples/blocks/src/desktop/logic.ts` + `.test.ts` | window focus order, Start menu open/close, clock text |
| `examples/blocks/src/blocks.test.tsx` | behaviour: each block mounts; Start opens the menu; a taskbar button raises its window; a click outside closes the menu |
| `apps/playground/src/film/*` | imports move to `@gpuixui/blocks/<slug>`; a `desktop-luna` and a `desktop-aero` take |

## Steps

1. Workspace + hoist; film imports updated; `nub run check` and the film tests green. Commit.
2. `desktop` for `luna`: wallpaper, taskbar, Start menu, one Explorer-style window with
   the blue task pane, one properties window of library controls. Capture the take,
   look at it, fix, commit.
3. `aero` variant: glass chrome, superbar, orb. Capture, look, commit.
4. Behaviour tests, each proven to fail without its behaviour. Commit.
5. Docs page `/blocks/desktop` with an HTML reproduction from the same `data.ts`
   (728 Part A), `source` from the compiled module (`?raw`). Commit, merge, ping
   `native-mac`.

## STOP

- A look needs a paint the runtime lacks (per-element blur, multi-stop gradient) and
  stacking layers does not read as the era: stop and report with a capture. Never
  substitute a bitmap.
- `workspaces/native-mac` has started touching `examples/blocks`: stop and agree
  ownership before moving files.

## Acceptance

A viewer shown the Luna capture without a caption names the era; the Aero capture
likewise. `nub run check`, `nub run lint`, `nub run test` green.
