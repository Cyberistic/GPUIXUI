# 067 — Launch film v7: the wall, the dashboard, and Omarchy

The v6.5 film is green on every automated audit and still judged weak on three
things a person sees in the first ten seconds:

1. **The wall is a contact sheet.** Reference: shadcn's *The Foundation for your
   Design System* — a light page with an eyebrow, a headline, a two-line
   subhead, two pills, then a dense masonry of component cards with hairline
   borders and a fade at the edges. Ours is a five-row bento of screenshots
   under a 64 px line that overlaps them.
2. **The blocks are not at the calculator's level.** Slang is a whole device
   with keys, legends and a display; the blocks are pale cards of text. The
   reference block named for this pass is `dashboard-01`: a sidebar, four KPI
   tiles, an area chart with a range control and a report table.
3. **The Omarchy scene is missing.** Plan 060's shot 7 (the desktop following
   the theme, wallpapers included) never made it into the 30 s film; only one
   tile and a one-second palette switch survive. It needs a scene of its own.
4. **The lines are weak.** "the components you know" / "every component you
   need" / "real apps, built with it" describe categories, not what the library
   does.

## v7.0 — `dashboard` block (the reference recreation)

New block at `examples/blocks/src/dashboard/`:

| File | What |
| ---- | ---- |
| `dashboard.tsx` | the screen: sidebar (brand, Quick Create, two nav groups, footer), four KPI cards, the visitors card (range toggle + area chart), the report card (tab strip + toolbars + table) |
| `data.ts` | three visitor datasets, four tabs, the report rows, the KPI tiles |
| `logic.ts` | `isRange`, `isTab` and the KPI's tide helper |
| `dashboard.test.tsx`? | no — a case in `src/blocks.test.tsx`, where every block is mounted |

Rules the block follows, copied from `stats`/`monitor`:

- `/** @jsxImportSource @gpuix/react */` at the top; relative imports end `.js`.
- Tokens only (`useTheme()`), no literals for colour, spacing or radius.
- The chart is `LineChart` — the area wash is its own; no hand-drawn plot.
- The sidebar is `Sidebar`/`SidebarMenu*`, not a hand-rolled column.
- The table is `Table` parts, not drawn rows.
- Every interactive control carries a `testId`; every state change is visible
  in text a test can read.
- `press-routing.test.tsx` gains the block; `package.json` gains `./dashboard`;
  `main.tsx` gains it; the film gains a take.

Measured acceptance: the block mounts in the test renderer, the range toggle
changes the chart's numbers, the tab strip changes the table, select-all
selects every row, and the press-routing suite passes with the new screen.

## v7.1 — the wall becomes the page

`media/launch/build.ts`, `grid` scene:

- Page: `#FAFAFA` ground, title block at the top (eyebrow 22 px letterspaced,
  headline 66 px, two-line subhead 28 px at 55 % ink, two pills 46 px).
- The wall: five columns × six rows of `340×230` cards, `16 px` gaps, radius
  `14`, hairline `#00000010` and the reference's soft underside shadow. The
  wall is wider than the frame and bleeds off both edges, like the reference.
- The grid keeps its opening move (the montage's last close-up cuts into the
  button card — same card, same place) and pulls back to the page. At full
  pull-back the title block is what the eye lands on; the cards run off the
  bottom under a fade.
- Every tile is a real take still. `dashboard` joins the wall as a 2×2.
- Acceptance: no overlap (pairwise box check), minimum gutter ≥ 16 px, the
  title block's text is legible at the hold frame, and the wall moves until the
  cut (0.1 s delta profile, as in v6.5).

## v7.2 — the Omarchy scene

New scene between the platform flip and the apps:

- Five themes, one still each: `tokyo-night`, `catppuccin`, `gruvbox`,
  `rose-pine`, `everforest`. Each is a real `TilingDesktop` take, recorded with
  that theme's own wallpaper — the same desktop, repainted by the palette file.
- Wallpapers: one signature background per theme from `basecamp/omarchy`'s
  bundle (`4-sunset-lake`, `2-waves`, `2-flower-basket`, `3-omarchy-plants`,
  `1-tree-tops`), stored at `media/launch/assets/wallpaper/omarchy-<theme>.webp`
  and credited in `SOURCES.md` and the README.
- Palettes: `examples/blocks/src/tiling/data.ts` gains `gruvbox` and
  `everforest` as their shipped `colors.toml`; `paletteNames` follows.
- The cut: one theme per 0.5 s beat, a 2 % push inside each, a glass tick per
  flip. Five flips = 2.5 s.
