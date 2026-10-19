# Plan 677 — A malformed toast cap must not remove the queue bound

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 115, 117, 123, 124, 322, 338, 370, 548, 592, 651 |
| Status | **done** — a finite cap truncates and floors at 1; a non-finite cap keeps the default 3; 2 store cases fail at `HEAD` and pass after (store 24/24), native Toast 20/20 |
| Claimed number | `677` — every number through `676` is claimed across the worktrees; `677` is the first free one, checked on 2026-10-19 and recorded in `PLAN.md` D30 |

## 0. Why this plan exists

`ToastProvider` documents a **bounded** queue: `max` is "toasts kept before the
oldest is dropped", default `3`, and `docs/toast.mdx` calls the viewport "a
bounded, auto-dismissing notification stack". The store computes that bound with:

```ts
// src/toast/store.ts
const max = Math.max(1, Math.trunc(options?.max ?? DEFAULT_MAX));
```

`Math.max` propagates `NaN`, so `max: Number.NaN` leaves `max` as `NaN`. The
overflow then becomes `Math.max(0, length - NaN)`, also `NaN`; `Arr.take` with
`NaN` yields nothing while `Arr.drop(appended, NaN)` yields every row. The cap is
silently **removed**, and the queue grows without bound. `Infinity` takes the
same path (`length - Infinity` is `-Infinity`, clamped to `0`), so an infinite
cap also means "keep everything".

A malformed value can arrive from configuration or a computed setting, which is
exactly the class of defect plans 649–662 fixed for the other numeric props: a
caller error must not turn a documented bound into unbounded memory growth.

Measured in this worktree on 2026-10-19 with the real store:

```text
max = NaN        push 5 → ids ["1","2","3","4","5"]   (expected the last 3)
max = Infinity   push 5 → ids ["1","2","3","4","5"]   (expected the last 3)
max = 2          push 5 → ids ["4","5"]
max = 0          push 5 → ids ["5"]
```

`max = 2` and `max = 0` already behave as documented; only the non-finite path
is wrong. The measurement command used was:

```sh
cd packages/components
nub -e "(async()=>{
  const {Effect}=await import('effect');
  const Arr=await import('effect/Array');
  const Duration=await import('effect/Duration');
  const {ToastStore,layer}=await import('./src/toast/store.ts');
  const run=(max)=>{const body=Effect.gen(function*(){
    const s=yield* ToastStore;
    for(let i=0;i<5;i++) yield* s.push({title:'t'+i,duration:Duration.infinity});
    const ts=yield* s.toasts;
    return Arr.map(ts,t=>t.id);
  }); return body.pipe(Effect.provide(layer({max})));};
  for (const m of [NaN, Infinity, 2, 0]) console.log(String(m), await Effect.runPromise(run(m)));
})()"
```

## 1. The rule

A queue cap is a **safety bound**, not a display window. For the toast store:

- a **finite** `max` is truncated to a whole number and floored at `1` (a queue
  always keeps at least the newest toast);
- a **non-finite** `max` (`NaN`, `±Infinity`) is the documented default `3`,
  never "unbounded";
- an absent `max` is the default `3` (unchanged).

This deliberately does **not** reuse `wholeCap`: that helper treats a non-finite
bound as "no bound", which is right for a display window (Pagination siblings,
Mention rows, Command-menu recents) and wrong for a queue that must stay
bounded. A caller who genuinely wants an unbounded history needs a data store,
not a notification stack; no such flag is added here.

## 2. Exact files to change

1. `packages/components/src/toast/store.ts` — normalise `max` with a finite
   guard and a fallback to `DEFAULT_MAX`; update the option's doc comment to
   state the rule.
2. `packages/components/src/toast/store.test.ts` — two unit cases (`NaN` and
   `Infinity`) that push four persistent toasts with the default bound and
   expect the newest three; a header comment states the bug they guard.
3. `packages/components/docs/toast.mdx` — the "stack size" row gains the
   normalisation rule, the `max` API row names the fallback, and the store
   verification bullet names the two cases.
4. `COMPONENTS.md` — the Toasts row: `22 store cases` → `24 store cases` and a
   clause recording the malformed-cap rule.
5. `TODO.md` — one ticked Tier 2 hardening item.
6. `.agents/slop/plans/README.md` — the index row `677`.
7. `PLAN.md` D30 — record `677` as the number this plan claimed.

No behaviour test changes: the defect is in the Effect store's queue arithmetic,
which is exactly what `store.test.ts` owns; the native Toast suite is run to
prove the component path is unchanged.

## 3. Implementation

### 3.1 `src/toast/store.ts`

Replace the one-line computation with an explicit rule (keep it next to
`DEFAULT_MAX`/`DEFAULT_DURATION`):

```ts
const DEFAULT_MAX = 3;
const DEFAULT_DURATION = Duration.seconds(5);

/** A finite cap is whole and at least one; a malformed one is the default. */
const queueMax = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_MAX;
  return Math.max(1, Math.trunc(value));
};
```

and use:

```ts
const max = queueMax(options?.max);
```

Update the `ToastStoreOptions.max` comment:

```ts
/**
 * Toasts kept before the oldest is dropped. Default 3. A finite value is
 * truncated and floored at 1; a non-finite one keeps the default, because a
 * malformed cap must never make the queue unbounded.
 */
readonly max?: number;
```

Do **not** change the overflow logic (`Arr.append`, `Arr.take`, `Arr.drop`): it
is correct for every finite `max` and is already covered by the existing
`max: 2` case.

### 3.2 `src/toast/store.test.ts`

Add after the existing `"keeps the newest toasts and drops the oldest beyond
max"` case. `persistent` (`{ title: "Sticky", duration: Duration.infinity }`)
and `withStore` are already defined in the file; add no imports.

