# 616 — The preview strategy's open-scene claim names a scene a gesture opens

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 412, 455, 456, 494, 515, 522, 571, 578, 615

## 1. Why this plan exists

`docs/preview-strategy.md` is the maintainer contract for every preview tier. Its
tier‑L paragraph says:

> Some scenes mount in the state they document — a menu, a dialog, a popover or
> the command palette starts open — and 27 more are opened by a real gesture
> through the renderer's automation API …

The command palette is **not** one of the scenes that starts open. Plan 522 made
`command-palette` a gesture scene: `CommandPalette` mounts `open: false` behind a
`scene-palette-trigger` control, and `SCENE_GESTURE["command-palette"]` clicks the
trigger and then the `Duplicate project` command. A reader who trusts the
sentence expects an open palette and sees a button.

Plans 494, 515 and 523 made every *number* in this document derive from
`LIVE_SCENES`/`SCENE_GESTURE`, and the guard catches a wrong total. The
*examples* in that sentence were still authored from memory, so the one that
stopped being true shipped. The same sentence also says "Some scenes", which
hides the other half of the split the document can measure.

## 2. Current state (measured 2026-10-20, `64a65603`)

- `LIVE_SCENES` has **50** keys; `SCENE_GESTURE` has **27** entries, so **23**
  scenes mount in the state they document.
- `command-palette` is one of the 27: `apps/docs/preview/patterns/command-palette.tsx`
  initialises `useState(false)` and exposes `scene-palette-trigger`.
- `dialog`, `dropdown-menu` and `popover` mount open (`defaultOpen` in
  `preview/scene-views.tsx`), so those three examples are correct.
- `preview-gaps.test.ts` checks the 50/45/five split, the "27 more" count, the
  gesture total in both documents, and one row per gesture scene. It does not
  read the example list, and nothing derives the 23.
- No other document repeats the claim (`rg "starts open"` finds only this line in
  `docs/`, plus scene copy that is true for its own scene).

## 3. Files

### Change

| File | Change |
| ---- | ------ |
| `docs/preview-strategy.md` | replace the sentence with the derived 23 and the three true examples |
| `apps/docs/src/components/preview/preview-gaps.test.ts` | derive the mount-open count and forbid a gesture scene in the clause |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | one ticked docs-site task |

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/616-preview-strategy-open-claim.md` | this plan |

## 4. The edit

In the tier‑L paragraph, replace:

```text
`@gpuixui/primitives` and `@gpuixui/components`. Some scenes mount in the state
they document — a menu, a dialog, a popover or the command palette starts open —
and 27 more are opened by a real gesture through the renderer's automation API;
```

with:

```text
`@gpuixui/primitives` and `@gpuixui/components`. 23 scenes mount in the state
they document — an open menu, dialog or popover — and 27 more are opened by a
real gesture through the renderer's automation API;
```

No other prose changes. The number is the one the guard derives; do not write it
anywhere else.

## 5. The guard

Add one test to the `preview counts` suite in
`apps/docs/src/components/preview/preview-gaps.test.ts`:

1. Extract the clause with
   `/^(\d+) scenes mount in the state[\s\S]*?more are opened by a real gesture/m`
   and fail when it is empty.
2. Assert the stated count equals `LIVE_SCENES.length - gestureCount`.
3. Build the gesture-scene titles exactly as the existing suite does — the
   registry titles of `liveRecordScenes` with a `SCENE_GESTURE` entry, plus the
   `SCENE_LABEL` titles of composed scenes with one — and assert none appears in
   the clause, case-insensitively.

Step 3 is the regression: `Command palette` is a composed gesture scene, so the
pre-fix sentence fails by name. Step 2 is the completeness half: "Some" and a
wrong 23 both fail.

Use the existing `Arr`/`Result` helpers and the suite's `countIn`; do not add a
dependency or a second copy of the scene tables.

## 6. Commands and expected results

```sh
cd apps/docs
nub run test -- src/components/preview/preview-gaps.test.ts
# pre-fix: 1 failing test, naming `Command palette` and `NaN`/23
# post-fix: all preview-gaps tests pass
nub run --filter docs test
# 125 files / 1210 tests pass (1209 + this one)
nub run check-types
# exit 0
```

From the repository root:

```sh
nub run check    # exit 0
nub run lint     # exit 0
```

Do not run a browser smoke for this change: it edits no rendered code and adds no
scene. The affected check is the preview-gaps suite.

## 7. Two-direction proof (must be recorded here before commit)

Measured 2026-10-20, `64a65603` + this change:

- **Fail without the fix:** the original sentence has no digit, so the new test
  failed on `expected '' not to be ''` (the clause could not be read at all).
  With the count written but the false example kept
  (`23 scenes mount … an open menu, dialog, popover or the command palette starts
  open`), the test failed with
  `expected [ 'command palette' ] to deeply equal []`.
- **Fail on a wrong count:** with `22 scenes mount …`, the test failed with
  `expected 22 to be 23`.
- **Pass with the fix:** `nub run test -- src/components/preview/preview-gaps.test.ts`
  — 125 files / 1 210 tests pass. The regex was made whitespace-tolerant
  (`by\s+a\s+real gesture`) because the rewrap moved `real gesture` to the next
  line; the first attempt measured `NaN` for the count, which is why the
  pre-existing total guard moved with it.

## 8. STOP conditions

- Stop if `preview/scene-contract.ts` no longer exports `SCENE_GESTURE` or
  `SCENE_LABEL`, or if the clause regex cannot be made to match the paragraph
  without changing other prose.
- Stop if the mount-open count is not `LIVE_SCENES.length - gestureCount` for a
  reason other than a scene appearing in both tables; report the overlap.
- Do not add a new scene, change a gesture, or reword any other sentence.

## 9. Acceptance

- The strategy names three scenes that really mount open and no gesture scene.
- The 23/27 split is stated and derived.
- The new test fails on the old sentence and on a wrong 23, passes on the fix.
- `nub run --filter docs test`, `nub run check-types`, `nub run check` and
  `nub run lint` pass.
- `TODO.md` records the task; this plan is indexed.
