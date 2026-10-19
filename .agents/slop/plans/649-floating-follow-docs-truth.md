# Plan 649 — the floating pages deny the trigger-follow they ship

**Status:** ready to execute.
**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 060, 095, 098, 335, 336, 347, 391, 393, 395, 604, 609, 645.

## 0. The bug, with evidence

Plan `645` measured that a floating layer kept the side chosen for its trigger's
**old** box: a `Tooltip` and a `Select` whose trigger moved from `y 712` to
`y 12` while open painted at `13…37` / `13…79`, over the trigger. It fixed both
wrappers with a shared `useFloatingFollow` sampler (100 ms while open, asleep
while closed) and added three runtime cases in
`runtime/floating-resize.runtime.test.tsx`.

The prose was only partly updated:

- `packages/primitives/docs/tooltip.mdx` §Limitations still ends, in two
  separate bullets, "a trigger that moves under an open tip without a resize is
  still not re-placed" (line ~280) and "a trigger that moves under an open tip
  is not re-placed" (line ~305). Its own §Placement body (lines ~163–171)
  correctly describes the follow, so the page contradicts itself.
- `packages/primitives/docs/info-tip.mdx` §Limitations repeats the same false
  claim (lines ~94–96).
- `README.md` and `COMPONENTS.md` are already correct ("sample the trigger every
  100 ms while the layer is open … plan `645`").

This is the same class as plans `395` (a page denied the tooltip wrap), `643`
(a page called a `ScrollArea` hover-only) and `648` (the inventory denied the
green suite): a documented limitation that the implementation disproved,
with no guard tying the prose to the behaviour.

## 1. Exact files

Change:

1. `packages/primitives/docs/tooltip.mdx` — correct the two limitation bullets
   and cite the follow cases in §Verification.
2. `packages/primitives/docs/info-tip.mdx` — correct the resize/move bullet and
   cite the new runtime case in §Verification.
3. `packages/primitives/runtime/info-tip.runtime.test.tsx` — add one case proving
   an `InfoTip` tip follows its trigger while open.
4. `packages/primitives/src/docs-floating-follow.test.ts` — **new** guard
   (precedent: `src/docs-tooltip-wrap.test.ts`).
5. `COMPONENTS.md` — the Tooltips row already carries "Trigger follow (645)";
   add one clause that `InfoTip` inherits it and that the pages now say so.
6. `TODO.md` — add the task in the primitives section and tick it.
7. `.agents/slop/plans/README.md` — index this plan.
8. `PLAN.md` — no decision changes; no ADR.

Do **not** touch `packages/tokens`, `packages/components`, `apps/docs`,
`apps/playground` or any page outside `packages/primitives/docs`.

## 2. The documentation edits (verbatim intent)

**`docs/tooltip.mdx`, first limitation bullet** — keep the `center`/re-measure
facts, replace only the final clause:

> A content change while the tip is open re-measures (plan `391`), a window
> resize re-places the tip and re-caps it (plan `604`), and a trigger that moves
> under an open tip is re-measured on the same 100 ms cadence (plan `645`). The
> correction lands on the next sample, not in the same frame: GPUix has no
> `onLayout`.

**`docs/tooltip.mdx`, controlled-tip bullet** — replace the last sentence:

> While the tip stays open the trigger is re-sampled every 100 ms (plan `645`),
> so a layout change is followed too.

**`docs/info-tip.mdx`, last limitation bullet**:

> **A window resize or a moving trigger re-places the tip** (inherited from
> `Tooltip`, plans `604` and `645`). The trigger is re-sampled every 100 ms
> while the tip is open, so a layout change is corrected on the next tick; the
> sampler sleeps while the tip is closed.

**§Verification additions**:

- `tooltip.mdx`, in the `runtime/floating-resize` bullet: state that the same
  file follows a trigger that moves while open, and that the sampler is silent
  while closed (plan `645`).
- `info-tip.mdx`, add a bullet for `runtime/info-tip.runtime.test.tsx`: a tip
  opened by hover flips below its trigger when the trigger moves to the top
  edge while the tip stays open (plan `649`).

No other prose change. Do not weaken the real limits (no `onLayout`, 100 ms
latency, a tip follows only while open).

## 3. The guard (`src/docs-floating-follow.test.ts`)

Model it on `src/docs-tooltip-wrap.test.ts` (Effect `FileSystem`/`Path`,
`Arr`, `Str`; read every `docs/*.mdx` plus `README.md`). Cases:

1. **No page denies the follow.** A line matching
   `/not re-placed|without a resize is still not|moves under an open (tip|layer) is not/i`
   fails with `${file}:${line} ${text}`. The old Tooltip and InfoTip sentences
   must be gone; the correct `select.mdx` sentence ("a trigger that moves or
   resizes in a layout change refreshes …") must not match.
2. **The pages that promise the follow still promise it.** For
   `tooltip.mdx`, `info-tip.mdx`, `select.mdx` and `README.md`, require a line
   containing both a trigger/move/follow idea and `100 ms` (the README says
   "every 100 ms"; the three pages say "100 ms"). Fail by file name.
3. **The mechanism still exists.** Read `src/components/Tooltip.tsx` and
   `src/components/Select.tsx` from `import.meta.dirname`; each must contain
   `useFloatingFollow(`. Read `src/core/floating.ts`; it must contain
   `export const FLOATING_FOLLOW_MS = 100`. This is the source half of the
   contract: removing the sampler without updating the pages fails the guard.

Keep every assertion able to fail. Header comment states the bug and both
directions.

## 4. The runtime case (`runtime/info-tip.runtime.test.tsx`)

Add imports for `Box`, `FLOATING_FOLLOW_MS`, `Bounds`, `sleep`.

```tsx
const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

it("follows its trigger when the trigger moves while the tip is open", async () => {
  const runtime = await openWindow();
  const view = (offset: number) => (
    <Surface>
      <Box tone="background" style={{ height: offset }} />
      <InfoTip
        content={CONTENT}
        label="Revenue definition"
        testId="trigger"
        tipTestId="tip"
      />
    </Surface>
  );
  runtime.render(view(700));
  runtime.hover("trigger");
  runtime.flush();
  const firstTarget = boundsOf(runtime, "trigger");
  const firstTip = boundsOf(runtime, "tip");
  // The default top side fits above a trigger low in the column.
  expect(firstTip.y + firstTip.height).toBeLessThanOrEqual(firstTarget.y + 1);

  // A layout change moves the trigger to the top edge. The runtime re-anchors
  // the layer; the wrapper must re-decide the side or the tip covers its own
  // trigger (measured before plan 645: 13..37 over a trigger at 12..36).
  runtime.render(view(0));
  await sleep(FLOATING_FOLLOW_MS + 80);
  runtime.flush();
  await sleep(30);
  runtime.flush();

  const target = boundsOf(runtime, "trigger");
  const tip = boundsOf(runtime, "tip");
  expect(tip.y).toBeGreaterThanOrEqual(target.y + target.height - 1);
});
```

`paintBounds` (not `bounds`) matches the other floating suites: a plain `div`
reports from its content origin (plan `597`). The tip remains open across the
re-render because the component keeps its position in the tree, as the generic
`floating-resize` cases already rely on.

## 5. Commands and expected results

From the worktree root:

```sh
cd packages/primitives && nub exec vitest run src/docs-floating-follow.test.ts
# expect: 4 tests, all passing (1 file)
cd packages/primitives && nub exec vitest run --config vitest.runtime.config.ts runtime/info-tip.runtime.test.tsx
# expect: 8 tests, all passing (was 7)
nub run --filter @gpuixui/primitives test
# expect: 62 files, all passing (868 tests)
nub run --filter @gpuixui/primitives check-types
# expect: exit 0
nub run lint
nub run fmt
# expect: exit 0
```

(If `nub exec --filter … vitest run --config …` is not supported by this
`nub`, use `cd packages/primitives && nub exec vitest run --config
vitest.runtime.config.ts runtime/info-tip.runtime.test.tsx` — that is the
form the other scoped runs used.)

## 6. Two-direction proof

- **Old direction:** restore either old sentence and run case 1 — it fails by
  page and line with the sentence. Restore all three and it lists three lines.
- **Source direction:** remove the `useFloatingFollow(open, measure)` call from
  `Tooltip.tsx` (or change `FLOATING_FOLLOW_MS` to another value) and run the
  guard — it fails by file. Restore before continuing.
- **Runtime direction:** the new `InfoTip` case fails without the sampler
  (`tip.y < target.y + target.height`), and passes with it. The existing
  `floating-resize` Tooltip/Select follow cases are the control.

Record the observed outcomes in this plan's §8 after execution.

## 7. STOP conditions

Stop and report, do not improvise, if:

- the new InfoTip case fails **with** the fix and the failure is not a
  measurement/box-model issue (`paintBounds` already applied);
- a correction would require changing component behaviour or a shared helper —
  the implementation is already correct; this plan is prose + guard + one
  runtime proof;
- any edit would touch a path outside §1;
- `nub run check`/`lint` fail for a reason unrelated to these files — report the
  failure, do not re-baseline unrelated assertions.

## 8. Acceptance and measured outcomes

- [x] No primitives page or README says a moving trigger is not re-placed.
      Restoring "A trigger that moves under an open tip is not re-placed." in
      `info-tip.mdx` failed the guard at `info-tip.mdx:98`.
- [x] Tooltip and InfoTip state the 100 ms follow and its latency, and keep the
      real limits.
- [x] The guard fails on each old sentence and on a removed sampler; passes on
      the fixed tree. Commenting `useFloatingFollow(open, measure)` out in
      `components/Select.tsx` failed `["components/Select.tsx"]` (the first
      version matched the comment and was tightened to a line-leading call).
- [x] The InfoTip runtime file is 8/8; offline is 62 files / 868 tests;
      `check-types`, `lint`, `fmt` pass. The new case failed without the sampler
      at `expected 8 to be greater than or equal to 27` (tip over its trigger).
- [x] `COMPONENTS.md`, `TODO.md` and the plan index are updated.
- [x] Committed on `agent/primitives` and pushed.
