# 763 — A malformed hover delay falls back to the default

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 112, 113, 317, 320, 323, 325, 326, 327, 651, 652, 677 |
| Status | done — measured 2026-10-20: all four new native cases red at `HEAD` (`Preview card 11/20`: the seven recorded plan-540 cases plus the two new ones; `Navigation menu 28/30`: the two new ones) and green after (`Preview card 13/20` with only the recorded seven, `Navigation menu 30/30`); unit 495 in 47 files, full native suite **961 passed / 20 failed of 981** with exactly the baseline's 20 recorded plan-540 classes (focus/blur, box conventions, the command-menu scroll and the drawer width) |
| Claimed number | `763` — the first free number across every worktree at claim time (`761`/`762` are claimed by the playground; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

`PreviewCard` and `NavigationMenu` take `openDelay` / `closeDelay` as plain
numbers and hand them straight to the shared hover policy
(`src/internal/hover.ts`). The policy decides "immediate" with `<= 0` and
otherwise calls `setTimeout(fn, delay)`. For a non-finite delay both tests are
false and `setTimeout` treats its argument as `0`, so the component silently
switches to **no delay at all**:

- an `openDelay` of `NaN` opens a card/panel **immediately** on hover instead of
  after the documented 300/100 ms;
- a `closeDelay` of `NaN` closes a card/panel **immediately** when the pointer
  leaves its trigger, so the pointer can no longer travel into the surface — the
  one interaction the delay exists to protect.

Measured 2026-10-20 in the real `TestRenderer`
(`src/behaviour/zz-probe.test.tsx` during this turn):

```
# <PreviewCard openDelay={NaN} closeDelay={20}>, hover, wait 100 ms
expected isShown(preview) to be false
received true

# <PreviewCard openDelay={20} closeDelay={NaN}>, open, leave the trigger, wait 30 ms
expected isShown(preview) to be true
received false

# <NavigationMenu openDelay={NaN} closeDelay={20}>, hover, wait 60 ms
expected isShown(panel) to be false
received true

# <NavigationMenu openDelay={20} closeDelay={NaN}>, open, leave, wait 5 ms
expected isShown(panel) to be true
received false
```

A malformed number is reachable without a type error: a delay computed from
configuration (`Number(process.env.HOVER_DELAY)`) or from a multiplier
(`base * factor`) is a `number`, and `NaN` / `Infinity` are valid numbers to the
compiler.

This is the same family as the package's existing rules — a malformed cap or
threshold must not remove the behaviour it bounds: a non-finite `siblingCount`
means "no cap" (plan 651), a non-finite `pinThreshold` uses the theme default
(plan 652), a non-finite toast `max` keeps the default queue bound (plan 677).
"No delay" is a caller's explicit choice (`0` or a negative value), never what a
malformed value should quietly mean.

## 2. The rule

One shared normaliser in `src/internal/hover.ts`, next to the policy it feeds:

```ts
/**
 * A hover delay in milliseconds. A caller's explicit `0` (or negative) value
 * means "no delay"; a non-finite one falls back to the component's default, so
 * a malformed value cannot make a surface open or close instantly.
 */
export const hoverDelay = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : fallback;
```

Each root applies it once, before building the policy options, with the default
it already documents:

- `PreviewCard`: `hoverDelay(openDelay, 300)`, `hoverDelay(closeDelay, 150)`;
- `NavigationMenu`: `hoverDelay(openDelay, 100)`, `hoverDelay(closeDelay, 150)`.

The menu submenu calls `useHoverTravel` with fixed constants and keeps them.
Nothing else changes: the timers, the travel rule, the focus policy and the
caller's handlers stay as they are. `Infinity` is non-finite and takes the
fallback for the same reason as `NaN` — an infinite delay is not "open at once",
it is a value that cannot be scheduled.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/hover.ts` | Add and document `hoverDelay` |
| `packages/components/src/preview-card.tsx` | Normalise both delays through it before `useHoverTravel` |
| `packages/components/src/navigation-menu.tsx` | Normalise both delays through it before `useHoverTravel` |
| `packages/components/src/internal/hover.test.ts` | **New** — the pure rule (§4) |
| `packages/components/src/behaviour/preview-card.test.tsx` | 2 native cases (18 → 20) and the header's bug list |
| `packages/components/src/behaviour/navigation-menu.test.tsx` | 2 native cases (28 → 30) and the header's bug list |
| `packages/components/docs/preview-card.mdx` | The delay rule, the limitations bullet and the verification count/list |
| `packages/components/docs/navigation-menu.mdx` | The delay rule, the limitations bullet and the verification count/list |
| `COMPONENTS.md` | Preview Card / Navigation Menu rows: the rule and the counts |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `763` to the D30 overflow list |
| `TODO.md` | Tick the hardening line under the Tier 2 hardening list |

No public API changes, no dependency, no other package.

## 4. Test plan

### Pure (`src/internal/hover.test.ts`)

1. **"a non-finite delay falls back to the component default"** — `NaN` and
   `Infinity` both return the fallback; a finite value is returned unchanged;
   `0` and a negative value return `0` (the documented "no delay"). The last
   assertion is the pin that the helper does not turn a caller's explicit
   immediate delay into the default.
2. **"the fallback is the component's own default"** — the helper returns the
   given fallback (e.g. `hoverDelay(NaN, 300) === 300`,
   `hoverDelay(Infinity, 150) === 150`), so a single shared helper cannot make
   the two components' defaults converge silently.

### Native (`src/behaviour/preview-card.test.tsx`)

The bug each case guards is stated in its comment:

1. **"keeps the default open delay when `openDelay` is malformed"** — render with
   `openDelay={Number.NaN}`, hover the trigger, wait 100 ms: the card is **not**
   shown. **Fails at `HEAD`** (it is shown). Then wait for the card to appear
   (`until`) to prove the fallback is 300 ms and not "never".
2. **"keeps the default close delay when `closeDelay` is malformed"** — render
   with `openDelay={20}` and `closeDelay={Number.NaN}`, open on hover, move the
   pointer off the trigger and the card, wait 30 ms: the card is **still** shown
   (the default 150 ms is running). **Fails at `HEAD`** (it is gone). Then
   `until` the card is hidden, proving it does close.

### Native (`src/behaviour/navigation-menu.test.tsx`)

1. **"keeps the default open delay when `openDelay` is malformed"** — same shape
   with the nav's 100 ms default; wait 60 ms and assert the panel is absent, then
   `until` it opens. **Fails at `HEAD`.**
2. **"keeps the default close delay when `closeDelay` is malformed"** — open,
   leave both surfaces, wait 30 ms and assert the panel is still painted, then
   `until` it closes. **Fails at `HEAD`.**

The existing hover cases (20/40/60 ms delays, pointer travel, pointer leaving a
panel for another trigger) are the pins: they prove an explicit short delay and
`0` still behave exactly as documented.

### Commands and expected results

```sh
# 1. Prove the four new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/preview-card.test.tsx src/behaviour/navigation-menu.test.tsx
# EXPECT: 4 failed | 42 passed (46), the failures exactly the four new cases.

# 2. After the fix, the same two files
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/preview-card.test.tsx src/behaviour/navigation-menu.test.tsx
# EXPECT: 46 passed (46) — plus the recorded plan-540 failures in these files,
# if any (they were 0 here on 2026-10-20).

# 3. The pure suite
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0; 495 tests in 47 files (493 + hover's 2).

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 4 more passing than the baseline measured this turn (plan 759's
# baseline is 957 passed / 20 failed of 977), i.e. 961 passed / 20 failed of
# 981, with the same 20 recorded plan-540 failures. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Delete `src/behaviour/zz-probe.test.tsx` before the first commit. Record the
exact totals in this plan's status row, `TODO.md` and the README index.

## 5. STOP conditions

- Any of the four new native cases passes at `HEAD`. Stop and re-measure: a test
  that cannot fail is not evidence.
- A new native case fails for an unrelated reason (for example the card/panel is
  never shown). Stop; the fixture layout is wrong, not the fix.
- `hoverDelay` changes the explicit `0` behaviour (a `0` delay stops opening
  immediately). Stop; the normaliser must leave `0` alone.
- A submenu's hover timing changes. Stop; `menu/sub.tsx` passes constants and must
  not be touched.
- Any other preview-card or navigation-menu report changes, or a full-suite
  failure appears outside the recorded plan-540 classes. Stop and record it.
- `763` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- A non-finite `openDelay` / `closeDelay` on `PreviewCard` or `NavigationMenu`
  falls back to that component's documented default; `0` and negative values keep
  meaning "no delay".
- The four new native cases fail on the old source and pass after, each stated
  with the bug it guards.
- The pure helper test covers `NaN`, `Infinity`, a finite value and `0`.
- `docs/preview-card.mdx`, `docs/navigation-menu.mdx`, `COMPONENTS.md` and the
  inventory agree with the suites' counts; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
