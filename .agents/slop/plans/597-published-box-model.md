# 597 — the published box model: how the 37 geometry assertions should read a box

**Phase:** F (verification truth) — **blocked on a cross-team decision**
**Depends on:** `041`, `379`, `529`, `583`, `590`, `594`, `596`
**Owns (implementation):** `packages/primitives` only; the decision also concerns
the binding/provenance workstream that owns the published-build verdict.

## 1. The evidence

After plans `591`–`596`, every live-suite failure left is geometry: **37 cases
across 8 files** (`fields` 24, `layout` 3, `controls` 3, `value` 2,
`number-field` 2, `theme-axes` 1, `overflow` 1, `examples` 1). They are stable
across runs. The pattern is a **2 px delta** on bordered elements:

| Probe (release-tag build) | Authored | `getElementBounds` |
| --- | --- | --- |
| `div` with `height: 36`, no border | 36 | 36 |
| `div` with `height: 36`, `borderWidth: 1` | 36 | **34** |
| native `<input>` with the field recipe (`h-9` + 1 px border) | 36 outer | **34** |
| `NumberField` chrome (the group above) | 36 outer | **34** |
| 3 px inset focus overlay (`clippedFocusRingStyle`) | flush | **+3** from the button's edge |

The tests assume the **outer/border box** (they were written against the
main-derived artifact, which reports it). The release build reports the
**content box** — the border is excluded and the overlay's border is added to
its inner offset. Plan `529` §6.5 recorded the delta; plan `590`'s focus matrix
already normalises the one shape it compares (`inset`), and plan `592` did the
same for the released `ButtonGroup` ring. The remaining assertions still read
the raw box.

Open question the decision must answer: **does the runtime's hit-testing use
the border box?** If a click on the 1 px border strip hits (the current suite's
`clickAt(x + width − 1)` reaching the nearest end suggests it does), the painted
box is the border box and the API's report is the thing that is short — the
tests are right. If the border is outside the hit box, the component's own
geometry is 2 px smaller than assumed and the tests are wrong. Measure before
editing anything:

```
- mount a 100×36 div with borderWidth 1 and a click counter
- click at (x, y + height/2), (x - 1, ...), (x + width - 1, ...)
- record which clicks land
```

## 2. Options

### A. Tests read relative geometry (recommended for placement/containment)

Every placement/containment assertion already reads two boxes from the same
API, so a constant border delta cancels if the test compares **offsets** rather
than absolute edges:

- `list.y + list.height ≤ trigger.y` → `list.y + list.height − trigger.y ≤ 0`;
- `tip.x ≥ trigger.x` → `tip.x − trigger.x ≥ 0`;
- `list.width ≥ trigger.width` → compare the two widths as reported;
- a centre is `(box.x + box.width/2)` of the *same* element, so a 1 px border on
  one side shifts both by 0.5 px — assert within the reported tolerance, or use
  the sibling's gap.

This is plan `379` §6's "relative measurements are the robust shape". It
removes ~30 cases without asserting a wrong absolute number, and works on both
models.

### B. A calibration-aware `paintBounds` in the test adapter (for absolute size)

For the few cases whose subject *is* the outer size (the field family's one
height, the switch thumb's offsets), the adapter can report the border box:

1. At session start, mount a known 36-high bordered sentinel; if the API
   reports 34, the model is `content`.
2. `paintBounds(element)` adds the authored per-side border widths to the raw
   box when the model is `content`; it is identity on `border`.
3. `renderer.getElementBounds` stays available for raw/content checks.

This is test infrastructure, not a product claim, and needs its own tests
(sentinel calibration, per-side borders, a no-border element unchanged). It
must not be used to paper over a real layout difference: every call site says
why the outer box is the subject.

### C. Re-baseline the expected numbers to the content box

**Rejected.** It would enshrine the 2 px gap as the contract, while the painted
control is 36 high and every consumer sees the border. The absolute assertions
are the invariant; the reporting model is the defect.

## 3. Recommendation

Hybrid **A + B**:

- Convert the placement/containment/centre cases to offset comparisons
  (A) and keep the tolerances they already have.
- Add the calibrated `paintBounds` for the field-height table and the switch
  thumb (B), with a harness probe that pins the model.
- Record the decision in `PLAN.md` (§4) and in
  `docs/gpuix-capabilities.md` next to the box-model row, with the hit-test
  probe's result.

If the hit-test probe shows the border is **outside** the hit box, stop: the
model is not the only difference; re-open the component geometry with the
binding workstream instead of editing tests.

## 4. Files

- `packages/primitives/src/testing/runtime.ts` — `paintBounds` (B), raw
  `renderer` unchanged.
- `packages/primitives/src/testing/runtime.test.ts` (new) — the sentinel
  calibration cases (run in the runtime config, since it mounts a window).
- `packages/primitives/runtime/fields.runtime.test.tsx` — 24 cases (A/B).
- `layout`, `controls`, `value`, `number-field`, `theme-axes`, `overflow`,
  `examples` — the remaining 13.
- `PLAN.md`, `docs/gpuix-capabilities.md`, `COMPONENTS.md` — the decision and
  the final count.

## 5. STOP conditions

- The hit-test probe disagrees with the border-box assumption: STOP and report.
- `paintBounds` changes a case that was already green: STOP; the calibrated
  helper must be opt-in per call site.
- A converted assertion no longer fails when the product rule is mutated (run
  one per file): STOP; it was weakened, not made model-independent.

## 6. Acceptance

- The hit-test probe is recorded with evidence.
- The 37 cases are either green or reclassified with a measured reason; no
  absolute invariant is silently changed to its content-box value.
- The suite is green on the release-tag build except any explicitly reclassified
  case, with the same count on two runs.
- `nub run check`, `lint`, `test` and the scoped runtime files are green.

## 7. Result

_Not implemented: blocked on the cross-team box-model decision (§1)._
