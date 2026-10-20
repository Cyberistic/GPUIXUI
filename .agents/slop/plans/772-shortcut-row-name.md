# 772 — A shortcut row is named by its label and its chord

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 117, 200, 310, 333, 335, 391, 516, 626, 630, 694, 724 |
| Status | done — measured 2026-10-20: at `HEAD` all four new native cases fail (every listitem name reads `""`), and with the change `keyboard-shortcuts.test.tsx` is 14/14; unit 500 in 47 files; full native suite **974 passed / 20 failed of 994** — exactly this turn's baseline of 970/20 of 990 plus the four new passes, the same 20 recorded plan-540 classes; `check`/`lint`/`test` exit 0 |
| Claimed number | `772` — the first free number across every worktree at claim time (`770` is this workstream's, `771` is the playground's; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

Every row of a shortcut cheat sheet is a `role="listitem"` with **no accessible
name**. The label and the chord are three unrelated `label` nodes beside it, so
the association between "Save" and `⌘ S` is positional only: a screen-reader user
hears an unnamed list item, then three loose strings.

Measured 2026-10-20 in the real `TestRenderer` (scratch probe
`src/behaviour/zz-probe.test.tsx`, `platform="darwin"`):

```
KeyboardShortcut rows   [["heading","Editing"],["listitem",""],["listitem",""]]
TimelineItem row        [["listitem","Deployed"]]
StepperStep row         [["listitem","Account"]]
```

The two status rows already carry their label (`aria-label`, plan 626); the
shortcut row does not, although `KeyboardShortcut` takes `label` and knows the
formatted chord. `COMPONENTS.md` calls the component `done` and
`docs/keyboard-shortcuts.mdx` says a screen reader reads the glyphs, which is
true but not enough: the row it reads them in has no name.

Why the value child does not name the row: GPUix 0.10.0 reports a `<text>` node's
string as `aria.value`, but does not lift a `div`'s contents into its accessible
name (measured for menu rows in plan 387 and across every example in plan 391).
A heading whose own node *is* the text is named (`EmptyState`, plan 726); a
`listitem` wrapper is not. So the part supplies the name itself, exactly as
`StepperStep`, `TimelineItem` and the menu rows do.

## 2. The rule

**A shortcut row is named `<label>, <chord>`; a caller's `aria-label` wins.**

- The chord is the *formatted* keys the row paints (`formatAccelerator`, so
  `mod+s` on macOS is `⌘ S` and on Windows `Ctrl S`), joined with one space —
  never the raw accelerator string.
- The label and the chord are joined by `", "`: `"Save, ⌘ S"`.
- An empty (or whitespace-only) accelerator contributes nothing: the name is the
  label alone (`"Rename"`), not `"Rename, "`.
- A caller `aria-label` is trimmed, wins over the composed name and stays the
  only name the row carries; a whitespace-only one falls back to the composed
  name (the shared "authored label wins, trimmed" rule of `internal/name.ts`).
- A row whose label is whitespace and which has no chord therefore has no name —
  unchanged from today, and the caller can still name it.

Implementation: one pure helper in `internal/name.ts` (`composedName`) beside
`controlName`, so the "caller wins, trimmed, never empty" rule stays in one
module, and the row applies it.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/name.ts` | Add `composedName(authored, parts): Option<string>` — the caller's cleaned `aria-label`, else the trimmed non-empty parts joined by `", "` |
| `packages/components/src/keyboard-shortcuts.tsx` | `KeyboardShortcut` destructures `aria-label`, builds the name from `label` and the formatted `keys`, and sets it on the `role="listitem"` element; the module comment records the measured reason |
| `packages/components/src/behaviour/keyboard-shortcuts.test.tsx` | 4 native cases (10 → 14), the header's bug list |
| `packages/components/docs/keyboard-shortcuts.mdx` | The accessibility section states the row naming rule and why; the API table's `KeyboardShortcut` row mentions the name; the verification count 10 → 14 |
| `COMPONENTS.md` | The Keyboard shortcuts row: the naming rule and the count |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `772` to the D30 overflow list |
| `TODO.md` | Tick a hardening line under the Tier 2 hardening list |

No public prop changes (`aria-label` is already a host prop), no dependency, no
other package. `examples/keyboard-shortcuts.example.tsx` already renders several
rows, so the example exercises the name without an edit.

## 4. Test plan

### Native (`src/behaviour/keyboard-shortcuts.test.tsx`)

Each case states the bug it guards:

1. **"names each row by its label and its chord"** — the existing `Sheet` fixture
   (all rows `platform="win32"`): `nodesWithRole(renderer, "listitem")` names are
   `["New file, Ctrl N", "Save, Ctrl Shift S", "Go to line, Ctrl G"]`.
   **Fails at `HEAD`** (three empty names).
2. **"names a row with no chord by its label"** — `accelerator=""`:
   the row is named `"Rename"` and carries no trailing separator. **Fails at
   `HEAD`.**
3. **"names a row with the glyphs it paints"** — `accelerator="mod++"`,
   `platform="darwin"`: name `"Zoom in, ⌘ +"`. This pins the name to the
   *formatted* keys, not the raw accelerator (`mod++` would be wrong) and covers
   plan 694's literal-plus chord. **Fails at `HEAD`.**
4. **"lets the caller name a row"** — `aria-label="Save the document"`: the name
   is exactly that (the chord does not leak in), and a whitespace-only
   `aria-label="  "` falls back to the composed name. **Fails at `HEAD`** on the
   blank-label row (`""` instead of `"Undo, ⌘ Z"`), so the caller's precedence
   and the blank-label fallback are both guarded.

The existing ten cases are the pins: the list, group and heading names, the
declaration order, the keycap surface, the state callback and the both-theme
labels are unchanged.

### Commands and expected results

```sh
# 1. Prove the new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/keyboard-shortcuts.test.tsx
# EXPECT: 10 pass, the 4 new cases fail (names read ""), measured 2026-10-20.

# 2. After the fix
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/keyboard-shortcuts.test.tsx
# EXPECT: 14 passed.

# 3. Pure suite (inventory counts, docs test-count check)
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0, 500 tests in 47 files (495 + 5 naming cases).

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 974 passed / 20 failed of 994 — this turn's baseline is 970 passed /
# 20 failed of 990 (measured 2026-10-20) plus the 4 new passes, the same 20
# recorded plan-540 classes. Measured: 974/20 of 994, the same 20 classes.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Delete `src/behaviour/zz-probe.test.tsx` before the first commit.

## 5. STOP conditions

- Any of the four new cases passes at `HEAD`. Stop and re-measure.
- The row's name is built from `accelerator` rather than the formatted keys.
  Stop: the name must read exactly what the row paints.
- A caller `aria-label` stops reaching the row after the destructuring. Stop and
  fix the precedence; the caller always wins.
- Any existing keyboard-shortcuts case changes, or a full-suite failure appears
  outside the recorded plan-540 classes. Stop and record it.
- `772` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- Every shortcut row carries an accessible name composed from its label and the
  chord it paints, and a caller's `aria-label` wins.
- The four new naming cases fail on the old source and pass after; the existing
  ten cases stay green.- `docs/keyboard-shortcuts.mdx`, `COMPONENTS.md` and the inventory agree with the
  suite's count; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
