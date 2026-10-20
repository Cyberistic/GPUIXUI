# 707 — The diff's word-level wash, in pixels

**Status:** landed (2026-10-20) · **Phase:** F · **Workstream:** playground
**Depends on:** `648` (the diff interaction contract), `674`/`676` (the frame
sampler), `690`/`697`/`701` (a captured frame as a colour assertion source),
`197` (the live renderer is the observation surface).
**Owns:** `apps/playground/src/scenarios/{diff.tsx,word-wash.ts,
word-wash.test.ts}`, `apps/playground/src/live/scenarios.tsx`.

## 1. Why this plan exists

Plan `648` measured every other `<diff>` prop, but left one contract as
screenshot evidence:

> `wordDiff` paints a wash (screenshot-only).

`COMPONENTS.md` (Diff viewer row) and `PLAN.md` D92 say the same. The wash is
the runtime's only sub-line emphasis: it paints a 28 % tint of `diff_add` /
`diff_del` under just the changed token, which is what makes a one-character
edit visible. Plans `674`–`701` made a decoded PNG a first-class assertion
source, so this last named colour gap is closable without a new host verb.

The contract has a consumer consequence: the tint is the **runtime's own**
`theme.diff_add` / `theme.diff_del` (`oklch(0.765, 0.177, 163.223)` /
`oklch(0.704, 0.191, 22.216)` in the dark palette), **not** the library's
`success`/`destructive` tokens, and it is composited over the row's 5.5 % row
tint. A consumer cannot recolour it; this plan proves the runtime's direction
(green for added, red for removed) rather than inventing a token claim.

## 2. Measured premises

These were read from the pinned runtime source
(`~/GPUIXUI/references/gpuix/packages/native/src/custom_elements/diff.rs:797`
and `theme.rs:493`/`516`) and are re-measured in §5 step 1 before any assertion
is written:

1. The wash is `window.paint_quad` under only `line.word_ranges`, with
   `tint.a = 0.28`; the tint is `theme.diff_add` for an added line and
   `theme.diff_del` otherwise. It is therefore **range-limited**: most of the
   row, and every context row, keeps its own background.
2. `range_rects(layout, range, 1.0, 1.5)` insets the rect 1.5 px vertically
   inside the line box, so the first painted row of the wash is glyph-free;
   the changed token is a digit (`2` → `3`), so the run is ~6 px wide at
   `font_size 11`.
3. Row geometry is the one plan `648` measured: file header 36 px, hunk 28 px,
   line 21 px (`FULL_HEIGHT = 354`). In `APP_PATCH` the changed rows are line
   index 1 (`-const b = 2;`) and 2 (`+const b = 3;`) after the first file
   header and hunk.
4. Both hosts reproduce the same frame scale (`2`) and the same static layout
   (plans `674`, `701`). The offscreen frame and the live frame therefore use
   the same finder; only the reader differs.
5. A "changed run" is detectable without knowing the exact blend: the
   before/after frames differ only under the wash, so a horizontal run of
   ≥ 3 logical pixels with a uniform `before` background and a per-channel
   delta is the wash. A glyph pixel is unchanged between the two frames, so it
   cannot be part of a run.

**STOP if premise 1 or 3 is false** (e.g. the wash covers the row, or the row
metrics moved): report the measured geometry instead of loosening the checks.

## 3. Files

Create:

- `apps/playground/src/scenarios/word-wash.ts` — the pure run finder.
- `apps/playground/src/scenarios/word-wash.test.ts` — 6 tests.

Change:

- `apps/playground/src/scenarios/diff.tsx` — export the row metrics helper,
  add `wordWashChecks`, and call it from `diff-surface` step 7.
