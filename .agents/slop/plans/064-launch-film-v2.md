# 064 — Launch film v2: faster, wider, scored

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Depends on | `060` (take runner, tactile kit), `062` (desktop block), `728`/`729` (pipeline + Mac-app blocks, `native-mac`) |
| Status | in progress |

## The owner's brief (2026-10-31)

"Up the pacing by a lot and add more shots of different blocks … all the names are
Hunter × Hunter themed … the logo the same as the favicon [now: its one-colour
outline] … one of those tiled 3D pan shots … graphs, UI chat, mac native apps …
one of those shots where the screen rotates 90 degrees before clicking a button …
the XP / Aero desktop … we don't even need to say its name … compose an original
piano piece."

## Clock

The score (`media/launch/sound/piano.ts`, original, Salamander Grand Piano CC BY 3.0)
is the clock: 104 BPM, beat 0.577 s, bar 2.308 s, 18 bars = 41.54 s.

| Bars | Time (s) | Score | Film |
| ---- | -------- | ----- | ---- |
| 0–1 | 0.00–4.62 | intro taps (beats 1 and 3) | macro Switch press on the second tap, macro Slider detents on beats |
| 2–5 | 4.62–13.85 | theme | Button → Settings pull-back (bar 2); macOS → Windows → Linux, one look per bar (3–5) |
| 6–9 | 13.85–23.08 | lift | terminal (6); XP-era desktop, Start opens (7); Aero-era desktop (8); Omarchy, one theme per beat (9) |
| 10–13 | 23.08–32.31 | climax | 3D tiled wall of blocks panning (10–11); the 90° rotate, then a press (12); agent chat sends + stats charts (13) |
| 14–15 | 32.31–36.92 | rising close | GPUI · React · shadcn · Tailwind, one word per beat; "= GPUIxUI" |
| 16–17 | 36.92–41.54 | held chord | the outline mark pressed on the downbeat, wordmark, URL, "Made with ☕ by @sudo_kw" |

Cuts land on downbeats; inside the climax, on beats. Captions are one short line per
section, never over UI.

## New takes (all real blocks under real input, `apps/playground/src/film/takes.tsx`)

`pipeline`, `agent` (type, Send), `launcher` (type a query), `calendar`, `notes`,
`viewer`, `welcome`, `stats` (new block, below), `desktop-luna`, `desktop-aero`,
plus v1's macro, settings, terminal and omarchy takes retimed to bars.

## New block: `stats`

`examples/blocks/src/stats/`: Heavens Arena fight statistics, with `BarChart` (wins by
floor), `LineChart` (aura output across the week), `DonutChart` (Nen types) and
`Sparkline` tiles. A Week | Month control swaps the data set. It's behaviour-tested.

## Composition (`media/launch`)

- `wall` scene: 12 block stills/clips on a CSS 3D plane (`perspective`, `rotateX` and
  `rotateY`), the camera panning across in one move. This is the owner's request,
  overriding the skill's "no tilted 3D UI" default for this one beat.
- `rotate` scene: a block window rotates 90° (0.5 s, `power3.inOut`), holds, then the
  cursor presses its primary button and the take shows the real response.
- The tactile kit stays on every press, ducked to sit under the score.

## STOP

- A shot needs a UI state a block cannot reach through real input: report it, never
  draw the state.
- The score's structure changes: retime from the bar table, never by ear.

## Done

`npx hyperframes check` clean, REVIEW.md, `gpuixui-launch.mp4` rendered;
`nub run check`, `nub run lint` and `nub run test` all green.

## v3 (owner, 2026-11-01): under 30 seconds

"Lower the sound, up the pace, way more interactions in the first few seconds with
different components, keep the whole thing under 30 seconds … focus on prose for
building GPU powered apps … a 20–30 second quick video showcasing everything, with
the haptic sounds."

The score is re-cut at 120 BPM: a beat is 15 frames, a bar 60, 14 bars (≈27 s). The
same melody, with no quiet intro.

| Bars | Time (s) | Film | Line |
| ---- | -------- | ---- | ---- |
| 0–1 | 0–4 | eight components, one press per beat: Switch, Checkbox, Slider, Tabs, ToggleGroup, Button, RadioGroup, Input | native apps, drawn by the GPU |
| 2 | 4–6 | Settings: macOS → Windows → Linux, a press per beat | one tree, every platform |
| 3 | 6–8 | the terminal: the real command, Dark mode on beat 3 | even in your terminal |
| 4 | 8–10 | XP-era desktop (1 s), Aero-era desktop (1 s) | — |
| 5 | 10–12 | Omarchy, a theme per beat | follows your desktop theme |
| 6–7 | 12–16 | the tilted wall of blocks | React components, rendered by GPUI |
| 8 | 16–18 | stats turned a quarter, Month pressed | — |
| 9 | 18–20 | the agent chat, typed and sent | ship AI apps natively |
| 10 | 20–22 | GPUI · React · shadcn · Tailwind, a word per beat | — |
| 11–13 | 22–27 | outline mark pressed, wordmark, URL, maker's line | gpuixui.sudokw.com |

Mix: score at 0.55, tactile cues at 0.5×, target about −19 LUFS.
