# 718 — Popover: turning round inside the panel must not end the walk

**Owner:** components workstream · **Phase:** F (overlay keyboard) ·
**Depends on:** 110, 112, 117, 200, 201, 323, 326, 327, 521, 583, 704

**Numbering:** `716`/`717` are claimed by the tokens-theme worktree
(`716-highlight-figures`, `717-jsdoc-figures`); `718` is the first number free
across every worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. What is measured today

`PopoverContent` moves focus to the panel's first tab stop on open, lets `Tab`
walk the panel's own stops, and closes only when the walk reaches an end
(plan 521). The walk is remembered as two “ever visited” lists, one per
direction.

That makes a *turn* look like a wrap. With three controls (`first`, `second`,
`third`), from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/popover.test.tsx --reporter=verbose
# scratch probe, same fixture as `Columns` in the suite:
#   open -> first, Tab -> second, Shift+Tab -> first, Tab
#   expected Some("second"), received Some("elsewhere")
#   the panel is gone
```

The third `Tab` moves forward from `first` to `second` — a control the user
reached on the way out — and `Arr.contains(visitedForward, "second")` reads it
as a wrap, so the popover closes with `third` unvisited and focus handed to the
app control after the trigger. The user cannot walk the panel forward after
stepping back once.

The same list shape makes the mirrored case latent: once the forward close is
fixed, a `Tab` followed by two `Shift+Tab`s would read the return to `first` as
a backward wrap for the same reason.

## 2. The decision

**A wrap is a revisit within the current direction of travel, not a revisit
since the panel opened.** Replace the two “ever visited” lists with one walk:

- `{ backwards, stops }` — the stops walked since the walk last changed
  direction, in order;
- a backward move resets the walk to that stop; a forward move after it starts a
  new walk too;
- forward closes on the seeded first stop (a real wrap of the stop cycle) or on
  a stop this walk already passed; backward closes before the first stop or on a
  stop this walk already passed.

The stale-first-stop rule from plan 521 is preserved: if the seeded first stop
is removed while open, the walk still terminates by revisiting a stop it
already covered (measured: one extra `Tab`, never a trap).

## 3. Exact changes

### 3.1 `packages/components/src/popover.tsx`

1. Replace the two refs and their comment:

   ```ts
   /**
    * The stops walked since the walk last changed direction, and that
    * direction. Arriving at a stop this walk already passed is a wrap and
    * closes the popover; the list, not a control's identity, keeps a content
    * change from trapping the user. Turning round starts a new walk, so a stop
    * the user stepped back over is reachable again (plan 718).
    */
   const walk = useRef<{
     readonly backwards: boolean;
     readonly stops: ReadonlyArray<number>;
   }>({ backwards: false, stops: [] });
   ```

2. On open (the existing `useLayoutEffect`), seed one walk instead of two
   lists:

   ```ts
   walk.current = {
     backwards: false,
     stops: first === null ? [] : [first],
   };
   ```

3. Rewrite `handleTab`'s two success paths and its backward guard:

   - backward guard gains the direction check:
     ```ts
     const backwardsWalk =
       walk.current.backwards &&
       Arr.contains(walk.current.stops, previous);
     ```
     and closes when `backwardsWalk` is true (alongside the existing
     null/self/outside cases).
   - a successful backward move records:
     ```ts
     walk.current = {
       backwards: true,
       stops: walk.current.backwards
         ? Arr.append(walk.current.stops, previous)
         : [previous],
     };
     ```
   - the forward guard becomes:
     ```ts
     const revisited =
       (!walk.current.backwards &&
         Arr.contains(walk.current.stops, next)) ||
       next === first;
     ```
   - a successful forward move records the same shape with `backwards: false`.

   The `first === null` branch (`autoFocus={false}`) seeds
   `{ backwards: false, stops: [next] }`.

### 3.2 `packages/components/src/behaviour/popover.test.tsx`

Two new cases on the existing `Columns` fixture:

1. **“walks forward again after a step back”** (fails at `HEAD`): open →
   `Tab` (`second`) → `Shift+Tab` (`first`) → `Tab` (`second`, panel open) →
   `Tab` (`third`, panel open) → `Tab` (closes, focus `elsewhere`).
2. **“leaves before the first control after turning round”** (a pin): open →
   `Tab` → `Tab` (`third`) → `Shift+Tab` → `Shift+Tab` (`first`, panel open) →
   `Shift+Tab` (closes, focus `before`).

Also update the file header's guarded-bug list with the early close.

### 3.3 Docs, inventory and counts

- `packages/components/docs/popover.mdx`: the keyboard bullet says the walk
  “closes only at either end” and that a step back does not end it; bump the
  Verification count.
- `COMPONENTS.md`, Popovers row: `22 native behaviour tests` → `24`, and the
  sentence now says a walk that turns round continues.
- `TODO.md`: tick the plan-718 row under Tier 2 hardening.
- `.agents/slop/plans/README.md`: index this plan.
- `PLAN.md` D30: record `718` as claimed.

## 4. Test plan

- **Can the test fail?** Case 1 fails at `HEAD` (measured above: focus
  `elsewhere`, panel unmounted) and passes with the fix; the pin passes in both
  states, as a regression pin should.
- **Both-direction proof (measured on this host):**
  (a) with the old two-list guard restored (`git stash` of `src/popover.tsx`),
  case 1 fails (`Some("elsewhere")`);
  (b) deleting the `next === first` clause makes case 1 fail again (a forward
  wrap after a turn lands on the seeded first stop, which is not in the new
  walk);
  (c) deleting the `Arr.contains` clause makes “closes instead of trapping when
  the first tab stop is removed” fail (a vanished first stop no longer ends the
  walk);
  (d) each run still reports the same three pre-existing placement failures
  (plan 540), so no other case changes result.
- **No regression:** 21 of 24 pass; the three failures are the recorded
  plan-540 box-convention placement cases, present at `HEAD` too.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/popover.test.tsx --disableConsoleIntercept --reporter=verbose
# before (HEAD + the new cases): 4 failed | 20 passed (24)
#   the new case 1 plus the three recorded placement cases
# after: 3 failed | 21 passed (24)
#   only the three plan-540 placement cases: "opens below its trigger",
#   "centres a requested panel" and "opens above a trigger near the window
#   bottom"; they fail at HEAD too

nub run check-types
nub run test        # unit suite, no native binding needed
```

Measured after the change, from the repo root: `nub run check` and
`nub run lint` exit 0; `nub run test` is 485 unit tests in 46 files.

```sh
nub run check
nub run lint
nub run --filter @gpuixui/components test:behaviour
# the full native suite is the merge gate; HEAD was 885 passed / 28 failed of
# 913 (plan 715) with the recorded plan-540 binding failures. This change is
# scoped to Popover, so only its suite was re-run; the merge run must read its
# own totals.
```

## 6. STOP conditions

- Case 1 does not fail against `HEAD`: stop and re-measure; do not weaken the
  assertion.
- The stale-first-stop case (521) starts passing by trapping instead of
  closing: stop — the walk must still terminate.
- Any placement/dismiss case changes result: stop and report which.
- The guard needs a second ref or a timer: stop; the fix is one direction-aware
  walk.

## 7. Acceptance

- After any number of direction changes, `Tab` and `Shift+Tab` still walk every
  stop of the panel once and close only at an end.
- A removed or vanished first stop still closes instead of trapping.
- Popover is 21 of 24 on this host — every remaining failure is one of the
  recorded plan-540 placement cases; docs, `COMPONENTS.md`, `TODO.md`, the plan
  index and `PLAN.md` D30 agree.