- `apps/playground/src/live/scenarios.tsx` — call the same checks from
  `live-diff`, and keep the word-diff frame as the run artifact.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`,
  `.agents/slop/plans/README.md`.

Do **not** change registry ids (`diff-surface`, `live-diff`) or their
capabilities (`diff`).

## 4. Steps

### 4.1 The pure finder

`word-wash.ts` (JSDoc every export, EF-11):

```ts
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** A logical row band in window coordinates. */
export interface RowBand {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One horizontal run that changed between two frames. */
export interface WashRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly before: Pixels.Rgba;
  readonly after: Pixels.Rgba;
}

/** Per-channel change `after - before`. */
export const channelDeltas = (before: Pixels.Rgba, after: Pixels.Rgba) => ({
  r: after.r - before.r,
  g: after.g - before.g,
  b: after.b - before.b,
});

/**
 * The widest horizontal run inside `row` whose pixels changed between the two
 * frames while sitting on one uniform background.
 *
 * A glyph pixel is identical in both frames, so only the wash can form a run;
 * requiring the `before` samples to agree rejects an edge that happens to sit
 * on anti-aliased ink. `None` when no run reaches `minWidth`.
 *
 * Both frames must be the same size; the caller has already captured them from
 * one window.
 */
export const findWashRun = (
  before: Pixels.Pixels,
  after: Pixels.Pixels,
  window: Pixels.FrameSize,
  row: RowBand,
  options: { readonly minWidth?: number; readonly minDelta?: number } = {},
): Option.Option<WashRun>;
```

Implementation rules:

- `minWidth` defaults to `3`, `minDelta` (sum of absolute channel deltas,
  alpha ignored) to `9`.
- Iterate logical `y` from `row.y` to `row.y + row.height - 1`, logical `x`
  from `row.x` to `row.x + row.width - 1`; map each point with
  `Pixels.framePoint` and read both frames with `Pixels.pixelAt`. A point that
  maps outside either frame is not part of a run.
- A pixel is changed when `|Δr| + |Δg| + |Δb| >= minDelta`.
- Build maximal consecutive changed runs. Keep a run only when every `before`
  sample is within `2` of the run's first `before` sample (uniform row
  background). Return the widest kept run as `WashRun` (`x`/`y` = its first
  pixel, `width` = its logical length, `before`/`after` = its middle sample).
- Choose the widest run across the whole band, not the first one.
- No `throw`, no `any`, no native `Math.max` chains in domain code where `Arr`
  reads better.

### 4.2 The finder's tests

`word-wash.test.ts` builds two tiny frames with an explicit painter — the
fixture *is* the input, and each test asserts a property of the answer, not the
fixture back:

1. A 4 px run of `#1A1A1A → #2E5A2E` on a uniform `#101010` row is found at
   its `(x, y)` with `width 4`, and the reported colours are those two pixels.
2. Two frames with no difference return `None`.
3. A single changed pixel is below `minWidth` (3) and returns `None`.
4. A run whose `before` pixels alternate `#101010`/`#303030` is rejected — the
   changed span sits on ink, not on a uniform background.
5. Two runs on one row (`3 px` at x 2, `7 px` at x 12) return the wider one.
6. A frame at device scale 2 (`40 × 40` for a `20 × 20` window) is sampled at
   logical coordinates: the run at logical x 6 is found at 6, not 12.

Every test must be able to fail: no assertion compares a variable with itself,
and no expected colour is computed by the code under test.

### 4.3 The shared checks

In `diff.tsx`, export:

```ts
/** The metrics plan 648 measured, so a checks helper can name a row. */
export const diffRowBand = (
  box: Smoke.Bounds,
  lineIndex: number,
): RowBand => ({
  x: box.x + 40,
  y: box.y + HEADER + HUNK + lineIndex * LINE,
  width: box.width - 48,
  height: LINE,
});
```

`+40` starts after the accent bar, gutters and marker; `-48` keeps the sample
inside the surface. The checks take the frames and the box:

