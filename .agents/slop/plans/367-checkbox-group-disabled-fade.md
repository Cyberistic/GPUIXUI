# 367 — The checkbox group's disabled row: which element fades

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `065`, `332`, `355`, `356` |
| Status | done |

Self-contained: §0 the measured mismatch, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. The mismatch

`docs/checkbox-group.mdx` ends its disabled-state paragraph with:

> *"A disabled row adds half opacity and no wash."*

Measured in the element tree:

| Element | Painted style when disabled |
| ------- | --------------------------- |
| the row (`selectionRowStyle`) | `cursor: "not-allowed"`; **no `opacity`**; no `hover`/`active` |
| the box (`selectionBoxStyle`) | `opacity: 0.5`; neutral hover/active; no ring |

The "half opacity" exists — on the **box**, which is also the standalone
`Checkbox` painter. The row only drops its wash. Read literally, the page says
the row fades, and a reader looking at a disabled row sees a muted label at full
opacity beside a half-opacity box.

This is not a paint bug to fix by fading the row: the row contains the box, so a
`0.5` on each would multiply to `0.25` and the mark would nearly vanish, while
the standalone `Checkbox` (no row) must keep its own fade. The defect is the
page's subject.

## 1. The decision

**The box owns the fade; the row owns pointer feedback.** That is what the two
resolvers already do, what `Checkbox`'s own page says, and what the sibling
`RadioGroup` rows do. The checkbox-group page states it precisely, and a test
pins the split so a future "fade the row" change cannot silently double-fade the
mark.

## 2. The rule

The paragraph becomes:

> A disabled row paints **no** wash, and its box fades to half opacity with no
> pointer feedback; the row's label takes the muted tone. The fade belongs to the
> box because the same painter serves a standalone `Checkbox`, and fading the row
> as well would multiply the two.

No code changes. One assertion pair is added to the existing row-style case:
the disabled row has no `opacity`, the disabled box has `0.5`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/docs/checkbox-group.mdx` | the disabled paragraph states which element fades |
| `packages/primitives/src/core/selection.test.ts` | the row/box opacity assertion in the existing row case |
| `COMPONENTS.md` | the Checkboxes row records the clarification |
| `TODO.md` | tick the task |
| `.agents/slop/plans/README.md` | index this plan |

No source file changes.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/selection.test.ts` | the extended case passes |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 611 tests, then 612 with the new case) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

1. **`core/selection.test.ts` — the existing "a disabled row paints no pointer
   feedback" case gains the fade split** — `selectionRowStyle({ disabled: true,
   align: "center" }, theme).opacity` is `undefined`, and
   `selectionBoxStyle({ …, disabled: true }, theme).opacity` is `0.5`. Before:
   the page claimed the opposite (the runtime count does not change; the new
   assertions are the guard).

### 5.2 Two-direction proof

Add `opacity: 0.5` to `selectionRowStyle` temporarily: the new assertion fails
with `expected 0.5 to be undefined`. Remove the box's fade: the second fails.
Restore; green.

## 6. STOP conditions

1. The design intent is actually a faded row (a review decision, not a doc
   reading) — then this becomes a code plan with a deliberate `0.25` trade, not a
   doc fix. Stop and ask for the visual decision instead of choosing.
2. A gate fails for an unrelated reason — report it.

## 7. Outcome

The page now says the **box** fades and the row drops its wash, and the split is
pinned in `core/selection.test.ts`: a disabled row has no `opacity`, a disabled
box has `0.5`. No behaviour changed; offline **43 files / 612 tests** (611 + the
new case). Mutating `selectionRowStyle` to
`opacity: 0.5` fails the new assertion with `expected 0.5 to be undefined`.
`nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] The page's disabled paragraph names the element that fades.
- [x] The split is guarded in the existing row-style case.
- [x] No behaviour changed.
- [x] The three gates pass.
