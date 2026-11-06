# 069 — Launch film v8: the same film, joined up

The owner's review of v7.4 against `~/Documents/paper.mp4`:

| Note | Measured cause in v7.4 |
| ---- | ---- |
| "not engaging", "scenes should flow" | 20 cuts to a new centred window; nothing carries from one scene to the next |
| the grid has too few | 15 tiles, faded in; the landing page's grid shows more and better |
| the terminal is off-sync | `term-app`'s cursor plays over three stills recorded separately: dark flips while the pointer is on "Windows" |
| Linux doesn't look like Linux | the wallpaper is letterboxed (no `objectFit`), the desktop is a card on white, Settings is one more window |
| items dropping in are dull | a flat fade; the owner wants a tilted 3D screen they drop onto |
| charts are absent | the seventeen native charts landed on master after v7 |
| say it works with npm packages | no scene, and four of the packages named were never run in the runtime |

**Not a one-take.** The owner rejected the single-camera attempt (`agent/launch-film-v4`, plan 760: one Settings window under a whipping camera). v8 builds on v7.4, keeps its opening Switch press and its variety of scenes, and joins them with handoffs: an object on screen carries each scene into the next.

## Rules

- 30.000 s, 1920×1080, 30 fps, on the existing 120 BPM score (`assets/music/score.wav`, unchanged): its chord stabs land the packages, its last chord lands the mark.
- Paper's grammar: warm ground, one light lowercase line at a time, a big cursor whose press causes the next thing on that frame, windows that bleed off the frame. No scene change without an object or press carrying it.
- Every picture of the product is a real take through `apps/playground/src/film/take.ts`. A pointer and the state it changes come from **one take**, so they cannot drift.
- The tilted plane reverses SPEC's old "no tilted UI" ban at the owner's request.
- Mac-native first: Raycast and Obsidian are the references for feel; names and data stay Hunter × Hunter.

## Timeline

| s | Scene | Carried into the next by |
| ---- | ---- | ---- |
| 0–4 | `montage`: Switch, Tabs, Slider, Checkbox, one press a beat (kept from v7.4) | the Checkbox becomes the first tile on the plane |
| 4–8 | `wall`: a tilted screen; 60 real component tiles drop onto it in waves | ⌘K: the Launcher lands over the wall |
| 8–11 | `apps`: Launcher typed, Enter grows it into the new Vault; a wiki link is pressed | the window slides aside for the next |
| 11–13 | `dashboard`: a range press redraws the chart | the chart lifts off as the plane tilts back in |
| 13–16 | `charts`: all 17 chart types drop and draw on landing | Settings drops as the last tile and flattens |
| 16–19 | `desktops`: one Settings window; each Look press wipes the whole desktop from the pointer: macOS, Windows, GNOME | the window tiles into Hyprland |
| 19–21 | `omarchy`: full-bleed tiling desktop; palette flips | the camera pushes into the terminal pane |
| 21–24 | `terminal`: ssh, the command, the app paints; presses repaint on their own frames | the window pulls back as the packages arrive |
| 24–26 | `npm`: package tabs on the score's chord stabs | the tabs collapse into the mark |
| 26–30 | `end`: the mark, wordmark, URL, maker's line | — |

## Work

1. **Merge master** into `agent/launch-film`. Docs and `packages/data` take master's side; the film and the branch's blocks stay.
2. **`examples/blocks/src/vault/`** (new block; logic, data, view, test case, press routing, `package.json` export, `main.tsx`, docs page, `.agents/slop/COMPONENTS.md`): an Obsidian-shaped notes app. File tree, reading pane with `[[wiki links]]` that open notes, backlinks, and a graph whose focused node follows the open note.
3. **`launcher`**: Raycast's density. Tinted icon tiles, subtitle, group headers, a footer that names the highlighted action. API unchanged; existing tests stay green.
4. **`tiling`**: the wallpaper covers (`objectFit="cover"`), regression test first.
5. **Takes** (`apps/playground/src/film/`): `wall.tsx` renders every wall tile from the packages' example registries and the chart components; `take.ts` gains a virtual clock (charts animate on timers the synchronous loop never ran); `takes.tsx` gains `launcher-v8`, `vault`, `dashboard-v8`, `settings-v8`, `term-v8` (one continuous take).
   Found on the way: `TreemapChart`, `SunburstChart`, `SankeyChart`, `RadialBarChart` painted black with no `colors`; fixed in `structure.tsx`, guarded in `chart-structure.test.tsx`.
