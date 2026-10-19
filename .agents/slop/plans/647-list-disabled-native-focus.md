# 647 — List: the disabled-row handover reads the natively focused row

**Phase:** F (behaviour truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 111, 117, 200, 201, 326, 339,
367, 373, 388, 394, 510, 540, 577, 578, 646.

**Status:** implemented 2026-10-19 — List is **59 passed / 2 failed of 61**
(the two removed-host cases, plan-540 focus-signal failures); full behaviour
suite **811 passed / 31 failed of 842** (32 minus this plan's case); unit 454;
`check`, `lint` and `test` green.

## 1. Measured bug (this host, 2026-10-19)

`src/behaviour/list.test.tsx` on the current tree: **58 passed / 3 failed of
61**. One failure is this defect; the other two are the removal cases that need
a focus signal after the host is gone (plan 540 §8).

| Test (line) | Fixture | Observed |
| ----------- | ------- | -------- |
| *takes the tab stop and focus off a row that becomes disabled* (1493) | `focusElement(row-b)`, rerender `disabled=["b"]` | tab stop moves to `row-a`; focus stays on `row-b` |
| *hands focus to the tab stop when the focused row is removed* (1465) | `focusElement(row-b)`, rerender `["a","c"]` | focus is `None` |
| *falls back to the surviving selection when the focused row is removed* (1480) | click `row-a`, `focusElement(row-b)`, rerender `["a","c"]` | focus is `None` |

The disabled row's host still reports `getFocusedElementId()` after the update,
so the origin is observable; the handover never asks. A deleted host reports
`null` before any layout cleanup can read it, so the two removal cases stay red
with the plan-540 focus-signal failures (they cannot be recovered without a
`focus`/`blur` signal or a poll, and this package adds neither).

The docs already promise the fixed behaviour (`docs/list.mdx`, "Dynamic rows"):
disabling the tab-stop row hands the stop to the selected/first enabled row and
focus follows it when the list held the user's focus.

## 2. Decision

**The natively focused row is the origin; the remembered id is the fallback** —
the rule plans 578 and 646 already use:

1. At handover time, map `renderer.getFocusedElementId()` through the registered
   rows (`nativeId`).
2. When it names a row, that row decides. When it names no row (a consumer's
   control, or a host that is gone), fall back to `focusedRow.current`.
3. No row, no handover — never invent a focus owner.
4. Keep every existing guard: a live enabled target returns; a consumer's
   same-update focus is never stolen; the `tabbable` row receives focus; a
   removed row is forgotten so a refill cannot resume it.

No API, export, dependency or visual change.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| change | `packages/components/src/list.tsx` | resolve the handover origin from native focus, then the remembered id |
| change | `packages/components/src/behaviour/list.test.tsx` | update the dynamic-row block comment to name the native-focus path; no assertion changes |
| change | `packages/components/docs/list.mdx` | "Dynamic rows" states the renderer origin and the removed-host limitation; verification count `61` → `59 of 61` wording |
| change | `COMPONENTS.md` | List row: native-focus origin, 61 tests / 59 passing on this host and the two plan-540 failures |
| change | `TODO.md` | add and tick the hardening task under Tier 2 |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `647` as the claimed components number |

## 4. Implementation

In `packages/components/src/list.tsx`, replace the handover effect's origin
block (`const remembered = focusedRow.current;`):

```ts
useLayoutEffect(() => {
  const nativeRow = Option.flatMap(
    Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
    (id) => Arr.findFirst(rows, (row) => row.nativeId === id),
  );
  const remembered = Option.orElse(
    Option.map(nativeRow, (row) => row.nativeId),
    () => focusedRow.current,
  );
  if (Option.isNone(remembered)) return;
  // … unchanged target / steal guard / tabbable handover
}, [focusRow, renderer, rows, tabbable]);
```

Extend the comment: a native focus change never runs `onFocus`, so the renderer
is asked first, with the last focused row as the fallback (plans 578/646).

## 5. Test plan

The disabled case in §1 is the regression test: it fails at `HEAD` for the
recorded reason and passes after the change. The two removal cases stay red and
must not be weakened. The passing "never steals focus a consumer claimed" and
"does not grab focus when rows return" cases are the pins.

Commands, from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
```

Expected after: **59 passed / 2 failed of 61** (the two removal cases).

```sh
nub run test:behaviour
```

Expected: **811 passed / 31 failed of 842** (the current 810/32 minus List's
disabled case).

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

Both-direction proof: run the disabled case before the change (fails, focus
`row-b`), apply §4, run again (passes). Reverting only the native lookup returns
it to the failing state.

## 6. STOP conditions

Stop and report instead of improvising if:

- `getFocusedElementId()` is `null` while the disabled row's host still exists
  (the plan's premise is wrong — record it, add no timer or poll);
- a fix passes by changing an assertion, a fixture or the selected value;
- any test outside `list.test.tsx` changes its pass count;
- the handover steals focus in the "consumer claimed" or "emptied list" pins.

## 7. Acceptance

- The disabled case passes; the two removal cases stay red and are named.
- `docs/list.mdx` and the `COMPONENTS.md` List row state the native-focus origin
  and the two remaining failures.
- `TODO.md` has the task ticked, the plan is indexed, and `PLAN.md` D30 records
  `647`.
- `nub run check`, `nub run lint` and `nub run test` exit 0.
