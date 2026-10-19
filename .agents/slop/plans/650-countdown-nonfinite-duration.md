# 650 — Countdown: a non-finite remaining duration paints `NaN:NaN`

**Phase:** F (input normalisation and display truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 312 (countdown), plan 117 (verification gate),
plan 611 and plan 619 (the normalise-at-the-boundary rule), plan 649 (the same
class in Breadcrumb).
**Status:** implemented — 2 pure + 1 native case (Countdown 6, unit 457). The
pure formatter read `NaN:NaN` and the native tree painted no `00:00` on the old
source; both pass after the fix. The full behaviour suite is 813 passed / 31
failed of 844 — the same 31 recorded plan-540 binding failures. Docs,
`COMPONENTS.md`, `TODO.md` and the inventory are synced.

## 1. The bug

`Countdown` formats whatever `remainingMs` it receives:

```ts
const wholeSeconds = (remainingMs: number): number =>
  Math.max(0, Math.floor(remainingMs / 1000));
```

`Math.max(0, NaN)` is `NaN`, so a non-finite value flows through `breakdown` and
`formatCountdown` unchanged. `formatCountdown` falls through both
`total >= SECONDS_PER_HOUR` and the days branch (comparisons with `NaN` are
false) and paints `pad(NaN)` twice — the literal text **`NaN:NaN`**. A positive
`Infinity` is worse: `pad(Infinity)` returns `"Infinity"` and the days branch
prints `Infinityd Infinity:NaN:NaN`.

The component also derives expiry from the raw value
(`const expired = remainingMs <= 0`), so a `NaN` paints in the live foreground
colour and reports `expired: false` through `style`, even though the text says
the countdown is over. The contract says a negative value renders `00:00`
(`CountdownProps.remainingMs`, plan 312); a value that is not a number has no
duration at all and must take the same settled branch.

A caller can produce `NaN` from two clocks (`deadline - now` with a malformed
deadline) or from a server value that failed to parse. The display's whole job is
to paint a truthful remaining time, so it must never paint arithmetic debris.

Measured before the fix (§4):

- `formatCountdown(Number.NaN)` returns `"NaN:NaN"`;
- `breakdown(Number.NaN)` returns four `NaN`s;
- `<Countdown remainingMs={Number.NaN} />` paints `NaN:NaN` in
  `colors.foreground`, not `colors.mutedForeground`.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/countdown/logic.ts` | `wholeSeconds` maps a non-finite value to `0`; document the rule. |
| `packages/components/src/countdown/logic.test.ts` | Two pure cases: formatting and breakdown of a non-finite value. |
| `packages/components/src/countdown.tsx` | Normalise once for `expired`, formatting and the style state. |
| `packages/components/src/behaviour/countdown.test.tsx` | One native case: a `NaN` duration paints `00:00` in the muted role. |
| `packages/components/docs/countdown.mdx` | State the non-finite rule; refresh the verification count from 5 to 6 (and the format-suite count from 9 to 11). |
| `COMPONENTS.md` | Countdown row: record the rule and 5 → 6 native / 9 → 11 formatting tests. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `PLAN.md` | Record `650` as the first free overflow number in D30. |
| `TODO.md` | One ticked entry under "Tier 2 hardening after the inventory closed". |

No new module, export, dependency, example or inventory record is needed.

## 3. Exact implementation

### 3.1 `packages/components/src/countdown/logic.ts`

```ts
/**
 * Whole seconds remaining, floored and never negative. A non-finite value has
 * no duration to show, so it reads as zero — the same settled state a negative
 * value takes, never `NaN` arithmetic in the clock text.
 */
const wholeSeconds = (remainingMs: number): number =>
  Number.isFinite(remainingMs)
    ? Math.max(0, Math.floor(remainingMs / 1000))
    : 0;
```

`breakdown` and `formatCountdown` need no other change: both already read
`wholeSeconds`, so every unit is `0` and the text is `00:00`.

### 3.2 `packages/components/src/countdown.tsx`

Normalise once, before expiry is derived:

```ts
// A non-finite duration has no remaining time: paint the settled `00:00` state
// the component promises for a negative value (plan 650).
const remaining = Number.isFinite(remainingMs) ? remainingMs : 0;
const expired = remaining <= 0;
```

Use `remaining` for `formatCountdown` and for the style state
(`{ remainingMs: remaining, expired }`). Finite values — including negatives —
keep their current state value and colour branch; only a non-finite value
changes, and it changes to `0`/expired.

### 3.3 What must not change

- `formatCountdown`'s finite behaviour: `MM:SS`, `HH:MM:SS`, `Nd HH:MM:SS`,
  uncapped hours, floored seconds.
- The negative-value contract (`-1` still paints `00:00` in the muted role and
  still reports the authored `-1` through `style`).
- The component still owns no timer; `label`, `showDays` and the style merge are
  untouched.

## 4. Test plan

### 4.1 Pure (`src/countdown/logic.test.ts`)

```ts
it("reads a non-finite duration as the settled clock text", () => {
  // The bug this guards (plan 650): `Math.max(0, NaN)` is NaN, so the text was
  // `NaN:NaN` (and `Infinityd Infinity:NaN:NaN` with days shown).
  expect(formatCountdown(Number.NaN)).toBe("00:00");
  expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe("00:00");
  expect(formatCountdown(Number.NEGATIVE_INFINITY, { showDays: true })).toBe(
    "00:00",
  );
});

it("splits a non-finite duration into zero units", () => {
  expect(breakdown(Number.NaN)).toEqual({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});
```

### 4.2 Native (`src/behaviour/countdown.test.tsx`)

```tsx
it("renders a non-finite duration as an expired 00:00", () => {
  // The bug this guards (plan 650): the text read `NaN:NaN` and the raw
  // `remainingMs <= 0` left it in the live foreground colour.
  const countdown = renderComponent(
    <Countdown remainingMs={Number.NaN} />,
  );

  const leaf = countdown.renderer.findByText("00:00");
  const text =
    leaf?.parentId == null
      ? undefined
      : countdown.renderer.getElement(leaf.parentId);
  expect(text?.style.color).toBe(darkTheme.colors.mutedForeground);

  countdown.unmount();
});
```

Commands and expected results:

```sh
cd packages/components

# Before the source fix: 2 pure cases fail ("NaN:NaN" / NaN units) and the
# native case finds no "00:00" text.
nub exec vitest run src/countdown/logic.test.ts
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/countdown.test.tsx

# After the fix: logic 11, Countdown 6.
nub exec vitest run src/countdown/logic.test.ts
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/countdown.test.tsx

# Inventory and types.
nub run test
nub run check-types
```

Both-direction proof after the fix:

- restore `Math.max(0, Math.floor(remainingMs / 1000))` → both pure cases and the
  native case fail again;
- drop the component's normalisation but keep the logic fix → the native colour
  assertion fails (`colors.foreground` while the text is `00:00`), which is why
  both files change;
- keep the component normalisation but revert the logic fix → the pure cases
  fail, and the native text is `00:00` only because the component repaired it —
  the logic suite is the one that pins the formatter.

The behaviour suite needs a host with a GPUix native binding; on this Intel Mac
plan 140's locally built `darwin-x64` binding is installed. If the binding is
missing, **STOP** and report `unsupported-host` — never claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/countdown.mdx`
  - In the formatting/behaviour section: add "A non-finite `remainingMs` has no
    duration to show: it renders `00:00` in the expired role and reports
    `remainingMs: 0` to `style`, never `NaN` arithmetic."
  - Verification: change `(5 tests)` to `(6 tests)` and name the non-finite
    case; change the format-suite count from 9 to 11.
- `COMPONENTS.md`, Countdown row: add the non-finite rule and change
  "5 native behaviour tests + 9 formatting tests" to
  "6 native behaviour tests + 11 formatting tests".
- `.agents/slop/plans/README.md`: add the plan row after 649.
- `PLAN.md` D30: append that the components workstream took `650` (first free
  number after `649`, checked across every worktree).
- `TODO.md`: one ticked entry under "Tier 2 hardening after the inventory
  closed", naming the measured defect, the two normalisations, the three cases
  and the both-direction proof.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the pure cases pass **before** the source fix — the measurement or the
  assertion is wrong, so the bug is not proven;
- `findByText("00:00")` finds the wrong node in the native tree (the leaf/parent
  shape differs) — record the tree and stop rather than weakening the colour
  assertion;
- another worktree has claimed `650` (re-check
  `find /Users/cyberistic/GPUIXUI/workspaces -path '*/.agents/slop/plans/650-*'`);
  take the next free number and record it in `PLAN.md` D30;
- the behaviour suite reports `unsupported-host`;
- `check-types` fails for a reason outside these files.

## 7. Acceptance

- [x] Both pure cases fail at `HEAD` and pass with the fix.
- [x] The native case fails at `HEAD` (no `00:00`, or the wrong colour) and
      passes with both normalisations.
- [x] Finite formatting, the negative-value contract and the style state for
      finite values are unchanged.
- [x] Docs, `COMPONENTS.md`, the plan index, `PLAN.md` and `TODO.md` state the
      shipped counts and the rule.
- [x] `nub run --filter @gpuixui/components test` (457 unit tests), `check-types`,
      and the two targeted suites pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