- Acceptance: five stills differ pairwise in mean pixel delta (each flip is
  visible), every flip is on a frame multiple of 15, and the line under the
  scene names the claim ("your theme, live").

## v7.3 — the lines

| Beat | Was | Now |
| ---- | --- | --- |
| montage | the components you know | no browser in sight |
| wall | every component you need | desktop ui that's actually native (title block) |
| blocks | compose them into blocks | compose them into real screens |
| platforms | one tree, every platform | one tree, every platform |
| desktops | on every desktop | (replaced by the Omarchy scene) |
| Omarchy | — | your theme, live |
| apps | real apps, built with it | apps, not mockups |
| terminal | even in your terminal, through ssh | the same app, over ssh |

The wall's line moves out of `LINES` and into its title block (eyebrow,
headline, subhead), so the scene has a page rather than a caption.

## STOP conditions

- A tile still is not a real take (`takes/<name>/`), or a block is drawn rather
  than imported where a component exists.
- The wall has an overlap or a gutter under 16 px.
- A palette or wallpaper is invented instead of read from Omarchy.
- Any audit regresses: `npx hyperframes check` errors, duration ≠ 30.000000 s,
  cuts off the 15-frame grid.

## Gates

```sh
nub run --filter @gpuixui/blocks test
nub run check && nub run lint
nub media/launch/build.ts
cd media/launch && npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
```

---

## What landed (v7.0–v7.3)

**v7.0 — the `dashboard` block.** `examples/blocks/src/dashboard/` (component,
data, logic) is shadcn's `dashboard-01` rebuilt from GPUIxUI parts: `Sidebar` and
its menu parts, four `Card` KPI tiles, `LineChart` behind a `ToggleGroup` range
control, and `Tabs` over `Table` with `Badge` status pills and `Checkbox`
selection. Measured in `blocks.test.tsx` (76/76 with the block): the range
control re-reads the chart's total (`18,412` → `1,598`), the tab strip swaps the
rows (`Cover page` → `Lumen observation deck`), and select-all moves the footer
from `0 of 14` to `3 of 14`. `press-routing.test.tsx` covers the screen; the
account avatar's painted disc needed `pointerEvents: "none"` so the row's press
still lands.

**Docs.** `/docs/blocks/dashboard` now mounts the native block
(`LiveBlock slug="dashboard"`, 1400×900) and copies its real source. The 916-line
hand-drawn reproduction (`components/docs/dashboard.tsx` and its `hourlyBars`
test) is deleted; `block-page.test.ts`, `block-preview.test.tsx` and the
`theme-css` case now assert the mounted block instead. Docs suite: **2257/2257**.

**v7.1 — the wall is a page.** `GROUND` is `#FAFAFA`; the grid scene is a title
block (eyebrow, 68 px headline, one-line claim, two pills) over a wall of **15
cards** in a 6×5 composition, `2120×1214`, radius 14, hairline `rgba(17,17,18,.07)`
over a soft underside shadow. Measured from the composition's own boxes:
**16 tiles' worth of coverage, zero overlaps, minimum gutter 16 px** (down from
10 px). The wall bleeds 100 px off each side and past the fold; the camera opens
on the button card at 2.1× and pulls back over 2.9 s.

**v7.2 — the Omarchy scene.** Five themes, five stills, each with Omarchy's own
wallpaper and `colors.toml`: Tokyo Night → Rosé Pine → Gruvbox → Catppuccin Latte
→ Everforest, one per 0.5 s beat. `tiling/data.ts` gained `gruvbox`,
`everforest` and `catppuccin-latte`; `TilingDesktop` gained `inset` (the band of
wallpaper around the tiles). At the five cuts the frame delta is
**92.3 / 81.3 / 83.3 / 77.2 / 76.3**, against **≤ 9** inside any still — every
flip is a cut, and no two neighbours are the same darkness.

**v7.3 — the lines.** `no browser in sight` · `every block is a real screen` ·
`one tree, every platform` · `your theme, live` (with `omarchy` under it) ·
`apps, not mockups` · `the same app, over ssh`. The wall's line moved into its
title block: `desktop ui that's actually native`.

**Audits on the final render.** `npx hyperframes check` 0 errors; duration
**30.000000 s**; **20/20** cuts on frame multiples of 15; **45/49** cues direct
at lag ≤ 25 ms, the four masked being one detent inside the accelerating slider
burst and three keys inside the two typing bursts (grouped reference: lag 0–3 ms,
corr 0.99–1.00). The Omarchy beat's whooshes were removed so the glass ticks
stand alone (they had been masking their own cue).
