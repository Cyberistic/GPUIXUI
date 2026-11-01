# 067 — The `tiling` block: a Hyprland-style Linux desktop

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Package | `examples/blocks` (`src/tiling/`) |
| Depends on | 728 Part A (block contract), tokens `decodeOmarchyPalette` |
| Blocks | 066 (the film's Linux shot) |
| Status | landed |

## Why (owner, 2026-11-01)

"The omarchy display looks bad and needs a better Linux related example." The
v3 shot was a wallpaper with a window on it. Omarchy is a Hyprland desktop: what
says Linux is the tiling itself.

## The block

`TilingDesktop({ palette })` — one screen, 1280×800 by default:

- **Bar** (Waybar-like) across the top: workspaces `1–5` (the active one
  filled), the focused window's title centred, a clock and battery on the right.
- **Tiles**: a master/stack layout with the theme's gaps. The master holds the
  `settings` block in the Linux look (the platform shapes the controls, the
  palette colours them); the stack holds a terminal (fastfetch's summary, a
  `git log --oneline`, the palette's swatches) over a btop monitor (six cores
  as `Sparkline`s and memory as a `DonutChart`). Every tile has a strong
  border; the focused tile's is the palette's accent, the others its `border`.
- **Focus** moves on click (`tile-<id>` test ids) and with `Super+←/→`.
- **Theme**: the palette is an Omarchy `colors.toml` decoded by
  `decodeOmarchyPalette` → `paletteToTokens`, so switching palette re-themes the
  bar, gaps, borders and every block inside at once. Ships tokyo-night,
  catppuccin, kanagawa and rose-pine (Dawn, light) as data in `src/tiling/data.ts`.

Files: `src/tiling/{data.ts,logic.ts,logic.test.ts,tiling.tsx}`, an
`exports["./tiling"]`, a `main.tsx` entry, a `blocks.test.tsx` case.

## Test plan

- `logic.test.ts`: `nextFocus` wraps; every palette decodes to its own theme.
  (The master/stack geometry is flex with the theme's gap, so it needs no
  arithmetic of its own.)
- `blocks.test.tsx`: clicking a stack tile moves the accent border to it;
  switching palette changes the bar's background.

```sh
nub run --filter @gpuixui/blocks test
nub run --filter @gpuixui/blocks dev tiling
```

## STOP

- No wallpaper image stands in for the layout; gaps show the palette's
  background colour.
