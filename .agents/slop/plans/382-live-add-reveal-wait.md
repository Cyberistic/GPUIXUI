# 382 — `live-query-builder`: wait for the appended row's reveal

**Status:** planned 2026-10-18 · **Phase:** F · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `378`, `189`, `345`.

## 1. Why this plan exists

`live-query-builder` failed once in a full live run with:

```text
the live appended row sits at the strip's bottom: expected 181 ± 2, got 221
```

`221` is the appended 40 px row's bottom edge with its top at `181` — the strip's
bottom edge. The row was appended (`rules=4` was already true) but the reveal had
not run yet: plan `378` §8 measured that the reveal is a **post-commit effect**
(`scrollIntoView` + focus) because the appended node does not exist in the click
handler, and under load the effect and the paint can land after the state text
the step waits for. The assertion reads bounds immediately after
`waitForText("rules=4")`, so it races the effect.

A second full run passed, so the probe is correct and the **test** is racy. The
fix must not weaken the assertion: a missing reveal has to fail.

## 2. What changes

Only the live step, in `apps/playground/src/live/scenarios.tsx`:

- add a bounded `waitForBounds(ctx, testId, predicate)` helper (retry every
  50 ms up to 3 s, like `waitForText`/`waitForAnchor`), reading
  `ctx.host.bounds`;
- before the assertion, read the strip's box and wait until the appended row's
  **bottom edge is inside the strip** (`row.y + row.height <= strip.y + strip.height + 2`);
- keep the existing `expectNear` against the strip's bottom edge unchanged.

No component, plan `378` scenario or check label changes. No new check is added,
so the counts stay `36/36` live (`678`).

## 3. Files

Change:

- `apps/playground/src/live/scenarios.tsx` — the helper and the one step.
- `TODO.md` — tick the flake task with the evidence.
- `apps/playground/README.md` — one sentence in the query-builder section.
- `.agents/slop/plans/README.md` — add this row; the next playground plan takes
  `383`.

## 4. Steps

1. Add `waitForBounds` next to `waitForAnchor` in `live/scenarios.tsx`:

   ```ts
   const waitForBounds = (
     ctx: LiveContext,
     testId: string,
     within: (box: Smoke.Bounds) => boolean,
   ) =>
     ctx.host.bounds(testId).pipe(
       Effect.flatMap((box) =>
         box !== null && within(box) ? Effect.void : Effect.fail("not yet"),
       ),
       Effect.retry(
         Schedule.spaced("50 millis").pipe(
           Schedule.upTo({ duration: "3 seconds" }),
         ),
       ),
       Effect.orElseSucceed(() => undefined),
     );
   ```

2. In the append block, replace the immediate reads with:

   ```ts
   const scrolledStrip = yield* boxOf(ctx, "qb-rules");
   yield* waitForBounds(
     ctx,
     "qb-rule-3",
     (box) => box.y + box.height <= scrolledStrip.y + scrolledStrip.height + 2,
   );
   const revealed = yield* boxOf(ctx, "qb-rule-3");
   ```

   The assertion itself is unchanged.
3. Run:

   ```sh
   nub run --filter playground check-types
   nub run --filter playground build
   nub run --filter playground smoke:live
   ```

   Expected: `36/36`, exit `0`, `query=verified`. Run it twice.
4. Two-direction proof: temporarily remove the reveal effect from
   `query-builder.tsx` (the `scrollIntoView` call). The bounded wait must time
   out and the same assertion must fail; restore.
5. Run `nub run check`, `nub run lint`, `nub run test`; all exit `0`.

## 5. STOP conditions

- **The wait never satisfies while the reveal works.** Read the two boxes after
  the wait and record them; the reveal target or the strip box is different from
  §1. Amend the predicate, do not widen the final tolerance.
- **The row is not painted at all after three seconds.** That is a real reveal
  failure, not the race: stop and treat it as a component defect with a new
  `TODO.md` task.
- **Removing the reveal effect still passes.** The wait is masking the defect;
  stop and rework it.

## 6. Test plan

- The failing assertion can still fail: with the reveal effect removed, the wait
  times out and `the live appended row sits at the strip's bottom` reports the
  measured `221` against `181 ± 2`.
- Two consecutive green full live runs prove the wait closes the race.
- Gates green.

## 7. Measured results

Run on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| two full live runs with the wait | `36/36`, exit `0`, `query=verified` (checks unchanged at `678`) |
| reveal removed from `query-builder.tsx` | `the live appended row sits at the strip's bottom: expected 181 ± 2, got 221` — the wait timed out and the real assertion failed, so it does not mask the defect |

The flake was observed once on the **notification-centre** full run before the
fix (the same `221 vs 181`), and not again in two consecutive full runs after
it. The wait is 3 s with a 50 ms poll: the reveal lands in the first frame in a
healthy run; a missing reveal costs the timeout and the same failure.


## 8. Acceptance

- The helper and the step change, no widened tolerance, no new check.
- Two green full live runs; the reveal-removal mutation fails.
- Gates exit `0`; `TODO.md` and the README note.
