# 745 — Three app blocks: `editor`, `music`, `monitor`, and the apps montage

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Package | `examples/blocks` (`src/editor/`, `src/music/`, `src/monitor/`), `apps/docs` |
| Depends on | 728 Part A (block contract), 610 (`@gpuixui/data`), 729 (Mac-app windows) |
| Blocks | 066 (the film's "real apps" beat) |
| Status | landed |

## Why (owner, 2026-11-02)

The owner sent two desktop references full of apps the library should be able
to build: a code editor, a music player, a hardware monitor, a photos library,
a browser. Three of them are new blocks (photos and browser are owed next), and
the film needs scenes that show them.

## The blocks

All three are Mac-app style blocks: `Window` from `@gpuixui/shell` provides the
chrome, every control is a library component, and the block owns only its
layout and its small state.

### `Editor` — `src/editor/`

- **Explorer** (left, 220 px): a tree of folders and files from `data.ts`; the
  open file is filled with the accent; folders toggle.
- **Editor** (centre): a tab row with the open file and a close dot, line
  numbers, and the file's code painted token by token (keyword, string,
  comment, function, punctuation) from a tiny `highlight(line)` in `logic.ts`.
- **Status bar**: branch, language, cursor line/column, indentation.
- **Interaction**: pressing a file opens it — the tab, the code and the status
  bar change together.

### `Music` — `src/music/`

- **Now playing**: album art (a two-stop gradient picked per track), title and
  artist, a waveform of seeded bars (`waveform(seed)` in `logic.ts`), a
  scrubber, transport (shuffle · previous · play/pause · next · repeat) and the
  elapsed / total time.
- **Up next**: four rows; the playing row wears the accent and a level dot.
- **Interaction**: pressing a row makes it the playing track (art, title,
  waveform and time all change); play/pause toggles the transport glyph.

### `Monitor` — `src/monitor/`

- **Two temperature cards**: a label, a large value, and a `Sparkline` of the
  last minute (`samples()` in `logic.ts`, seeded per sensor).
- **Per-core bars**: eight rows, each a `BarChart`-free bar drawn from a value
  and the theme's accent (one element per row — no chart needed for a bar).
- **Memory**: a `DonutChart` of used/free with its legend.
- **Interaction**: a window toggle (1 m · 5 m · 15 m) re-samples both sparklines
  and the numbers.

## Docs, tests, inventory

Per block: `src/<name>/{data.ts,logic.ts,logic.test.ts,<name>.tsx}`, an
`exports["./<name>"]`, a `main.tsx` entry, a `blocks.tsx` record with
`CaptureRender`, `public/blocks/<name>.webp` (a native capture), a
`content/docs/blocks/<name>.mdx` page, a `blocks/meta.json` entry, and a
`.agents/slop/COMPONENTS.md` row.

`logic.test.ts` holds the pure part (`highlight` tokenises every line back to
itself; `waveform(seed)` is stable and in range; `samples(seed, n)` is stable),
and `blocks.test.tsx` holds the two directions of the interaction each block
has (pressing a file changes the tab; pressing a track changes the title;
pressing 5 m changes the sparkline's first point).

## Film

- The "real apps" beat becomes a montage: Slang's fx-991, the editor, the music
  player and the monitor, 0.85–0.95 s each, cut with the platform captions off.
- Retime: assemble 2.0 s, platform Settings 3 × 0.9 s, chat flip 3 × 0.7 s,
  apps 4 × ~0.9 s — the showcase still ends at 19.45 s for the terminal.

## Test plan

```sh
nub run --filter @gpuixui/blocks check-types test
nub run --filter @gpuixui/docs check-types test
nub run check
```

Directions: un-press → the File menu stays; a file press that does not change
the tab; a track press that does not change the title; a window press that does
not change the first sample.

## STOP

- No block draws a component it could import (bars are bars, but a slider is
  the slider).
- No chart is faked: the sparklines and the donut are `@gpuixui/data`.
- Nothing in a block pretends to fetch, stream or persist.

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
