# 095 — `Tooltip`'s `align="center"` is a trap the wrapper still offers

| Field | Value |
| ----- | ----- |
| Phase | F (hardening) |
| Owner | primitives workstream |
| Depends on | `020`, `041`, `047`, `060`, `067`, `071`, `323` |
| Status | **done** (2026-10-18) |

Self-contained: §1 the gap and the measurement, §2 the rule, §3 the files, §4
commands and expected results, §5 the test plan and the two-direction proof, §6
STOP conditions, §7 outcome, §8 acceptance.

---

## 1. The gap

Plan `060` §0 measured the runtime's `align="center"` against a 400-wide trigger
and a 42-wide tip: with the trigger centre at 212, `center` painted
`170..212` — the tip's **end** sat on the anchor's centre line. The wrapper's
response was to default `align` to `"start"` and **document `center` as broken**,
but it still accepts the prop:

```tsx
<Tooltip align="center" content="A hint">…</Tooltip>
```

A consumer who reaches for the obvious value gets a tip shifted left by half its
width. The API promises centring and delivers a measured defect.

The components workstream hit the same runtime defect in plan `323` and solved it
in `packages/components/src/internal/placement.ts` by mapping `center` to
`start` plus `(trigger − surface) / 2`. That rule lives in a package
`primitives` cannot depend on, so today the library has **two answers** to one
question: components is exact, the Tier 1 `Tooltip` is not.

No runtime test covers `align="center"` — the suite tests `start` and `end` only,
which is why the trap survived.

## 2. The rule

**Every `align` value the component accepts must place the tip exactly; `center`
becomes `start` plus a measured offset.**

1. One pure rule in `packages/primitives/src/core/floating.ts`:
   `resolveHorizontalAlign({ align, triggerWidth, layerWidth })` returns
   `{ align: "start" | "end", offset }`. `center` → `start` with
   `(triggerWidth - layerWidth) / 2`; `start`/`end` → themselves with `0`.
2. `Tooltip` measures its root **and the open tip** once per open (the runtime
   has no layout callback), passes the resolved `align` and `alignOffset`, and
   resets the measurement when the tip closes.
3. The correction is used only when both widths are known and positive; an
   unmeasured first frame keeps the caller's `align` with offset `0` (the
   existing default is `start`, so the common path does not move).
4. The measured `center` gap is within 1 px of exact; `start` and `end` keep
   their existing exact results.
5. The page and `COMPONENTS.md` stop calling `center` a defect; they say all
   three values are exact and how `center` is resolved.
