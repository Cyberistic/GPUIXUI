# 646 — Tabs: the disabled-tab handover reads the natively focused tab

**Phase:** F (behaviour truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 113, 117, 200, 201, 321, 332,
367, 388, 394, 510, 511, 540, 564, 566, 578, 608, 620.

**Status:** implemented 2026-10-19 — Tabs is **29 passed / 2 failed of 31**
(the removed-host and `onBlur` cases, both plan-540 focus-signal failures);
full behaviour suite **810 passed / 32 failed of 842** (35 minus the three this
plan fixes); unit 454; `check`, `lint` and `test` green.

## 1. Measured bug (this host, 2026-10-19)

`src/behaviour/tabs.test.tsx` on the current tree: **26 passed / 5 failed of
31**. Three failures are this defect; the other two are the recorded plan-540
binding defects (no `blur` delivery, and a removed host clearing focus before
any handler can observe it).

| Test (line) | Fixture | Observed |
| ----------- | ------- | -------- |
| *takes focus and the ring off a tab that becomes disabled* (814) | `focusElement(tab-b)`, rerender `disabled=["b"]` | focus stays on `tab-b`; expected `tab-a` |
| *does not change the selection when it hands focus over* (880) | `focusElement(tab-b)`, rerender `disabled=["b"]` | focus stays on `tab-b`; expected `tab-a`, selection stays `a` |
| *does not select the tab it lands on when the tab stop has to move* (904) | `focusElement(tab-b)`, rerender `disabled=["a","b"]` | focus stays on `tab-b`; expected `tab-c`, selection stays `a` |

The probe read the renderer directly: `getFocusedElementId()` is the focused
tab's host id before and after the disable update, so the row is still
observable. The handover only never asked. A deleted host is different: after
the removal commit `getFocusedElementId()` is `null` and a deleted component's
layout cleanup already sees `null`, so the removal case cannot be recovered
without a focus signal; it stays red with the other plan-540 focus failures.

The docs already promise the fixed behaviour (`docs/tabs.mdx`, "A tab that
changes"): a trigger that turns `disabled` never keeps focus; the stop falls to
the selected tab, else the first enabled one.

## 2. Decision

**The natively focused row is the origin; the remembered id is the fallback.**
That is the rule List adopted in plan 578 and Tabs adopted for arrow origins in
plan 367, applied to the handover:

1. At handover time, map `renderer.getFocusedElementId()` through the registered
   rows.
2. When it names a row, that row decides. When it names no row (focus is on a
   consumer's control, or gone), fall back to `focusedTab.current`.
3. No row, no handover — the component never invents a focus owner.
4. The existing guards stay: a live enabled target returns; a consumer's focus
   in the same update is never stolen; `tabbable` (selected tab, else first
   enabled) receives focus; the selection is never rewritten.

No API, export, dependency or visual change. The selection, `liveActive` and
the tab stop derivation are untouched.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| change | `packages/components/src/tabs.tsx` | resolve the handover origin from native focus, then the remembered id |
| change | `packages/components/src/behaviour/tabs.test.tsx` | the three existing cases now guard this defect: update the block comment to name the native-focus path; no assertion is weakened |
| change | `packages/components/docs/tabs.mdx` | the "A tab that changes" bullet says the origin is read from the renderer; verification count `31` → `29 passing of 31` wording if the page states a count |
| change | `COMPONENTS.md` | Tabs row: record the native-focus origin and the two remaining plan-540 failures |
| change | `TODO.md` | add and tick the hardening task under Tier 2 |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `646` as the claimed components number |

## 4. Implementation

In `packages/components/src/tabs.tsx`, replace the handover effect's origin
block (currently `const remembered = focusedTab.current; if (….isNone) return;`):

```ts
useLayoutEffect(() => {
  const nativeRow = Option.flatMap(
    Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
    (id) => Arr.findFirst(rows, (row) => row.id === id),
  );
  const remembered = Option.orElse(
    Option.map(nativeRow, (row) => row.id),
    () => focusedTab.current,
  );
  if (Option.isNone(remembered)) return;

  const target = Arr.findFirst(rows, (row) => row.id === remembered.value);
  if (Option.exists(target, (row) => !row.disabled)) return;

  focusedTab.current = Option.none();
  const focused = Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null);
  if (Option.exists(focused, (id) => id !== remembered.value)) return;
  // … unchanged tabbable handover
}, [focusRow, renderer, rows, tabbable]);
```

Keep the comment and extend it: a native focus move never runs `onFocus`, so the
renderer is asked, with the last recorded id as the fallback (plans 367/578).

## 5. Test plan

The three cases in §1 are the regression tests. They fail at `HEAD` for the
recorded reason and pass after the change; no new fixture is needed because
they already drive `focusElement` directly, which is the native path with no
React event.

Add one **pin** inside the existing "never steals focus a consumer claimed in
the same update" case's block comment only: it already asserts that a
non-tab control focused in the same update keeps focus, and that must still pass
(the native lookup maps no row and the fallback is `None`).

Commands, from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx
```

Expected after the change: **29 passed / 2 failed of 31**; the two failures are
*hands focus to the selected tab when the focused tab is removed* (no focus
signal after the host is gone) and *runs a caller onBlur when focus leaves a
trigger* (the binding dispatches no `blur`), both catalogued in plan 540 §8.

```sh
nub run test:behaviour
```

Expected: 810 passed / 32 failed of 842 (the same 35 recorded failures minus the
three this plan fixes). No other file may change its pass count.

```sh
nub run test
```

Expected: 454 passed in 45 files (unchanged; no pure module changes).

Repo gates, from the worktree root:

```sh
nub run check
nub run lint
```

Expected: both exit 0.

Both-direction proof: run the three cases before the change (they fail as in
§1), apply §4, run them again (pass). Reverting only the native lookup (keeping
the fallback) returns all three to the failing state.

## 6. STOP conditions

Stop and report instead of improvising if:

- the native lookup is `null` **while the disabled tab's host still exists**
  (then the runtime cannot report the focused host at all and the plan's premise
  is wrong — record the measurement, do not add a timer or poll);
- a fix passes the three cases by changing an assertion, a fixture, or the
  selected value;
- any test outside `tabs.test.tsx` changes its pass count;
- the handover steals focus in the "consumer claimed" case.

## 7. Acceptance

- The three §1 cases pass; the remaining Tabs failures are exactly the two named
  plan-540 binding cases.
- `docs/tabs.mdx` and the `COMPONENTS.md` Tabs row state the native-focus origin
  and the two remaining failures.
- `TODO.md` has the task ticked, the plan is indexed, and `PLAN.md` D30 records
  `646`.
- `nub run check`, `nub run lint` and `nub run test` exit 0.
