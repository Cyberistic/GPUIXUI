# 096 — `ButtonGroup` cannot stack, while every other group can

| Field | Value |
| ----- | ----- |
| Phase | F (consistency) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `078` |
| Status | **done** |

Self-contained: §1 the gap, §2 the rule, §3 the files, §4 commands and expected
results, §5 the test plan and the two-direction proof, §6 STOP conditions, §7
outcome, §8 acceptance.

---

## 1. The gap

`CheckboxGroup`, `RadioGroup` and `ToggleGroup` all take
`orientation?: "horizontal" | "vertical"`; their resolvers switch
`flexDirection` on it (`CheckboxGroup.tsx:330`, `RadioGroup.tsx:187`,
`ToggleGroup.tsx:168`). `ButtonGroup` — the fourth group, and the one shadcn/ui
also makes orientation-aware — is hard-coded:

```tsx
const base: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: mode === "attached" ? 0 : theme.spacing[gap],
};
```

A caller can pass `style={{ flexDirection: "column" }}`, and because `style`
merges last the axis changes — but `alignItems: "center"` stays, so every
button hugs its own text and a stacked group looks ragged. There is no
documented way to get a full-width vertical action stack, and the API is
inconsistent with the three groups beside it.

Nothing measures a vertical group today: the runtime suite (`controls.runtime`,
plan `078`) only computes horizontal gaps (`two.x - (one.x + one.width)`), and
the element-tree suite only reads `gap`.

## 2. The rule

**`ButtonGroup` takes the same `orientation` the other groups take, and a
vertical group stacks full-width buttons.**

1. One new prop: `orientation?: "horizontal" | "vertical"`, default
   `"horizontal"`. Adding it changes no existing render.
2. `renderButtonGroup` resolves the axis:
   - `horizontal` → `flexDirection: "row"`, `alignItems: "center"` (unchanged);
   - `vertical` → `flexDirection: "column"`, `alignItems: "stretch"`, so a
     button fills the group's width instead of hugging its label.
3. `mode`, `gap`, the group radius and `overflow: hidden` are unchanged and are
   axis-independent: an attached vertical group is still clipped and rounded by
   the group box, and its children are still square (`GroupShapeContext`).
4. The caller's `style` still merges last, so an explicit `alignItems` or
   `flexDirection` wins.