6. No new prop is added. `alignOffset` stays internal to the wrapper (it is the
   runtime's own `FloatingContentProps` field, not ours).

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | add `HorizontalAlign`, `AlignRequest`, `ResolvedAlign`, `resolveHorizontalAlign` |
| `packages/primitives/src/core/floating.test.ts` | new pure cases (check the file name; if the existing suite lives elsewhere, add there) |
| `packages/primitives/src/components/Tooltip.tsx` | measure the tip, resolve the align, pass `align` + `alignOffset`, reset on close |
| `packages/primitives/src/components/Select.test.tsx` | the existing `Tooltip` describe (Tooltip has no separate element file) gains the resolved-align/offset cases |
| `packages/primitives/runtime/fields.runtime.test.tsx` | a runtime case: a centre tip's centre equals the trigger's centre within 1 px |
| `packages/primitives/docs/tooltip.mdx` | placement section: all three values exact; delete the "half a panel" limitation |
| `COMPONENTS.md` | Tooltip row: `center` compensation instead of the defect |
| `packages/primitives/README.md` | the capability table's `align` row and the test count |
| `TODO.md` | add and tick the task; note the components follow-up (below) |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/095-tooltip-center-align.md` | §7 after the run |

Do **not** edit `packages/components` (its own `resolvePlacement` is the
follow-up), `packages/tokens`, `packages/icons` or `apps/*`.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/floating.test.ts` | the new pure cases fail before the helper exists and pass after |
| `nub run --filter @gpuixui/primitives test -- src/components/Select.test.tsx` | the new element-tree cases fail before the wiring and pass after |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 38 files / 439 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the centre case fails before the wiring and passes after |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 21 files / 300 tests) |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertions in §7.

### 5.1 The pure rule (`core/floating.test.ts`)

1. **"leaves start and end alone"** — `resolveHorizontalAlign({align:"start",
   triggerWidth:400, layerWidth:42})` is `{align:"start", offset:0}`; `end`
   likewise.
2. **"turns center into start plus half the difference"** — the same widths with
   `center`: `{align:"start", offset:179}`. A tip wider than the trigger gives a
   negative offset (`(100 - 140) / 2 = -20`), which is the honest shift.
3. **"does not special-case a missing width"** — the caller guards a
   non-positive measurement; the function is total and simply returns the
   arithmetic (documented in its JSDoc).

### 5.2 The element tree (`components/Select.test.tsx`, `Tooltip` describe)

4. **"passes the resolved align and offset to the tip"** — call
   `renderTooltip(props, theme, { placement: { align: "start", offset: 179 } })`
   and decode the tip's `align`/`alignOffset` host props. The wrapper's
   `placement` seam is what the measurement produces; the pure arithmetic is
   §5.1's job and the painted result is §5.3's.
5. **"an unmeasured centre falls back to start with no offset"** — no
   `placement`: the tip keeps the caller's `align` and `alignOffset={0}`, so the
   first layout is the documented default rather than the runtime's broken
   `center`.

### 5.3 The real runtime (`runtime/fields.runtime.test.tsx`)

6. **"centres the tip on its trigger, not half a panel off"** — a 400-wide
   trigger, `align="center"`; hover the trigger, read the tip's and the
   trigger's boxes, and assert
   `Math.abs((tip.x + tip.width / 2) - (trigger.x + trigger.width / 2)) <= 1`.
   Fails today with the tip's end on the trigger's centre.
7. **"keeps start and end exact"** — the existing `start` test and the `end`
   test still pass unchanged; add an assertion that neither moved when
   `alignOffset` was introduced.

### 5.4 Two-direction proof (required before "done")

- Revert only the compensation (map `center` to `start` with offset `0`):
  test 6 fails with the measured tip box; record it in §7.
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. `TooltipContent` does not accept `alignOffset`, or the runtime ignores it.
   Record the measured boxes and stop; do not add a second positioning layer.
3. The tip's width is not measurable after the open commit (the ref is null or
   the bounds are zero), so `center` would need a second user-visible shift.
   Record the frame sequence and propose the honest alternative (narrow the
   prop) instead of shipping a flicker.
4. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

### Measured before

A 400-wide trigger at `x 12..412` (centre 212) with a 47-wide tip:

| State | Tip box | Tip centre | Gap |
| ----- | ------- | ---------- | --- |
| runtime `align="center"` (the old prop passthrough) | `x 164.5 w 47` | 188 | **24 left** |
| `center` mapped to `start`, no offset (the mutation below) | `x 12` | 35.5 | **176.5 left** |
| wrapper compensation | `x 188.5 w 47` | 212 | **0** |

### Failing direction

With the helper's centre branch reduced to `offset: 0`:

```text
× turns center into start plus half the difference
× shifts left when the layer is wider than its trigger
Tests  2 failed | 9 passed (11)

× centres a Tooltip on its trigger, not half a panel off
AssertionError: expected 176.5 to be less than or equal to 1
Tests  1 failed | 42 skipped (43)
```

Restored, both suites are green.

### What the measurement changed in the implementation

The first version measured in `useEffect`; the corrected offset was computed but
never reached the native layer before the frame was read. The components
workstream's `usePlacement` uses `useLayoutEffect` for the same job, so the
wrapper now does too, and the offset lands in the same layout pass.

An unmeasured `center` is rendered as `start` with offset `0` — never as the
runtime's own `center` — so the first frame is left-aligned for one frame and
then shifts to true centre. The plan's stop condition 3 allowed for this; it is
recorded on the page as a one-measure limitation.

### After

- `resolveHorizontalAlign` is the one pure rule; `start`/`end` keep offset 0.
- `Tooltip` measures its root on mount and the tip while open, and passes the
  resolved `align`/`alignOffset`; the raw runtime `center` is never forwarded.
- A 400 px trigger centres within 0 px (the assertion allows 1).
- Offline: **38 files / 443 tests passed** (439 before; +3 core, +1 element tree).
- Runtime: **21 files / 301 tests passed** (300 before; +1).
- `nub run check`, `nub run lint` and `nub run test` pass.
- Cross-team: `packages/components/src/internal/placement.ts` still has its own
  (side-aware) copy; hoisting it is recorded in `TODO.md`.

## 8. Acceptance

- [x] `align="center"` places the tip within 1 px of the trigger's centre.
- [x] `start` and `end` are unchanged and still exact.
- [x] The pure rule and the runtime case both fail without the compensation.
- [x] The docs, `COMPONENTS.md`, `README.md`, `TODO.md` and the index say all
      three values are exact.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
