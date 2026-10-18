# Plan 395 — `InfoTip`'s page denies the wrap its tooltip now performs

**Owner:** primitives workstream (`packages/primitives`).
**Phase:** F (docs truth pass), no public API change.
**Depends on:** 073 (InfoTip), 347 (Tooltip open state), 391 (long tooltip
content), 393 (side width cap).

## 1. The defect, measured

Plan `391` replaced the tooltip's unconditional `whiteSpace: "nowrap"` with a
measured `maxWidth` cap: `tooltipStyle(theme, maxWidth)` now emits
`whiteSpace: "normal"` and a numeric `maxWidth` whenever the wrapper has a
measured cap (which is every mounted runtime). Plan `393` extended that cap to
horizontal sides. `docs/tooltip.mdx` was updated; `docs/info-tip.mdx` was not.

Measured on this host, 2026-10-19 (temporary probe, 1280 × 800 window, then
deleted):

```
InfoTip content = 230 characters
tip bounds      = { x: 19, y: 35, width: 1251, height: 40 }
```

`40` px is **two** caption lines (`testTheme.typography.caption.lineHeight`
is `20`), inside the window's usable width (`1280 − 2 × 8 = 1264`). The tip
wraps.

The page still says, under **Limitations**:

> The tip does not wrap (`whiteSpace: "nowrap"`), so keep `content` short.

That is false on the shipped component, and it tells a reader to avoid a
capability they have. Nothing guards prose claims of this shape, so plan `391`
could update one page and leave the other wrong.

## 2. What ships

**No component behaviour changes.** Three artifacts:

1. `packages/primitives/docs/info-tip.mdx` — the false limitation is replaced by
   the measured contract (the tip wraps inside the cap inherited from
   `Tooltip`; a single unbreakable token can still exceed it, because the
   runtime has no word-break property in `StyleDesc`).
2. `packages/primitives/runtime/info-tip.runtime.test.tsx` — a real long tip
   proves the wrap at the `InfoTip` boundary: its painted width stays inside the
   window's usable width, and its height exceeds one caption line. A short tip
   still paints one line, so the case cannot pass by always wrapping.
3. `packages/primitives/src/docs-tooltip-wrap.test.ts` — the class guard: no
   primitives page may claim that a tooltip tip "does not wrap"/uses `nowrap`
   while `tooltipStyle(theme, cap)` resolves `whiteSpace: "normal"`. It also
   asserts the resolver's own two forms (capped → `normal` + `maxWidth`,
   uncapped → `nowrap`), so the guard is tied to code, not only prose.