5. No new paint, no new token: the axis is layout only.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/ButtonGroup.tsx` | add `orientation`, resolve the axis in `renderButtonGroup` |
| `packages/primitives/src/components/presentational.test.tsx` | element-tree cases: default axis, vertical axis, caller override |
| `packages/primitives/runtime/controls.runtime.test.tsx` | runtime case: a vertical attached group stacks with 0 gap and equal widths |
| `packages/primitives/examples/button-group.example.tsx` | new: a composed example with a horizontal attached group and a vertical action stack |
| `packages/primitives/examples/index.ts` | register `buttonGroup` |
| `packages/primitives/runtime/examples.runtime.test.tsx` | `SCREENS` record for the new example (the parity test fails without it) |
| `packages/primitives/docs/button-group.mdx` | description, Usage, Modes/axis section, API row, Verification |
| `COMPONENTS.md` | the Button groups row: orientation is part of the component |
| `packages/primitives/README.md` | test counts after the run |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/096-button-group-orientation.md` | §7 after the run |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons` or
`apps/*`.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/presentational.test.tsx` | the new vertical axis case fails before the resolver changes and passes after |
| `nub run --filter @gpuixui/primitives test -- src/exports.test.ts` | the new example needs no export change; this guards the docs/export half |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 38 files / 443 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/controls.runtime.test.tsx` | the vertical stack case fails before the wiring and passes after |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/examples.runtime.test.tsx` | the new example mounts, paints its headline and the registry parity test passes |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 21 files / 301 tests) |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertions in §7.

### 5.1 The element tree (`src/components/presentational.test.tsx`)

1. **"keeps the default axis horizontal"** — `renderButtonGroup({}, testTheme)`
   resolves `flexDirection: "row"` and `alignItems: "center"`. This is the
   no-regression half: the two values must not move.
2. **"stacks a vertical group with stretched children"** — the same renderer
   with `orientation: "vertical"` resolves `flexDirection: "column"` and
   `alignItems: "stretch"`. Fails today on both properties.
3. **"lets the caller override the axis"** — `orientation: "vertical"` plus
   `style={{ alignItems: "center" }}` resolves `center`: the caller still wins
   last (the package's style rule).

### 5.2 The real runtime (`runtime/controls.runtime.test.tsx`)

4. **"stacks a vertical attached group with no gap and one width"** — a
   three-button `ButtonGroup orientation="vertical" mode="attached"`:
   - `two.y === one.y + one.height` and `three.y === two.y + two.height`
     (0 px between neighbours, the vertical analogue of plan `078`'s gap);
   - `one.width === two.width === three.width === group.width` (stretched, not
     hugging);
   - the group still paints `radius.md` + `overflow: hidden` and each child
     still paints `borderRadius: 0` (the clip contract is axis-independent).
5. **"keeps a horizontal group on one row"** — the existing horizontal gap case
   still passes unchanged, and the new case asserts `one.y === two.y` so the
   axis change cannot silently stack the default.

### 5.3 The example (`runtime/examples.runtime.test.tsx`)

6. **the registry parity test** fails until `SCREENS` has a `buttonGroup`
   record; the mount test then proves the example paints its root and headline.
   The dark-palette pass covers it automatically once `SCREENS` has the row.

### 5.4 Two-direction proof (required before "done")

- Revert only the `alignItems` decision (keep `center` for vertical): test 4's
   equal-width assertion fails with the measured boxes; record them in §7.
- Revert only the `flexDirection` decision: test 4's stacking assertion fails
   and test 1 still passes (so the default is genuinely untouched).
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. A vertical attached group cannot be clipped by the group box in 0.10.0
   (measured: the children are not rounded at the outer corners, or the clip
   does not follow the column). Record the boxes and propose the honest
   alternative (document the limitation) instead of shipping a broken corner.
3. `alignItems: "stretch"` does not reach the buttons because a button sets its
   own cross-axis size. Record what painted; do not add `fullWidth` to children
   implicitly.
4. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

### Measured before

A vertical attached group of three buttons, measured with the axis wired but
`alignItems` reverted to the old `"center"`:

```text
× stacks a vertical ButtonGroup into full-width rows
AssertionError: expected [ 45, 45, 56 ] to strictly equal [ 1256, 1256, 1256 ]
```

The three buttons hugged their labels (45/45/56 px) inside a 1256 px group —
the ragged stack the prop exists to remove. The stacking assertion above it
(`y` positions) still passed, so this run isolates the cross-axis decision.

The `flexDirection` half failed first, on the unwired resolver, in the element
tree:

```text
× lay a row by default and a column when vertical
AssertionError: expected 'row' to be 'column'
```

Both directions were restored before the suites that count below were run.

### What changed

- `ButtonGroup` takes `orientation?: "horizontal" | "vertical"`, default
  `"horizontal"`; `renderButtonGroup` resolves `flexDirection` and `alignItems`
  from it. Nothing else in the resolver moved: the gap, the group radius, the
  clip and the `GroupShapeContext` square-child rule are axis-independent.
- The caller's `style` still merges last (the element tree proves an explicit
  `alignItems: "center"` beats the vertical default).
- A composed example (`examples/button-group.example.tsx`) shows both axes in
  one card and wires a stacked press to caller-owned state.

### After

- Offline: **38 files / 445 tests passed** (443 before; +2 element-tree cases).
- Runtime: **21 files / 303 tests passed** (301 before; +1 controls case, +1
  example case).
- `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] `ButtonGroup` accepts `orientation` with `"horizontal"` as the default and
      no change to an existing render.
- [x] A vertical group stacks full-width buttons with the same gap and clip
      rules as the horizontal one.
- [x] The element-tree and runtime cases both fail without the change.
- [x] The example is registered, mounted and dark-palette covered.
- [x] Docs, `COMPONENTS.md`, `README.md`, `TODO.md` and the index record it.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
