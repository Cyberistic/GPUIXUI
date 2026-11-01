# launch-film handoff (2026-11-01)

The state of the launch-film workstream (branch `agent/launch-film`,
worktree `workspaces/launch-film`) for a session that resumes it. Plan:
`.agents/slop/plans/064-launch-film-v2.md` (the v3 section is current).

## Owner rules learned this session

- Never add `Co-Authored-By: Claude …` to commits (memory `no-coauthor-trailer`).
- Hunter × Hunter names everywhere (memory `hunter-theme`).
- Logo: the two-colour Gon (`apps/docs/public/logo.svg`) is the favicon and social
  image; the one-colour outline (`logo-outline.svg`) is the interface and film mark.
- Music: the original piano score only (`media/launch/sound/piano.ts`). The
  "Departure!" YouTube upload and freetouse.com tracks are not licensed for this.

## Landed on master

The desktop block (XP and Aero), the blocks hoist (`@gpuixui/blocks`), the Gon
mark and outline mark, the landing's "Made with ☕ by @sudo_kw", the repo cleanup
(ledgers in `.agents/slop/`), the stats block, SettingsApp, `--terminal` in
`examples/blocks/src/main.tsx`, and film v2 (42 s).

## v3 film in progress (owner brief: 20–30 s, lower sound, faster)

Done on the branch, not yet merged:
- The score re-cut at 120 BPM: 14 bars, 31 s with the tail; the beat is 15 frames
  and the bar 60. `sh media/launch/sound/score.sh <sf2>`; the SF2 was downloaded
  to the session scratchpad (Salamander V3, freepats.zenvoid.org).
- Eight close-up takes, each one beat with a press on frame 5: `cu-switch`,
  `cu-checkbox`, `cu-slider`, `cu-tabs`, `cu-toggle`, `cu-button`, `cu-radio` and
  `cu-input`. All verified.
- Settings retimed to Windows, Linux and Dark mode on beats 1–3; Omarchy to a
  theme per beat; the agent typing a character per frame and sending on frame 45.

Still to do, owner notes of 2026-11-01:
1. Drop "the flip thing". Read as the 90° rotate shot; if the owner meant
   something else, ask.
2. More terminal: a sidebar collapsing and toasts arriving, working smoothly in a
   terminal, under the line "can you believe this is in a terminal through ssh?".
   Only say "ssh" if the take really runs over ssh, e.g.
   `ssh localhost 'cd …/examples/blocks && nub run dev <block> --terminal'`;
   check that Remote Login is enabled first.
3. Captions are prose about building GPU-powered apps, with no "feel every
   press" lines.
4. Mix: score around 0.55, tactile cues at 0.5×.
5. Regenerate the composition with a v3 generator (adapt
   `scratchpad/gen_v2.py`), check, snapshot-review, render, then update
   README/REVIEW and merge.

## Also queued

The calculator: `agent/calculator` (worktree `workspaces/calculator`) holds the
work found uncommitted in the shared checkout, committed unchanged. The owner
wants the UI to mimic the original Casio fx-991ES layout (red shift text,
familiar key grid), with a collapsible history panel.

## Tools and gotchas

- `apps/playground/src/film/take.ts` resolves each aim once, delivers layout
  events every frame, and steps the clock; takes live in `takes.tsx`.
- `terminal-take.ts` runs the exact command in a pty and decodes the kitty
  frames; the repaint arrives about 0.8 s after the click.
- A press stops at the first painted element; GPUix has no `zIndex` (draw
  overlays last).
- `nub run X -- arg` passes `--` through; `main.tsx` and `capture.tsx` now skip it.
- Guard `rm -rf` on variables as `"${T:?}/${t:?}"`.
