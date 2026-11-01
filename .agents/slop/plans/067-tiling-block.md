# 067 — The `tiling` block: a Hyprland-style Linux desktop

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Package | `examples/blocks` (`src/tiling/`) |
| Depends on | 728 Part A (block contract), tokens `decodeOmarchyPalette` |
| Blocks | 066 (the film's Linux shot) |
| Status | in progress |

## Why (owner, 2026-11-01)

"The omarchy display looks bad and needs a better Linux related example." The
v3 shot was a wallpaper with a window on it. Omarchy is a Hyprland desktop: what
says Linux is the tiling itself.

## The block

`TilingDesktop({ palette })` — one screen, 1280×800 by default:

- **Bar** (Waybar-like) across the top: workspaces `1–5` (the active one
  filled), the focused window's title centred, a clock and battery on the right.
- **Tiles**: a master/stack layout with the theme's gaps — the master tile on
  the left holds the `console` block's deploy view; the stack on the right holds
  a terminal pane (prompt, `nub run dev stats --terminal`, output lines) over
  the `stats` block's tiles. Every tile is a window with a 2 px border; the
  focused tile's border is the palette's accent, the others its `border`.
- **Focus** moves on click (`tile-<id>` test ids) and with `Super+←/→`.
- **Theme**: the palette is an Omarchy `colors.toml` decoded by
  `decodeOmarchyPalette` → `paletteToTokens`, so switching palette re-themes the
  bar, gaps, borders and every block inside at once. Ships tokyo-night,
  catppuccin, gruvbox and rose-pine from `media/launch/assets/omarchy/`.

Files: `src/tiling/{data.ts,logic.ts,logic.test.ts,bar.tsx,tiling.tsx}`, an
`exports["./tiling"]`, a `main.tsx` entry, a `blocks.test.tsx` case.

## Test plan

- `logic.test.ts`: `layoutTiles(size, gaps, count)` gives a master of half the
  width and an even stack, with gaps on every side; `nextFocus` wraps.
- `blocks.test.tsx`: clicking a stack tile moves the accent border to it;
  switching palette changes the bar's background.

```sh
nub run --filter @gpuixui/blocks test
nub run --filter @gpuixui/blocks dev tiling
```

## STOP

- No wallpaper image stands in for the layout; gaps show the palette's
  background colour.
