# 182 — The playground shell selects, repaints and answers keys

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | B (playground polish) |
| Owner | playground workstream (`apps/playground`) |
| Depends on | `120`, `140`, `150`, `151`, `170` |
| Closes | the unproven half of `COMPONENTS.md` → Native theme gallery / `shell-navigation`: selecting an entry and switching the palette |

## 1. Question

The shell **is** the playground: the sidebar is the scenario registry, and the
stage renders the selected scenario's view. `shell-navigation` proves the list
scrolls, but not that:

1. clicking an entry **switches the stage** to that scenario's real view;
2. the selected entry paints its active state and the others do not;
3. the palette switch repaints the shell through the real `ThemeProvider` path
   and **keeps the selection**;
4. a nav entry is operable from the keyboard.

(4) is a real defect today: the entries are `role="button"` with a click handler
and no key handler, so a keyboard user can focus one and nothing happens.

## 2. Design

Edit `apps/playground/src/app.tsx`:

- root shell div gains `testId="app-shell"`;
- the stage header gains `testId="stage-title"` (the `<Body>` already renders the
  current scenario's title);
- both the nav entries and the palette buttons get
  `onKeyDown`/`onKeyUp` handlers built on `decideActivation` from
  `@gpuixui/primitives` (Enter on key down, Space on key up, a repeat ignored) —
  the same contract the shipped `Button` has, not a second copy of it.

No new local state: `selected` and `palette` already live in `Shell`/`App`.

New scenario `shell-selection`, capability `layout`, in
`apps/playground/src/scenarios/shell.tsx` (beside `shell-navigation`, same
capability, no new report row). It mounts the real `App` with the real registry.

### Assertions

| # | Check |
| - | ----- |
| 1 | the app paints `app-shell`, and the stage title is the first scenario's title |
| 2 | clicking `nav-text-native` sets the stage title to that scenario's title and paints its own view (`text-plain` = `hello gpuix`) |
| 3 | the selected entry paints `colors.accent` and the first entry paints `colors.background` |
| 4 | `keyDown("nav-input-edit", "enter")` switches the stage to `input-edit` (its `input-field` paints) |
| 5 | `keyDown` + `keyUp("nav-text-native", "space")` switches back (Space activates on **up**) |
| 6 | `keyDown("nav-input-edit", "space")` **without** the up does not switch (the contract, not an accident) |
| 7 | clicking `theme-mode-light` repaints `app-shell` with `palettes.light.colors.background` and keeps the stage title |
| 8 | the stage's own view still paints after the palette switch (the provider re-render does not remount it away) |

## 3. Files

```
apps/playground/src/app.tsx                 EDIT  test ids + keyboard activation
apps/playground/src/scenarios/shell.tsx     EDIT  add `shellSelectionScenario`
apps/playground/src/scenarios/index.ts      EDIT  import + registry
apps/playground/README.md                   EDIT  shell section: selection, keyboard, palette
COMPONENTS.md                               EDIT  Native theme gallery row: the shell path
TODO.md                                     EDIT  tick the task
.agents/slop/plans/README.md                EDIT  index this plan
.agents/slop/plans/182-shell-selection.md   EDIT  §7 measured result
```

## 4. Commands and expected results

```sh
nub run --filter playground build
# -> tsc exits 0

nub apps/playground/dist/smoke/run.js --only shell-selection
# -> "1/1 scenarios passed", layout=verified, exit 0

nub apps/playground/dist/smoke/run.js
# -> 50/50 scenarios passed, exit 0

nub run check && nub run lint && nub run test
```

## 5. Two directions

- Remove the nav `onClick` → check 2 fails.
- Remove the nav `onKeyDown` → check 4 fails; remove `onKeyUp` → check 5 fails.
- Change the selected-entry colour to `muted` → check 3 fails.
- Point the palette switch at `palettes.dark` → check 7 fails.
- Remove `minHeight: 0` from the nav list → `shell-navigation` fails (the
  existing guard), proving the two scenarios cover different regressions.

## 6. STOP conditions

- A synthetic `keyDown` on a nav entry does not focus it (`nativeSimulateKeyDown`
  documents focus-first) → use a click to focus, then `keyDown`; if that still
  does not deliver, record it and keep the click checks only.
- The selected-entry background cannot be read from `paintedStyle` → assert the
  palette switch and the stage only, and record the gap.
- The stage view does not unmount on selection (both paint) → that is a real
  bug in the shell: stop, fix `App`, and only then encode the check.

## 7. Measured result

Run 2026-10-17 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | pass |
| `--only shell-selection` | 1/1, **17 checks**, `layout=verified`, exit `0` |
| full suite | **50/50**, exit `0` (after the harness fix below) |
| `nub run check`, `nub run lint`, `nub run test` | pass |

What the probe established:

- **Selection.** Clicking `nav-text-native` switches the stage to that
  scenario's real view (`text-plain` = `hello gpuix`); the selected entry paints
  `colors.accent` and the first entry paints `colors.background`.
- **Keyboard.** `keyDown(enter)` on `nav-input-edit` switches the stage (Enter
  activates on key **down**); `keyDown(space)` alone does **not** switch;
  `keyUp(space)` does. The nav now uses the shipped `Button`'s
  `decideActivation`, not a second copy of the rule.
- **Palette.** Clicking `theme-mode-light` repaints `app-shell` from `#11141A`
  to `#F6F8FA` (the shipped light theme), keeps the selected scenario, and its
  view stays mounted across the provider re-render.
- **A harness bug this exposed.** In a full run the click check failed while
  `--only shell-selection` passed: `shell-navigation` runs immediately before and
  also renders `<App>`, so React reconciled the second mount against the first
  and **kept the sidebar's native scroll offset** — `nav-text-native` was
  clipped out of view and the click landed elsewhere. The runner now wraps every
  scenario in a `Fragment` keyed by scenario id, so each run is a fresh mount.
  This is the same lesson `workspace-restore` recorded: a keyed remount is a
  real restart. Before the fix the full suite exited `1` at
  `clicking an entry switches the stage`; after it, 50/50.

Two-direction proofs (mutation → the named check failed at exit `1` → file
restored):

| Mutation | Failing check |
| -------- | ------------- |
| remove the nav `onKeyUp` | `Space on key up switches the stage: expected "Native text…", got "Input editing…"` |
| remove the nav `onKeyDown` | `Enter on key down switches the stage: expected "Input editing…", got "Native text…"` |
| hard-code the palette switch to `dark` | `the palette switch repaints the shell: expected "#F6F8FA", got "#11141A"` |
| paint the selected entry `muted` | `the selected entry paints the accent surface: expected "#2E2370", got "#222730"` |