6. **Proof for the npm line** (`apps/playground/src/film/npm-proof.test.tsx`): each package named on screen runs in the real runtime, or its name comes off the screen. react-doctor is a CLI, so it is run over `examples/blocks` and the outcome recorded here.
7. **`media/launch/build.ts`**: rewritten around the table above. The cues live in the table so sound cannot drift from picture.
8. **Docs**: `media/launch/README.md`, `SPEC.md`, `REVIEW.md`, `.agents/slop/status.md`, `.agents/slop/TODO.md`, this plan's outcome.

## Acceptance

- `npx hyperframes check`: 0 errors. Duration 30.000000 s.
- Terminal: at every press, the frame the state changes is the press frame ±1, read from the take.
- Wall: at least 50 distinct tiles, each a real take; no two neighbours the same take.
- Linux frames: top bar, wallpaper to the edges, no letterbox (sampled from the render's corners).
- By eye: every scene boundary carries an object or a press; the first frames are still the Switch.

## STOP conditions

- A package named on screen has not run: remove the name, say so.
- A tile is drawn by the film instead of captured.
- `nub run check`, `nub run lint` or `nub run test` regress from the merge base without a cause recorded here.

## Gates

```sh
nub run --filter @gpuixui/blocks test
nub run check && nub run lint && nub run test
nub run --filter playground build && nub media/launch/build.ts
cd media/launch && npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
```

## Outcome

Rendered: 30.000 s, `hyperframes check` 0 errors, -17.7 LUFS, -1.0 dBFS.

- Wall: 83 distinct real tiles. Charts: 17 types, drawing on landing.
- Measured sync (pixel delta per frame): `term-v8`, `settings-v8`, `vault-v8` and `dashboard-v8` all repaint on press + 1, where their cues sit. v7.4 had no shared take between pointer and stills, and even inside a take the state lands on release, 100 ms after the press.
- npm proof: TanStack DB, TanStack AI and Better Auth pass under a real tree. Better Auth's `useSession` does not fetch without `window`; `getSession()` works. react-doctor scans `examples/blocks` (92 files), scoring it 48/100 with 109 issues; not triaged, and its DOM accessibility rules may not apply to native elements.
- The owner's "TanStack visualizer" is read as TanStack Virtual, the name in the repo README. To confirm.
- Found on the way: structural charts painted black with no `colors` (fixed, 4 tests fail without it).

## Round two: the owner's notes (2026-11-06)

38.000 s. Order: montage, shadcn, npm, wall, apps, charts, desktops, Omarchy, terminal, stack, end.

- Slider ticks read from the take; every whoosh removed; "vault" typed in full with keys.
- The wall opens flat on nothing rather than scaling a capture 8×, which was the blur. 60 curated tiles, all light, one swipe to dark.
- Native `Dashboard` rebuilt to the docs block. Charts have their own scene (three sliding rows).
- Chart source fixes, each guarded: real area gradients; rounder axis steps; long axes thin their labels; structural charts hold their box (a treemap lost its largest cell) and stop double-counting parents; RadialBar colours by category; radar grid and labels; funnel labels; a stroked sparkline no longer paints a wedge.
- New: `shadcnTheme` in `@gpuixui/tokens` reads a builder's CSS, so the theme claim is real.
- Terminal: the whole terminal but the tmux bar is the page; collapse, dark to light, toast. `Console` gained optional `dark`/`onDarkChange`.
- GNOME: Adwaita wallpaper and GNOME's own icons. oRPC replaces TanStack Form, proven in `npm-proof.test.tsx`.
- Capture rig: `capture` is async, zero-delay timers stay on the real loop, and only `performance.now` is virtual. Overriding `Date.now` swallowed sidebar and toast presses; the cause inside Effect was not traced, only bisected.
