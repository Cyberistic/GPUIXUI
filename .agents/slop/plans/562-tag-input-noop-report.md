# 562 — A refused tag edit reports no change

**Owner:** components workstream · **Phase:** F (integration and polish) ·
**Number:** 562 — the first free number across every worktree (`561` is this
workstream's, `560` another's).

## 1. The bug being guarded

`TagInput` is controlled-only: the caller owns the token list and the component
calls `onValueChange` with the list it wants next. Plan 517 established the
package rule that **a request for the value already held is a no-op**, and plan
559 applied it to a refused accordion toggle. `TagInput` still breaks the rule in
three observable paths:

1. typing a token that is **already present** (unless `allowDuplicates`);
2. reaching **`max`** — `addTokens` refuses the addition but the renderer still
   calls `onValueChange(value)` with the **same array reference**;
3. pressing `Enter` / typing `,` on an **empty or whitespace-only draft** — no
   token is added, yet the callback fires.

`addTokens` and `removeToken` already return the input array *by reference* when
nothing changed (`tag-input/logic.ts`), so the fix is a reference guard at the one
place the component reports. A consumer that treats the callback as a change
(mark the form dirty, schedule a save, push undo) currently sees a phantom edit.
The existing native cap test even asserts the phantom call:
`expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"])`.

## 2. Exact change

### 2.1 `packages/components/src/tag-input.tsx`

In `TagInput`, guard both reporting paths:

```ts
const add = (incoming: ReadonlyArray<string>): void => {
  const next = addTokens(value, incoming, { allowDuplicates, max });
  if (next !== value) onValueChange(next);
};
```

and in the context value:

```ts
remove: (token) => {
  const next = removeToken(value, token);
  if (next !== value) onValueChange(next);
},
```

No other change: `commit`, `editDraftValue`, the `disabled` guard, the draft
state and every part stay as they are. The reference comparison is exact because
both rules start their fold with the current array and return it unchanged when
they refuse (`Arr.reduce` over `incoming` with no append; `Option.match` on a
missing index).

### 2.2 `packages/components/src/behaviour/tag-input.test.tsx`

Strengthen two existing cases (keep the native test count at 15):

- `"ignores a duplicate"` — add `const onValueChange = vi.fn()` and the `Harness`
  prop, then after the duplicate `Enter` assert
  `expect(onValueChange).not.toHaveBeenCalled()`. Then type `","` (a typed comma
  over the cleared draft) and press `Enter` on the now-empty field; assert the
  callback is **still** uncalled. Rename to
  `"reports nothing for a duplicate, a typed comma and an empty commit"`.
- `"refuses an addition past max"` — replace
  `expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"])` with
  `expect(onValueChange).not.toHaveBeenCalled()`; the chip assertion stays.

Update the file header comment to name the guarded bug: a refused duplicate, cap
or empty commit must not report a change.

## 3. Both-direction proof

With the guards reverted (`onValueChange(next)` unconditional), run:

```sh
cd packages/components
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/tag-input.test.tsx
```

Expected: both strengthened cases fail — the duplicate case reports
`["design"]`, the cap case reports `["a","b"]`. Restore the guards; both pass.

The focus-ring case (`paints the focus ring on a chip's removal control`) is the
known plan-540/536 binding failure (a native focus change delivers no React
`focus`); it stays red before and after and is not part of this proof.

## 4. Docs and inventory sync

- `packages/components/docs/tag-input.mdx` — under the token rules, state that a
  refused addition (duplicate, `max`, empty draft) reports no change; add the
  refusal to the Verification sentence (count stays 15).
- `COMPONENTS.md` → `Tag / token input` row — say a refused duplicate, cap or
  empty commit calls nothing.
- `TODO.md` → add and tick a Tier 2 hardening row for plan 562.
- `.agents/slop/plans/README.md` → index this plan under the components table.
- `PLAN.md` → no decision needed; this applies D26/plan 517 to one more
  component.

## 5. Commands and expected results

From `packages/components`:

```sh
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/tag-input.test.tsx
# expected: 14 passed, 1 known binding failure (the chip ring), 15 tests total

nub run test
# expected: 41 files, 421 unit tests, all pass

nub run check-types
# expected: exit 0
```

From the repo root:

```sh
nub run check
nub run lint
```

Expected: both exit 0; no test-count drift.

## 6. STOP conditions

Stop and report rather than loosening an assertion if:

- an accepted addition or a real removal stops reporting — the reference guard
  is wrong, not the rule;
- the caller-refuses-a-change case breaks — controlled-only semantics changed;
- the native test count changes — this plan adds no test file or case;
- the docs/inventory count check fails — a stale count was not updated.

## 7. Acceptance

- With the guards reverted, the two strengthened native cases fail; with them,
  they pass.
- An accepted token, a real removal and a caller that refuses still behave as
  documented.
- Unit suite, `nub run check` and `nub run lint` pass.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index record the rule.

## 8. Observed (2026-10-19)

- The guarded suite: `14 passed | 1 failed (15)` — the one failure is the
  pre-existing plan-540/536 chip-ring binding defect, unchanged.
- Mutation (`add` reverted to `onValueChange(addTokens(...))`): both
  strengthened cases fail. The cap case reports **two** phantom calls with
  `["a", "b"]` — one on typing the `"c"` keystroke (an incomplete draft, no token
  added) and one on `Enter` — which is larger than the plan first described.
  The duplicate case reports the same shape.
- With the guard restored, both pass. No test count changed.
