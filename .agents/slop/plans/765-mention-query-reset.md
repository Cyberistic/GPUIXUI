# 765 — A narrower mention query restarts the highlight at its first match

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 319, 399, 759 |
| Status | done — measured 2026-10-20: after `@a`, two `ArrowDown`s (row `joan` highlighted) and then typing `n` (query `an`, still three matches) row `joan` stayed highlighted, so `Enter` inserted the stale candidate, because `src/mention-input.tsx` reset the highlight only when the list opened or closed. The reset key now carries the query text; 1 native case (Mention input 21 → 22) red at `HEAD` and green after (21/22, the remaining failure the recorded plan-540 caller-focus case); unit 495 in 47 files, full native suite **962 passed / 20 failed of 982** with exactly the baseline's 20 recorded plan-540 classes; `check`/`lint`/`test` all exit 0 |
| Claimed number | `765` — the first free number across every worktree at claim time (`763` is this branch's malformed hover delay, `764` is the playground's editing-actions plan; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

`MentionInput` keeps the arrow-key cursor in `highlighted` (an index into the
visible rows). The effect that resets it is keyed on `openKey`, which is only
`"open"` or `"closed"`:

```ts
const openKey = Option.isSome(open) ? "open" : "closed";
// A new query starts at its first candidate.
useLayoutEffect(() => {
  setHighlighted(0);
}, [openKey]);
```

The comment states the rule; the dependency cannot express it. While the list
stays open and the query changes — the normal case, every extra character typed
into an open `@` token — `openKey` is still `"open"`, so the effect never runs
and the stale index survives into the narrower candidate set.

Measured 2026-10-20 in the real `TestRenderer` with the package harness (`ana`,
`anna`, `joan`):

```
# type "@a", ArrowDown, ArrowDown, then type "n" (query "an")
row joan: aria-selected true        <- expected the first match, ana
```

The list re-ranks on the new query (`ana`, `anna`, `joan`), so the highlighted
row is not even the same name the user had reached; `Enter` inserts `joan`
because the field reads `visible[active]`. A user who types to narrow the search
therefore confirms the wrong candidate, which is the opposite of what the
component promises: "A new query starts at its first candidate."

`highlighted` is an index, not a value, so the fix must key the reset on the
query itself, not on the list being open.

## 2. The rule

Derive the reset key from the query, keeping the open/closed transitions:

```ts
const queryKey = Option.match(open, {
  onNone: () => "closed",
  onSome: (query) => `open:${query.query}`,
});
// A new query starts at its first candidate.
useLayoutEffect(() => {
  setHighlighted(0);
}, [queryKey]);
```

- Typing `n` into the open token changes `query.query` from `"a"` to `"an"`, so
  the key changes and the highlight restarts at the first ranked match.
- Opening (`closed` → `open:…`) and closing (`open:…` → `closed`) still reset, so
  the existing behaviour is preserved.
- A text change that leaves the query unchanged (for example typing elsewhere in
  the field while the token still reads `@an`) maps to the same key, so the
  highlight is not stolen from the user by an unrelated edit.
- `dismissed` already forces `open` to `none`, so an Escape keeps closing and a
  new `@` restarts at the first candidate.
- The key cannot collide with a query string: the open form is prefixed
  `open:`, the closed form is `closed`.

Nothing else changes: ranking, wrapping (`active` still normalises the index),
the inserted name, the callbacks and the row activation contract (plan 759) stay
as they are.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/mention-input.tsx` | Replace `openKey` with the query-derived key (§2) |
| `packages/components/src/behaviour/mention-input.test.tsx` | 1 native case (21 → 22) and the header's bug list |
| `packages/components/docs/mention-input.mdx` | The ranking/keyboard rule and the verification count |
| `COMPONENTS.md` | The Mention input row: the rule and the count |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `765` to the D30 overflow list |
| `TODO.md` | Tick the hardening line under the Tier 2 hardening list |

No public API changes, no dependency, no other package.

## 4. Test plan

### Native (`src/behaviour/mention-input.test.tsx`)

The bug being guarded is stated in the case's comment:

**"restarts the highlight when the query narrows"** —

1. `type(mention, "@a")` — three matches, `ana` highlighted.
2. `simulateKeystrokes("down")` twice — `joan` highlighted.
3. `type(mention, "n")` — query `"an"`, still the same three matches.
4. Assert `row-ana` is `aria-selected` and `row-joan` is not.
5. `simulateKeystrokes("enter")` — assert the value is `"@ana "` and `onMention`
   was called with `"ana"`.

Step 4 fails at `HEAD` (`joan` selected), so the case can fail. Step 5 pins the
consequence the highlight exists for: the stale cursor inserted the wrong name.

The existing "moves the highlight with the arrow keys" case stays the pin that
arrows still move the cursor, and the existing "inserts the highlighted name on
Enter" case the pin that Enter reads the cursor.

### Commands and expected results

```sh
# 1. Prove the new native case fails on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/mention-input.test.tsx
# EXPECT: 1 failed | 21 passed (22); the failure is the new case, at the
# `aria-selected` assertion for `ana` (plus this file's recorded plan-540
# caller-focus case if it is in the file at that moment — measured 20/21 pass
# on 2026-10-20, so it is not).

# 2. After the fix, the same file
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/mention-input.test.tsx
# EXPECT: 22 passed (22).

# 3. The unit suite
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0; 495 tests in 47 files (unchanged — this fix has no pure rule).

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: one more passing than the baseline measured this turn (961 passed /
# 20 failed of 981), i.e. 962 passed / 20 failed of 982, with the same 20
# recorded plan-540 failures. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Record the exact totals in this plan's status row, `TODO.md`, the README index
and the component's docs.

## 5. STOP conditions

- The new native case passes at `HEAD`. Stop and re-measure: a test that cannot
  fail is not evidence.
- The new case fails for an unrelated reason (the list is absent, the rows are
  different). Stop; the fixture layout is wrong, not the fix.
- A query-unchanged edit moves the highlight (the key is too broad). Stop; the
  key must carry the query text, not the whole field text.
- The open/close reset stops working (a closed list reopens on the previous
  candidate). Stop; the `closed` branch must stay in the key.
- Any other mention report changes, or a full-suite failure appears outside the
  recorded plan-540 classes. Stop and record it.
- `765` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- Changing the open query resets the highlight to the first ranked match, so
  `Enter` inserts that match; opening and closing still reset; an edit that does
  not change the query does not.
- The new native case fails on the old source and passes after, stated with the
  bug it guards.
- `docs/mention-input.mdx`, `COMPONENTS.md` and the inventory agree with the
  suites' counts; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
