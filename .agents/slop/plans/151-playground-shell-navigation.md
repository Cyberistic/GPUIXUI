# Plan 151 — the playground shell navigates: a scrollable scenario list

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B (continues the native smoke suite). **Depends on:** plans `120`
(the shell) and `140` (the binding that lets the suite run here).

## 1. Why this plan exists

The registry **is** the sidebar (`apps/playground/src/app.tsx`): a scenario the
sidebar cannot reach is a scenario the app cannot open. When the registry grew
to 15 entries (nine core capabilities, four probes, the window-key probe and the
theme gallery), the sidebar became taller than the 720px dev window and it had
**no scroll container**. Every entry below the fold was painted outside the
window, so half the playground was unreachable by hand — the exact class of
regression a component library cannot afford to leave to visual inspection.

The suite would not catch it either: no existing scenario mounts the shell
itself. It is a **layout** bug in our own app, and the honest way to guard it is
a scenario that drives the real `App` and asserts the list scrolls.

## 2. What is built

1. **The sidebar list becomes a scroll container** (`overflowY: "scroll"`,
   `minHeight: 0`, `flexGrow: 1`; each row `flexShrink: 0`). `minHeight: 0` is
   required: a flex child defaults to `min-height: auto` and refuses to shrink
   below its content, so the list would grow past the window instead of
   scrolling.
2. **`App` takes the scenario list as a prop.** The scenario has to mount the
   real shell; hard-coding the module import would make it untestable and would
   hide the registry seam. `main.tsx` passes the real registry; the scenario
   passes the same registry, so the check exercises production navigation.
3. **A `shell-navigation` scenario** (capability `layout`) that:
   - finds the last registry entry's bounds **before** any gesture;
   - asserts the list's scroll offset starts at `0`;
   - sends a wheel down (`deltaY = -600`; GPUix is negative-to-scroll-down,
     measured in plan `140` §4) and advances the frame;
   - asserts the offset became negative, the last entry moved **up**, and the
     entry is now **inside** the list's painted bounds.
   A list without a scroller fails the first assertion (`offset.y` is `0` or
   unreadable) and the last assertion (the entry stays outside), so the guard
   cannot pass vacuously.

## 3. Exact files

### 3.1 `apps/playground/src/app.tsx` (change)

- `Shell` takes `list: ReadonlyArray<PlaygroundScenario>`; `head`/`findFirst`
  read `list` instead of the module-level `scenarios`.
- Wrap the rows in `<div testId="shell-nav-list" …>` with `display: flex`,
  `flexDirection: "column"`, `gap: 4`, `flexGrow: 1`, `minHeight: 0`,
  `overflowY: "scroll"`.
- Row style adds `flexShrink: 0`; the row keeps `testId={`nav-${id}`}`.
- `App` takes `{ list }` and forwards it. Keep the module free of the registry
  import: the caller owns the list.

### 3.2 `apps/playground/src/main.tsx` (change)

`render(<App list={scenarios} />, …)` — the dev window uses the real registry.

### 3.3 `apps/playground/src/scenarios/shell.tsx` (new)

The scenario and its steps as described in §2.3. `view: () => <App list={scenarios} />`.
The smoke runner already wraps the mounted view in `ThemeProvider`; `App` has
its own provider, which is intentional (it is what a consumer sees) and the
inner provider wins.

### 3.4 `apps/playground/src/scenarios/index.ts` (change)

Import and append `shellNavigationScenario` to `scenarios`. It covers an
already-required capability (`layout`), so `CORE_CAPABILITIES` is unchanged.

### 3.5 Documentation and ledgers (change)

- `apps/playground/README.md`: structure line for `scenarios/shell.tsx`, the
  scenario count, and a note that the shell itself is now driven by the suite.
- `COMPONENTS.md`: the capability table's `layout` row lists both scenarios;
  the "What the suite settled" paragraph gains the flex `minHeight: 0` fact.
- `TODO.md`: tick the item under the playground workstream and update the
  progress bar.
- `.agents/slop/plans/README.md`: index this plan and its status.

## 4. Commands, and what each must produce

Run from the worktree root.

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js` | `15/15 scenarios passed`, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only shell-navigation --json` | every check `passed`, `layout=verified` |
| `nub run --filter playground test` | the app's vitest suite green (`scenarioProblems` still accepts the registry) |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof (AGENTS §3).** Temporarily delete `overflowY: "scroll"`
from `shell-nav-list`, rebuild, run `--only shell-navigation`: it must fail
naming the scroll check and exit `1`. Restore it: green again.

## 5. STOP conditions

Stop and report with evidence if:

- **The wheel does not scroll a nested flex list even with `overflowY`.** The
  standalone `scroll-container` scenario proves wheel scrolling works; if a
  list inside the shell cannot scroll, record the measured bounds/offset in
  plan `140` §4 and stop — do not add a workaround that scrolls a different
  element.
- **The last entry cannot be brought fully inside the list's bounds** with one
  wheel gesture. Do not weaken the assertion to "moved up": either send the
  wheel until the clamp (and document the gesture) or record the runtime's
  bounds arithmetic as a limitation.
- **Mounting the real `App` needs a change outside this workstream.** Record it
  in `TODO.md`; do not edit another package.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `shell-navigation` steps | native smoke | a sidebar that is not a scroll container, a wheel that does not move it, a row that stays outside the list |
| `scenarioProblems` integrity | unit (exists) | a registry that lost or duplicated an id/capability after the change |
| `panel-resize` etc. | native smoke (exists) | a shell change that breaks another scenario's layout |

The two-direction proof in §4 is the failure proof; the full-suite run is the
regression proof.

## 7. Acceptance criteria

- The real `App` mounts with an injected list and the sidebar scrolls with the
  wheel.
- `shell-navigation` is registered, green, and its steps fail without
  `overflowY` (proved and recorded).
- The suite is **15/15 green on this host**, exit `0`.
- `nub run check`, `nub run lint`, `nub run test` pass.
- README, `COMPONENTS.md`, `TODO.md` and the plan index match what ran.

## 8. Outcome (executed on this host, 2026-10-17)

**15/15 green**, exit `0`; `layout=verified`. `shell-navigation` records nine
checks: the registry's last entry is found, the list and last row are painted,
the list starts at offset `0`, the wheel produces a negative offset, the last
row moves up, and it ends inside the list's bounds.

Two-direction proof:

1. Deleting `overflowY: "scroll"` from `shell-nav-list`, rebuilding and running
   `--only shell-navigation` printed
   `the list starts at the top: expected 0, got -1`, `layout=failed`, exit `1`.
   Restored: green again, exit `0`.
2. The full suite before and after the change is `15/15`, so mounting the real
   `App` did not disturb any other scenario.

Deviations from this plan, and why:

- The guard fails at the **first** scroll assertion, not the final bounds
  assertion: a non-scroll container reports no offset at all (`null` → the
  readout's `-1` sentinel), which is a stronger and earlier signal. The bounds
  assertion still runs in the green path, so "moved but not reachable" would
  also fail.
- `App` keeps its own `ThemeProvider` instead of taking one from the runner:
  that is how a consumer mounts it, and the inner provider deterministically
  wins over the runner's outer dark provider.