```ts
export const wordWashChecks = <E,>(
  ctx: Pick<Smoke.SmokeContext, "check" | "expectSome" | "expectEqual">,
  reader: FrameReader<E>,
  off: Pixels.Pixels,
  on: Pixels.Pixels,
  box: Smoke.Bounds,
): Effect.Effect<void, Smoke.SmokeAssertionError | E>;
```

Checks (each through `ctx.check`/`expectSome`, so a failure names itself):

1. `"the added line paints a word wash"` — `findWashRun(off, on, window,
   diffRowBand(box, 2))` is `Some`.
2. `"the added wash is a token, not the row"` — its `width` is `<= 40` and
   `>= 3`.
3. `"the added wash is green-dominant"` — `Δg > Δr` and `Δg > Δb`.
4. `"the removed line paints a word wash"` — row 1 is `Some`.
5. `"the removed wash is red-dominant"` — `Δr > Δg` and `Δr > Δb`.
6. `"a context row keeps its background"` — row 0 and row 3 are `None`.
7. `"the wash does not cover the line"` — the added run's `x + width` is less
   than `box.x + box.width / 2`.

### 4.4 Wiring both heads

`diff-surface`, in step 7 before the `diff-word` press:

```ts
const offFrame = yield* captureHeadless(ctx.host);
press(ctx, "diff-word");
const onFrame = yield* captureHeadless(ctx.host);
yield* wordWashChecks(ctx, readSync(ctx.host), offFrame, onFrame, beforeWordBox);
```

(`captureHeadless` already forces a paint; the existing geometric asserts stay
after the wash is on.)

`live-diff`: after the scroll step, reset, capture the off frame, press
`diff-word`, wait for `word=1`, capture the **on** frame to
`${LIVE_ARTIFACTS}/${liveDiff.id}.png` (the artifact now shows the wash), then
call the same checks with `readAsync(ctx.host)`. The existing geometric checks
for `word` (none live) are not duplicated; the frame is the live evidence.

### 4.5 Ledgers

- `COMPONENTS.md` Diff viewer: replace "`wordDiff` is a wash and stays
  screenshot evidence" with the measured pixel direction and the check counts.
- `apps/playground/README.md`: the `live-diff` row gains the wash pixels; keep
  the registry totals unchanged (no new ids).
- `TODO.md`: one ticked playground task naming plan `707`, the exact ids and
  the check counts; no progress-bar change (120/120 stays).
- `.agents/slop/plans/README.md`: this row, status `landed` with the measured
  counts.
- `PLAN.md` D92: replace the screenshot-only clause with the measured fact.

## 5. Test plan

1. **Premise check (before writing assertions).** Build, then run
   `nub apps/playground/dist/smoke/run.js --only diff-surface` with a temporary
   console-free dump of the first found run (or inspect the captured frames at
   `.artifacts/screenshots/diff-surface.png`). Confirm: a run exists on rows 1
   and 2, its width is 4–12 logical px, and rows 0/3 have none. If not, STOP
   and report the measured geometry.
2. `nub run --filter playground test` — `word-wash.test.ts` (6) joins the
   suite; expect the playground count to grow by exactly 6.
3. `nub run --filter playground build`.
4. `nub apps/playground/dist/smoke/run.js --only diff-surface` — exit `0`;
   record the new check count (previous `diff-surface` count is in
   `apps/playground/.artifacts/smoke-report.json`).
5. `nub apps/playground/dist/live/run.js --only live-diff` — exit `0`; record
   the new check count and confirm the artifact PNG shows the wash.
6. `nub run check`, `nub run lint`, `nub run test`.

### Mutation proofs (observe, revert, record)

- **M1** pass `wordDiff={false}` while leaving the toggle state on → both new
  frames are identical → checks 1 and 4 fail (`exit 1`).
- **M2** key the off frame *after* the press (capture on, press, capture on) →
  no run; fails. Proves the check reads the difference, not a fixed colour.
- **M3** swap `diff_add`/`diff_del` in the check's dominance rule → checks 3
  and 5 fail, proving the direction assertion is live.