`COMPONENTS.md` (Tooltips row) and `TODO.md` record the fix. The plan index gets
this row.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/395-info-tip-wrap-truth.md` | this plan |
| `.agents/slop/plans/README.md` | index row, status `done` |
| `packages/primitives/docs/info-tip.mdx` | replace the false limitation; note the wrap in the `content` row |
| `packages/primitives/runtime/info-tip.runtime.test.tsx` | +2 cases (long wraps, short one line) |
| `packages/primitives/src/docs-tooltip-wrap.test.ts` | new guard |
| `COMPONENTS.md` | Tooltips row: record 391/393 and the corrected page |
| `TODO.md` | tick the new row under the primitives section |

Do not touch `docs/tooltip.mdx` (already true), any other package, or any
component source.

## 4. Implementation steps

1. **Read the current page** (`docs/info-tip.mdx`, Limitations) and the resolver
   (`src/components/Tooltip.tsx`, `tooltipStyle`). Confirm the sentence above is
   present; if it is already gone, STOP — someone else fixed it and this plan is
   stale.
2. **Add the runtime cases** to `runtime/info-tip.runtime.test.tsx`:
   - `LONG` = the 230-character string from §1 (four clauses, enough to wrap in
     a 1280 px window).
   - Mount `<InfoTip content={LONG} label="Revenue definition" testId="trigger"
     tipTestId="tip" />` in `Surface`, `runtime.hover("trigger")`,
     `runtime.flush()`.
   - `const tip = Option.getOrElse(runtime.bounds("tip"), () =>
     expect.fail("the tip painted no box"))`.
   - `expect(tip.width).toBeLessThanOrEqual(1280 - 2 * 8)` using
     `FLOATING_MARGIN` from `src/core/floating.js` (import it; do not hard-code
     `8`).
   - `expect(tip.height).toBeGreaterThan(testTheme.typography.caption.lineHeight)`
     — more than one line.
   - Second case: the existing short `CONTENT` paints exactly
     `tooltipHeight(testTheme)` high (import `tooltipHeight`), i.e. one line.
3. **Add the docs guard** `src/docs-tooltip-wrap.test.ts`, modelled on
   `docs-keyboard.test.ts` (Effect `FileSystem` + `Path`, `NodeFileSystem`/
   `NodePath` layers; no native binding):
   - Read every `docs/*.mdx` page.
   - Assert `tooltipStyle(testTheme, 320).whiteSpace === "normal"` and
     `.maxWidth === 320`; assert `tooltipStyle(testTheme).whiteSpace === "nowrap"`.
   - Fail with `file:line` for any line matching
     `/does not wrap|whiteSpace:\s*"nowrap"/i` — no primitives page may make
     that claim about a tooltip, because the mounted wrapper always passes a cap.
     The one legitimate `nowrap` mention lives in `tooltipStyle`'s own docs
     (`tooltip.mdx` describes the *uncapped* element-tree form with backticks);
     if the scan flags it, tighten the rule to the InfoTip page and record why in
     the test header. The scan over all pages is preferred.
4. **Fix the page.** Under **Limitations**, replace the false bullet with:
   - the tip wraps inside the room its resolved side and alignment have
     (inherited from `Tooltip`, plan `391`; horizontal sides cap from the
     trigger's edge, plan `393`);
   - a single unbreakable token can still paint past the cap: `StyleDesc` has no
     word-break property;
   - keep `content` to a sentence or two — a long explanation belongs in a
     popover.
   Update the `content` API row consequence to say "the tip; wraps inside the
   measured cap; also the trigger's `aria-description`". Add the two new cases
   to **Verification** with the measured numbers.
5. **`COMPONENTS.md`:** append to the Tooltips row: plan `391`/`393`'s cap applies
   to `InfoTip` too, and the page's "does not wrap" claim was false (measured
   1251 × 40 px, two lines, at 1280 × 800; plan `395`).
6. **`TODO.md`:** add and tick one row under the primitives section, naming the
   page, the measured evidence and the guard.
7. Format, run the gates.

## 5. Commands and expected results

Run from the repo root unless stated.

```sh
# the failing direction, before the page edit:
nub run --filter @gpuixui/primitives test
# EXPECT: docs-tooltip-wrap.test.ts fails naming docs/info-tip.mdx and the line
#         with "does not wrap" (the guard is added before the page edit).

# after the page edit:
nub run --filter @gpuixui/primitives test
# EXPECT: all offline tests pass; the docs guard is green.

cd packages/primitives
nubx vitest run --config vitest.runtime.config.ts runtime/info-tip.runtime.test.tsx
# EXPECT: the two new hover cases pass. On this host the file's two pre-existing
# focus cases fail exactly as they do on HEAD (the plan-379/529 artifact), so the
# file reports 3/5; do not re-baseline them. Do NOT run the full `test:runtime`
# suite: its 111 failures are the same artifact and are unrelated.

cd ../..
nub run check
# EXPECT: check:tests, lint, fmt and every package's check-types pass.
```

## 6. Two-direction proof

Record all three in the commit message/plan status:

1. **Docs guard fails before the fix.** With the old bullet restored, the new
   guard fails by file and line. (Run once, then restore the fixed page.)
2. **The guard is tied to the resolver.** Temporarily remove the
   `maxWidth === undefined ? {} : { maxWidth }`/`whiteSpace` branch from
   `tooltipStyle` so the cap is always `nowrap`: the guard's resolver assertion
   fails. Restore.
3. **The runtime case fails without the cap.** Temporarily force
   `tooltipStyle(theme, undefined)` in `renderTooltip` (or pass
   `maxWidth: undefined` from the wrapper): the long-tip case fails on width
   (the pre-391 measurement was 6 270 px). Restore.

## 7. STOP conditions

- The false bullet is not in the page → stop, the plan is stale.
- The long tip does **not** wrap on this host (width > 1264 or height is one
  line) → stop: this is a behaviour defect, not a docs defect. Re-plan against
  `Tooltip`'s cap; do not paper it over with a docs edit.
- The docs guard cannot distinguish the legitimate `nowrap` mention in
  `tooltip.mdx` → scope the scan to `info-tip.mdx` and say so in the test
  header; do not delete the Tooltip page's accurate sentence.
- Any gate fails for a reason other than this change → stop and report; do not
  re-baseline unrelated tests.

## 8. Acceptance

- `docs/info-tip.mdx` no longer denies the wrap; the replacement states the
  measured contract and the unbreakable-token limit.
- The runtime suite proves a long `InfoTip` stays inside the window and paints
  more than one line, and a short one stays one line.
- The docs guard fails when the false claim returns, and when the cap stops
  producing `whiteSpace: "normal"`.
- `COMPONENTS.md` and `TODO.md` record the fix; the plan is indexed and marked
  done.
- `nub run check` is green; the scoped runtime file's two new cases are green
  (the file's two pre-existing focus cases carry the host's known
  plan-379/529 failure and are not re-baselined); no other package changed.

## 9. Status — done, 2026-10-19

**Shipped.**

- `docs/info-tip.mdx`: the false limitation is replaced by the measured wrap
  contract, the unbreakable-token limit, and the two new verification entries.
- `runtime/info-tip.runtime.test.tsx`: +2 hover cases.
  - long (`230` characters): width `1 251 ≤ 1 264` (`1280 − 2 × 8`) and height
    `40 > 20` (`caption.lineHeight`).
  - short: height `24 < 40` (one line).
- `src/docs-tooltip-wrap.test.ts`: 2 cases — the resolver's two forms, and the
  page scan (all `docs/*.mdx`, failing with `file:line`).
- `COMPONENTS.md` Tooltips row and `TODO.md` record the fix.

**Two-direction proof, all run.**

1. Guard against the old page: `info-tip.mdx:70` failed with the exact sentence.
   After the page edit: 2/2 green.
2. Cap branch forced to `nowrap` in `tooltipStyle`: the guard's resolver case
   failed (`expected 'nowrap' to be 'normal'`). Restored.
3. `renderTooltip` forced to `tooltipStyle(theme, undefined)`: the long-tip case
   failed on width (`1 643` vs `≤ 1 264`). Restored.

**Runtime results on this host, recorded honestly.** The scoped file is
**3/5**, not 5/5: the two new hover cases pass, and the two pre-existing focus
cases (`focusNext`/ring) fail exactly as they do on the unmodified `HEAD` copy
of the file — verified by restoring `git show HEAD:…/info-tip.runtime.test.tsx`
and re-running (2 failed / 1 passed). They belong to the plan-379/529 artifact
degradation; nothing was re-baselined. The full `test:runtime` suite was **not**
run for this plan.

**Offline:** `nub run --filter @gpuixui/primitives test` — **700 passed in 50
files** (was 698 in 49 at plan `394`). `nub run check` is green.

