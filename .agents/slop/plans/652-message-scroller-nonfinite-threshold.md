# 652 — A malformed pin threshold must not stop the scroller following the end

**Phase:** F (input normalisation and display truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 117 (verification gate), plan 206 (MessageScroller),
plans 611/619/649/650/651 (normalise-at-the-boundary rule), plan 582 (the
measured visible box).
**Status:** implemented — measured before the fix:
`observeScroll(initialMessageScrollerState, { distanceFromEnd: 0, threshold: NaN })`
→ `{ pinned: false, unread: 0 }`, while `threshold: 24` → `{ pinned: true, unread: 0 }`.
`pinThreshold` now treats an absent or non-finite value as the theme default and
clamps a negative one to zero; 2 pure + 1 native case (unit 464, Message scroller
13), the native case failing alone when the old wiring is restored; docs,
`COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the index are synced.

## 1. The bug

`MessageScroller` takes one public numeric prop:

| Prop | Documented meaning | Current rule | Measured with `NaN` |
| ---- | ------------------ | ------------ | ------------------- |
| `threshold` | Distance from the tail that still counts as "at the end"; defaults to the theme's `spacing["2xl"]` (24) | `thresholdProp ?? theme.spacing["2xl"]` | `Math.max(0, NaN)` is `NaN`, and `distanceFromEnd <= NaN` is `false` forever |

`observeScroll` receives that value directly:

```ts
const pinned = distanceFromEnd <= Math.max(0, threshold);
```

A non-finite threshold therefore makes **every** observation read "not at the
end", even `distanceFromEnd: 0`. The consequences are user-visible:

- the scroller never follows an appended row, even at the very bottom;
- wheeling back to the end cannot re-pin it;
- every arrival counts as unread, so the jump affordance shows a count that never
  clears by scrolling.

`undefined` correctly uses the theme default; a negative finite value clamps to
0. Only `NaN` and `±Infinity` — a value that is not a distance — are mishandled.

The rule follows plans 649–651: a malformed bound must never disable the
component. For a distance, the honest fallback is the shipped default, not
"no distance" (which would pin only at an exact 0 px gap) and not "hide the
feature".

Measured at `HEAD` with `nub -e` against the pure module (2026-10-19):

```text
{"pinned":false,"unread":0}   // threshold: NaN
{"pinned":true,"unread":0}    // threshold: 24
```

## 2. The fix

One helper beside the rules it serves:

`packages/components/src/message-scroller/logic.ts`

```ts
/**
 * The pin distance: a finite caller value clamped at zero, or the fallback
 * token when the value is absent or not a distance. A malformed threshold must
 * not disable following the end.
 */
export const pinThreshold = (
  value: number | undefined,
  fallback: number,
): number =>
  value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(0, value);
```

`MessageScroller` uses it where it currently takes the prop:

```ts
const threshold = pinThreshold(thresholdProp, theme.spacing["2xl"]);
```

`observeScroll` stays pure and unchanged: it receives a usable threshold. The
fallback belongs in the component because it is a theme value.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/message-scroller/logic.ts` | New exported `pinThreshold` with the JSDoc above. |
| `packages/components/src/message-scroller/logic.test.ts` | New `describe("pinThreshold")` with two cases: a non-finite/absent value uses the fallback; a finite value is kept and a negative one clamps to 0. |
| `packages/components/src/message-scroller.tsx` | Import and use `pinThreshold`; extend the `threshold` prop JSDoc with the malformed-value rule. |
| `packages/components/src/behaviour/message-scroller.test.tsx` | Add a `threshold?: number` prop to the `Transcript` fixture and one native case: with `threshold={NaN}`, wheel up then back to the end re-pins (the affordance disappears and the last row is visible). |
| `packages/components/docs/message-scroller.mdx` | State the rule beside the default, and update the native count 12 → 13. |
| `COMPONENTS.md` | Message scroller row: record the rule and the counts 12 → 13 native, 11 → 13 rule. |
| `.agents/slop/plans/README.md` | Index this plan in the components table. |
| `PLAN.md` | Record `652` in D30. |
| `TODO.md` | One ticked entry under "Tier 2 hardening after the inventory closed". |

No export is added to `src/index.ts`: `message-scroller/logic.ts` is internal
(plan 338) and `MessageScroller` already has its public module.

## 4. Test plan

### Pure (`src/message-scroller/logic.test.ts`)

Two cases, both asserting values rather than lengths:

- `pinThreshold(Number.NaN, 24)` is `24`; `pinThreshold(Number.POSITIVE_INFINITY,
  24)` is `24`; `pinThreshold(undefined, 24)` is `24`.
- `pinThreshold(12, 24)` is `12`; `pinThreshold(-4, 24)` is `0`.

### Native (`src/behaviour/message-scroller.test.tsx`)

```tsx
it("re-pins at the end when the threshold is not a number", () => {
  const root = renderComponent(<Transcript count={40} threshold={Number.NaN} />);

  wheel(root, 120);
  expect(root.renderer.findByTestId("jump")).toBeDefined();

  wheel(root, -120);
  expect(endIsVisible(root, 39)).toBe(true);
  expect(root.renderer.findByTestId("jump")).toBeUndefined();

  root.unmount();
});
```

The wheel pair guarantees a real `onScroll` observation on both sides, so the
case cannot pass merely because a mount-time observation never ran.

### Both-direction proof

1. Add the cases and run them against the current source: the two pure cases must
   fail (`pinThreshold` does not exist yet — implement the helper, then revert
   the component wiring only), and the native case must fail with the affordance
   still present after the wheel back.
2. Wire `pinThreshold` into `MessageScroller`; all three pass.
3. Mutation: replace the helper call with the old
   `thresholdProp ?? theme.spacing["2xl"]` and confirm the native case fails
   alone. Record both runs in this plan's status line after implementation.

## 5. Commands

From `packages/components`:

```bash
nub exec vitest run src/message-scroller/logic.test.ts
# expected after: 13 passed (11 existing + 2 new)

nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/message-scroller.test.tsx
# expected after: 13 passed (12 existing + 1 new)

nub run test
# expected after: 46 files, 464 tests, all green

nub run check-types
# expected: exit 0
```

From the repo root:

```bash
nub run check
nub run lint
nub run test
```

Expected: `check` green (the inventory check holds the docs counts to the
suites), `lint` green, unit suite green. The native suite keeps the recorded
plan-540 binding failures; this file must not gain one.

## 6. STOP conditions

Stop and report if:

- a new pure case passes before the fix (the premise is wrong);
- the native case passes at `HEAD` — that means the wheel path did not produce a
  real observation; try the append path with an explicit scroll event, and if
  that also cannot fail, keep the pure fix and record the missing native proof
  rather than shipping an assertion that cannot fail;
- the touched behaviour file gains a failure compared with `HEAD`;
- `nub run check-types` fails for a reason outside these files;
- any documented test count disagrees with the suite after the edit.

## 7. Acceptance

- A non-finite `threshold` uses the theme default; the scroller still follows,
  re-pins and reports pin changes.
- The rule lives once in `message-scroller/logic.ts` and has its own test.
- One native case fails on the old wiring and passes with the fix.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index are synced.
- `nub run check`, `nub run lint` and `nub run test` pass.
