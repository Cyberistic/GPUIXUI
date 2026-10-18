# 364 — A labelled `Separator` applies the caller's `style` to both rule halves, not the control

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / contract) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `043`, `047`, `097` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, element tree)

`renderSeparator` merges the caller's `style` into the **rule** object and then
spreads that object onto both halves of a labelled separator:

```tsx
const rule = mergeStyle(ruleStyle({ orientation, inset }, theme), style);
…
<div style={{ display: "flex", … }}>            // root: fixed, no caller style
  <div style={{ ...rule, flexGrow: 1 }} />      // left rule: caller style
  <Text role="caption" tone="muted">{label}</Text>
  <div style={{ ...rule, flexGrow: 1 }} />      // right rule: caller style
</div>
```

A probe with `{ orientation: "horizontal", label: "Advanced", style: { marginTop: 40 } }`
recorded:

| Element | Painted style |
| ------- | ------------- |
| root | `{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }` — **no `marginTop`** |
| left rule | `{ height: 1, …, marginTop: 40, flexGrow: 1 }` |
| right rule | the same, `marginTop: 40` |

So `<Separator label="Advanced" style={{ marginTop: 40 }} />` does not move the
control: it leaves a 40 px band above each half of the rule while the caption
stays on the old line. Container properties (`gap`, padding, width,
`flexDirection`) are worse — meaningless on the children and ignored on the root.
`docs/separator.mdx` documents `style` as *"merged last"*, and `README.md` and
`docs/component-api.md` §3 make the same promise for every part that takes one.

The plain (unlabelled) separator is correct: its one element is the rule and the
caller's style merges last. The defect exists only in the composed shape.

## 1. The decision

**The caller's `style` styles the control's root, as it does on every other
part.** For a labelled separator the root is the flex row that the control *is*;
the two rules are its internal structure and keep the themed look.

The trade is explicit and goes in the docs: a caller cannot recolour the rule
through `style` in the labelled shape, because the rule is not the root. The
themed `colors.border` remains the only source of the rule's colour, which is
the design system's rule anyway (AGENTS §4: tokens are the single source of
colour). A caller who needs a different rule colour uses a `Box` with a border
instead of the labelled separator.

Alternatives rejected:

- **Merge into both the root and the halves**: `marginTop` would then apply twice
  (160 px of space for a 40 px request) and no property would mean one thing.
- **Split props (`style` for the root, `ruleStyle` for the halves)**: a second
  styling seam for a one-line composition, with no consumer asking for it. If one
  appears, it gets its own plan.

## 2. The rule

```tsx
const rule = ruleStyle({ orientation, inset }, theme);
if (label === undefined || orientation === "vertical") {
  return <div testId={testId} style={mergeStyle(rule, style)} />;
}
return (
  <div testId={testId} style={mergeStyle({ display: "flex", … }, style)}>
    <div style={{ ...rule, flexGrow: 1 }} />
    <Text role="caption" tone="muted">{label}</Text>
    <div style={{ ...rule, flexGrow: 1 }} />
  </div>
);
```

The plain case is unchanged (it already merged the caller last). The labelled
root's own layout is merged **before** the caller's style, so the caller wins
(plan `097`'s rule).

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Separator.tsx` | split `rule` from the root style; the labelled root merges the caller last; header note |
| `packages/primitives/src/components/presentational.test.tsx` | one element-tree case: a labelled separator puts a container property on the root and not on the halves |
| `packages/primitives/runtime/layout.runtime.test.tsx` | one runtime case: `marginTop: 40` moves the control 40 px and does not reach either half |
| `packages/primitives/docs/separator.mdx` | the `style` row and a note on the labelled trade |
| `COMPONENTS.md` | the Separators row records it |
| `TODO.md` | tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/presentational.test.tsx` | the new case and the existing separator cases pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 606 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/layout.runtime.test.tsx` | the new case passes; the existing separator paint case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 29 files / 588 tests) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

### 5.1 Element tree (`src/components/presentational.test.tsx`)

1. **"puts a labelled separator's caller style on the control, not its rules"** —
   `renderSeparator` with `{ orientation: "horizontal", label: "Advanced", style: { marginTop: 40 } }`;
   assert the root's style record has `marginTop: 40`, and both rule halves have
   `marginTop` undefined while keeping `height`/`backgroundColor` from
   `ruleStyle`. Before: the root has no `marginTop` and both halves carry `40`.

### 5.2 Runtime (`runtime/layout.runtime.test.tsx`)

2. **"moves a labelled separator by the caller's margin"** — mount a column:
   a `Text`, the labelled separator (`testId="sep"`), a `Text`. Record
   `bounds("sep").y`; re-render the same tree with `style={{ marginTop: 40 }}`
   and assert the separator's `y` moved by 40 px (within 1 px) while the painted
   halves' `marginTop` stays `undefined` (read the separator's children through
   `renderer.getElement`). Before: `y` is unchanged and both halves report
   `marginTop: 40`.

### 5.3 Two-direction proof

- Run both cases against the old merge; record the failures in §7.
- Restore; mutate the root merge back onto the halves → both fail.
- Green suites, then `nub run check`, `nub run lint`, `nub run test`.

## 6. STOP conditions

1. `test:runtime` cannot load the binding.
2. Moving the root by a margin does not move the painted separator (e.g. the
   parent collapses margins — GPUix has no CSS margin collapse, but measure). Then
   record the real geometry and adjust case 2 to a property the runtime really
   applies, rather than weakening it to a style-record assertion alone.
3. A caller style that the rule must see turns out to be needed by an existing
   example or test. Then stop and re-derive the decision (a `ruleStyle` prop)
   rather than leaving one consumer silently broken.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

A labelled separator now styles its root. Measured after the fix:

- element tree: the root's style record carries `marginTop: 40`; both rule
  halves report `marginTop` `None` and keep the rule's `height` and border role;
- runtime: the separator's painted `y` moves by exactly **40 px** when the
  caller's margin goes from absent to 40, the root reports `marginTop: 40`, and
  both painted rule halves report `undefined` — before the fix the `y` delta was
  **0** and both halves carried `40`.

Mutation: restoring the old merge (caller style into the shared rule, spread onto
both halves) failed the element case with `expected { _tag: 'None' } to strictly
equal { _tag: 'Some', … }` (the root's `marginTop`) and the runtime case with
`expected +0 to be 40`. Offline **43 files / 607 tests** (606 + 1), runtime
**29 files / 589 tests** (588 + 1). `nub run check`, `nub run lint` and
`nub run test` pass.

## 8. Acceptance

- [x] A labelled separator's `style` reaches its root and not its rule halves.
- [x] A container property visibly moves the control in the runtime.
- [x] The plain separator's behaviour is unchanged.
- [x] Docs, inventory, `TODO.md` and the index record it.
- [x] Both cases fail in the old direction.
- [x] The three gates and the full runtime suite pass.