- **M4** widen `diffRowBand` to the full row width and require a run wider
  than 40 → check 2 fails, proving the "token, not the row" claim.

## 6. Expected results

- Headless and live each gain the seven checks above; no new registry id, no
  new capability.
- The `word-wash` finder's tests fail if the run detection, the uniformity
  guard, the widest-run choice or the device-scale mapping is wrong.
- A frame that paints no wash must fail by name, never pass silently.

## 7. STOP conditions

- A run cannot be found on a frame that visibly paints the wash (the sampler
  or the row band is wrong) — stop and report the frame, not a looser band.
- The wash covers the whole row or a context row — the runtime changed; report
  it and update `PLAN.md`/`COMPONENTS.md` instead of asserting the new
  behaviour here.
- The live and headless directions disagree — record both frames; do not average
  the rule.
- `nub run check` or `lint` fails for a reason outside this plan's files — stop
  and name the owner.

## 8. Acceptance

- `wordDiff`'s tint direction and range are asserted from a decoded frame in
  both hosts.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, `PLAN.md` D92 and
  the plan index state the measured result and the exact scenario ids run.
- No full live suite is run; the merge gate is a separate plan (the owner's
  promotion step), and the focused ids are recorded.

## 9. Landed — what was measured

**The finder.** `word-wash.ts` follows §4.1 exactly: maximal runs of
consecutive changed columns on a uniform background, the widest run reported,
and the sample with the strongest delta supplies `before`/`after`. The
contiguous rule is measured, not assumed — the changed token's run is 10 px and
unbroken on the real frame, so no glyph-gap heuristic is needed (a future
runtime that splits the run should fail by name rather than be papered over).
Two Effect v4 details had to be corrected during implementation and are worth
copying: `Arr.filterMap` takes a **`Result`**, not an `Option` (an
`Option`-returning callback silently yields `[]`), and `Option.flatMap` is not
`Option.map` — the first version returned `None` for every run. Both were caught
by the six tests, which initially failed exactly as they should.

**The unit tests.** `word-wash.test.ts` is 6 tests, all green; playground
**446 → 452**.

**Headless (`--only diff-surface`).** **70 → 77 checks** (+7), exit `0`:
the added row's run is `x=186 y=452 width=10` logical px (from M4's failure
message), the added deltas are `r=-2 g=55 b=37` and the removed deltas are
`r=66 g=25 b=26` (from the M3 failures), both context rows report no run, and
the run ends well before the surface's midpoint.

**Live (`--only live-diff`).** **24 → 31 checks** (+7), exit `0`. The on frame
is also the run artifact (`apps/playground/.artifacts/live/live-diff.png`), so
the published screenshot now shows the wash.

**Mutation proofs** (headless, each observed, reverted, `exit 1`):

- **M1** `wordDiff={false}` with the toggle state on → `the added line paints a
  word wash: expected a value, got none`.
- **M2** the off frame captured after the press → the same failure, proving the
  check reads the difference rather than a fixed colour.
- **M3** the added dominance inverted → `the added wash is green-dominant:
  expected true, got deltas r=-2 g=55 b=37`.
- **M3b** the removed dominance inverted → `the removed wash is red-dominant:
  expected true, got deltas r=66 g=25 b=26`.
- **M4** the token-width rule tightened to `> 40` → `the added wash is a token,
  not the row: expected true, got x=186 y=452 width=10`.

**Ledgers.** `COMPONENTS.md` Diff viewer (inventory row + limits row),
`apps/playground/README.md` (the `wordDiff` prop row, the live paragraph and
the `live-diff` table row), `PLAN.md` D92, `TODO.md` and the plan index all
carry the measured direction, extent and check counts. No registry id or
capability changed; the full live suite was not run (merge gate). The
end-of-task full headless registry is **106/106** (**3872** checks, 65
capabilities), exit `0` — the plan-`702` total plus these seven checks.
