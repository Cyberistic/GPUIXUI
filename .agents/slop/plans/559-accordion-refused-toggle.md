# 559 — A refused non-collapsible accordion toggle reports nothing

**Owner:** components workstream · **Phase:** F (integration and polish) ·
**Number:** 559 — `557` and `558` are taken in other worktrees, so this is the
first free number across every worktree.

## 1. The bug being guarded

A single accordion that is **not** collapsible may never close its only open
section. `accordion/logic.ts` already returns the **same state object** for that
transition (`toggle` in the non-collapsible open case returns `single`). The
renderer ignores that fact:

```ts
const next = toggle(current, item);
if (value === undefined) setState(next);
onValueChange?.(
  next.type === "single" ? Option.getOrNull(next.open) : null,
);
```

`onValueChange` runs unconditionally, so a controlled accordion reports its
current value when the user presses the already-open header. The docs call the
transition a no-op (`docs/accordion.mdx` § Behaviour: “a non-collapsible
accordion cannot close its last open section”), and every other controlled
component suppresses same-value reports (plan 517 established the rule in
`internal/controllable.ts`).

Measured 2026-10-19 with a temporary case:

```tsx
const onValueChange = vi.fn();
const faq = renderComponent(<Faq value="one" onValueChange={onValueChange} />);
clickCentreOf(faq, "trigger-one");
expect(onValueChange).not.toHaveBeenCalled();
```

Fails: `Number of calls: 1`, with `"one"`.

## 2. Exact change

`packages/components/src/accordion.tsx`, `SingleAccordion.toggleItem` only.

Return before reporting when the transition changed nothing:

```ts
const toggleItem = useCallback(
  (item: string): void => {
    const next = toggle(current, item);
    // A non-collapsible accordion refuses to close its only open section;
    // `toggle` returns the same state, so there is nothing to report or store.
    if (next === current) return;
    if (value === undefined) setState(next);
    onValueChange?.(
      next.type === "single" ? Option.getOrNull(next.open) : null,
    );
  },
  [current, onValueChange, value],
);
```

`toggle` is a pure function that returns a new object for every real change and
the input object for the refused transition, so reference equality is the exact
test. Do not compare the reported values: `null` is a real close in collapsible
mode and must still be reported.

`MultipleAccordion` needs no change: removing or adding a value always produces a
new state.

## 3. Test

`packages/components/src/behaviour/accordion.test.tsx`, beside the existing
“refuses to close the only open section when not collapsible” case.

Add one controlled case:

```tsx
it("does not report a refused non-collapsible toggle", () => {
  const onValueChange = vi.fn();
  const faq = renderComponent(
    <Faq value="one" onValueChange={onValueChange} />,
  );

  clickCentreOf(faq, "trigger-one");

  expect(onValueChange).not.toHaveBeenCalled();
  expect(isHidden(faq, "content-one")).toBe(false);

  faq.unmount();
});
```

It can fail: on the current source it fails at `not.toHaveBeenCalled()`; after
the fix it passes and still asserts the section stayed open, so the change is not
mistaken for a close. The existing controlled collapsible close (`null`) and
controlled switch (`"two"`) cases must keep passing.

## 4. Both-direction proof

```sh
cd packages/components
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/accordion.test.tsx -t 'refused non-collapsible'
# expected after the fix: 1 passed
```

Mutation: delete `if (next === current) return;` → the new case fails with one
call. Restore it and the case passes. Record the observed failure in the commit
message or §7.

## 5. Docs, example and inventory sync

- `packages/components/docs/accordion.mdx` → Verification: 22 → 23 tests, and
  say the non-collapsible no-op is silent in a controlled accordion.
- `packages/components/examples/accordion.example.tsx` → only if its header
  comment describes the callback contract; otherwise unchanged.
- `COMPONENTS.md` → `Accordions` row: 22 → 23 native behaviour tests, and note
  that a refused non-collapsible toggle reports nothing.
- `TODO.md` → add and tick a Tier 2 hardening row for plan 559.
- `.agents/slop/plans/README.md` → index this plan.
- `PLAN.md` → no decision or ADR needed.

## 6. Commands and expected results

From `packages/components`:

```sh
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/accordion.test.tsx
# expected: 23 passed

nub run test
# expected: 41 files, 417 tests, all pass (the inventory count check included)

nubx vitest run --config vitest.behaviour.config.ts src/accordion/logic.test.ts
# expected: 15 passed, unchanged
```

From the repo root:

```sh
nub run check
nub run lint
```

The full behaviour suite stays at `683 passed | 55 failed (738)` before this
change; after it, `684 passed | 55 failed (739)`, with the 55 plan-540 binding
failures untouched.

## 7. STOP conditions

Stop and report rather than changing the test if:

- the controlled collapsible close stops reporting `null` — the `next ===
  current` guard must not swallow a real transition;
- the controlled switch to `"two"` stops reporting — the guard is too broad;
- the new case cannot fail on the old source (measure it before the fix) — the
  test is not guarding the reported change;
- the inventory count check disagrees with the suite — correct the stated count,
  never the check.

## 8. Acceptance

- The new native case fails on the old source and passes on the new source.
- Accordion's 22 existing native cases and 15 logic cases still pass.
- The unit suite, `nub run check` and `nub run lint` pass; the behaviour suite
  has exactly the same 55 pre-existing binding failures.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index record the fix.

## 9. Observed (2026-10-19)

- New case on the fixed source: `1 passed`.
- Mutation (guard deleted): `1 failed` — `expected "vi.fn()" to not be called at
  all, but actually been called 1 times`.
- Accordion suite: `22 passed | 1 failed (23)`; the failure is the pre-existing
  plan-540 binding case (`returns focus to the header when a close starts inside
  its body`), unchanged.
- Logic suite: 15/15.
- Full behaviour suite after both plan 557 and 559: `684 passed | 55 failed
  (739)` — exactly the plan-540 binding set.