```ts
/**
 * The bug these guard (plan 677): `max` went through `Math.max(1, Math.trunc(…))`,
 * which propagates NaN, so a malformed cap made the overflow NaN and the queue
 * unbounded — the opposite of the documented bound. A queue cap is a safety
 * bound, so a non-finite value keeps the default 3.
 */
it.effect("keeps the default bound when max is NaN", () =>
  withStore(
    Effect.gen(function* () {
      const store = yield* ToastStore;
      yield* store.push(persistent);
      yield* store.push(persistent);
      yield* store.push(persistent);
      yield* store.push(persistent);

      expect(ids(yield* store.toasts)).toEqual(["2", "3", "4"]);
    }),
    { max: Number.NaN },
  ),
);

it.effect("keeps the default bound when max is infinite", () =>
  withStore(
    Effect.gen(function* () {
      const store = yield* ToastStore;
      yield* store.push(persistent);
      yield* store.push(persistent);
      yield* store.push(persistent);
      yield* store.push(persistent);

      expect(ids(yield* store.toasts)).toEqual(["2", "3", "4"]);
    }),
    { max: Number.POSITIVE_INFINITY },
  ),
);
```

Each case must fail **alone** at `HEAD`: the old queue keeps `["1","2","3","4"]`.
Do not weaken the assertion to `length <= 4`; the point is the exact newest
three.

### 3.3 Docs and inventory

`docs/toast.mdx` behaviour table, replace the stack-size row's value with:

```text
| stack size | 3 by default (`max`); a finite cap is truncated and floored at 1, and a non-finite one keeps the default instead of removing the bound |
```

API row:

```text
`max?: number` (default `3`; a non-finite value is the default)
```

Store verification bullet (first bullet under `## Verification`), append:

```text
… and the malformed-cap guard (`NaN` and `Infinity` each keep the newest three).
```

`COMPONENTS.md`, Toasts row: change `22 store cases` to `24 store cases`, and
add after the progress sentence:

```text
A finite `max` truncates and floors at 1; a non-finite one keeps the default
bound, because a malformed cap must not make the queue unbounded (plan 677).
```

## 4. Test plan

From `packages/components`:

```sh
# 1. Write the two cases first and run them against the current store.
#    Expected: 2 failed, 22 passed — each failure shows ["1","2","3","4"].
nub exec vitest run src/toast/store.test.ts

# 2. Apply §3.1 only; the same command must be 24/24.
nub exec vitest run src/toast/store.test.ts

# 3. The component path is unchanged: the native Toast suite stays 20/20.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/toast.test.tsx

# 4. Package and workspace gates.
nub run --filter @gpuixui/components test
nub run test
nub run check
nub run lint
```

Both-direction proof:

- With only `src/toast/store.ts` reverted (`git stash push -- src/toast/store.ts`
  or `git checkout HEAD~ -- src/toast/store.ts` in a scratch copy), both new
  cases fail; restoring the fix passes 24/24.
- Reverting only one of the two cases must still leave the other meaningful:
  `NaN` and `Infinity` take different arithmetic paths into `NaN`/`Infinity`, so
  keep both.

## 5. STOP conditions

- Either new case passes at `HEAD` after the test is added: stop — the measured
  premise no longer holds.
- Any existing store case changes verdict: stop and name it. In particular the
  existing `max: 2` case must keep returning `["2","3"]`.
- The Toast behaviour suite drops below 20 passing: stop and name the case; this
  change must not touch the render path.
- A test needs a new dependency, a clock change or a native fixture: stop — the
  defect is pure queue arithmetic.
- The fix appears to need a change outside `packages/components` (for example a
  new `wholeCap` mode): stop and report; do not widen a shared display helper
  for a queue-only rule.

## 6. Acceptance

- `max: Number.NaN` and `max: Number.POSITIVE_INFINITY` each keep the newest
  three toasts, not all of them.
- A finite `max` is still truncated and floored at 1; `max: 2` and `max: 0`
  behave exactly as before.
- `src/toast/store.test.ts` is 24/24; the Toast behaviour suite is 20/20; the
  unit suite and the docs-count check are green.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- `docs/toast.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan
  index agree.
- One commit: `fix(components): a malformed toast cap keeps the default bound (677)`.

## 7. Results

- `src/toast/store.ts`: `queueMax` returns `DEFAULT_MAX` for an absent or
  non-finite value and otherwise `Math.max(1, Math.trunc(value))`; `max` is
  computed through it. The option's doc comment states the rule.
- `src/toast/store.test.ts`: two cases push four persistent toasts with
  `max: NaN` and `max: Infinity` and expect `["2","3","4"]`. Both failed at
  `HEAD` with `expected [ '1', '2', '3', '4' ] to deeply equal [ '2', '3', '4' ]`
  (2 failed, 22 passed); after the fix the file is 24/24.
- Native Toast suite unchanged: 20/20.
- Docs: `docs/toast.mdx` stack-size row, `max` API row and store verification
  bullet; `COMPONENTS.md` Toasts row (`22 → 24` store cases plus the rule);
  `TODO.md` ticked; `PLAN.md` D30 and the plan index synced.
- Gates: `nub run --filter @gpuixui/components test` 476/476 (46 files),
  `nub run test` exit `0` (all workspaces), `nub run check` exit `0`,
  `nub run lint` exit `0`.
- Full native behaviour suite re-run after this change: 836 passed / 31 failed
  of 867; the 31 are the recorded plan-540 binding failures (24 focus/blur, the
  box-convention positions and the command-menu scroll). Toast is 20/20, so the
  change caused no native regression.
