# 365 — `Text align="end"` paints nothing

| Field | Value |
| ----- | ----- |
| Phase | F (measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `043`, `047`, `059`, `082` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

`TextProps.align` accepts `"start" | "center" | "end"` and `textStyle` writes the
value through verbatim:

```ts
if (spec.align !== undefined) style.textAlign = spec.align;
```

The renderer in the source this host's binding was built from
(`references/gpuix` `packages/native/src/renderer.rs`, the `text_align` match)
maps only `center`, `right`, `left`/`start`; `"end"` reaches the `_ => {}`
branch.

A probe captured four 400 px-wide frames in the real `TestRenderer` and compared
bytes:

| Comparison | Same bytes? |
| ---------- | ----------- |
| `align="start"` vs `align="end"` | **yes — the two frames are identical** |
| `align="end"` vs `style={{ textAlign: "right" }}` | no |
| `align="start"` vs `align="center"` | no |

So one third of a documented prop paints nothing, while the same value passed
through `style` works. `docs/text.mdx` lists `align` as "horizontal alignment"
with the three values.

## 1. The decision

**Our vocabulary is mapped to the runtime's at the one place the style is
built.** `"end"` becomes `"right"`; `"start"`/`"center"` pass through unchanged
because the runtime implements them. This is the same translation the package
already performs for other runtime-shaped values (a theme colour role to a
string, a spacing step to a number), and it keeps the public prop identical.

The runtime has no text direction (`direction`/`rtl` is not in `StyleDesc`), so
`"end"` is the end of the box in left-to-right text — which is exactly what
`right` paints. The docs state that, rather than implying bidi support.

Alternatives rejected:

- **Accept `"right"` in `TextProps`**: leaks the runtime's vocabulary into the
  public API and keeps two names for one position.
- **Map in `Text.tsx`**: the style resolver is the one place that turns a
  semantic spec into a `StyleDesc` (D13); a component-local mapping would be the
  second.

## 2. The rule

In `core/style.ts` `textStyle`:

```ts
// The runtime maps `center`, `right` and `left`/`start`; `end` was in the
// style type but implemented nowhere (measured, plan 365).
if (spec.align !== undefined) {
  style.textAlign = spec.align === "end" ? "right" : spec.align;
}
```

No public type change. No change for `"start"` or `"center"`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | the `end` → `right` mapping with the measured note |
| `packages/primitives/src/core/style.test.ts` | one case: all three public values reach the runtime's vocabulary |
| `packages/primitives/src/components/presentational.test.tsx` | the element-tree case that reads `textAlign` for `align="end"` |
| `packages/primitives/runtime/text-align.runtime.test.tsx` | **new file** — the screenshot proof: `end` matches a manual `textAlign: "right"` frame and differs from `start` (the clamp suite keeps its own single responsibility) |
| `packages/primitives/docs/text.mdx` | the `align` row and a sentence on what `end` means |
| `COMPONENTS.md` | the Text row records it |
| `TODO.md` | tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/style.test.ts src/components/presentational.test.tsx` | the new cases pass; the existing alignment cases stay green |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 607 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/text.runtime.test.tsx` | the new case passes; the existing clamp cases stay green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 29 files / 589 tests) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

1. **`core/style.test.ts` — "maps every public alignment onto the runtime's"** —
   `textStyle({ role: "body", align: "start" }, theme)`, `"center"`, `"end"`;
   assert `textAlign` is `"start"`, `"center"`, `"right"`. Before: the third is
   `"end"`.
2. **`presentational.test.tsx` — "sends `end` to the runtime as `right`"** — the
   same assertion through `renderText`'s host `style`, so the mapping survives
   the component.
3. **`runtime/text-align.runtime.test.tsx` (new file) — "paints align=end
   exactly like a manual right alignment, and unlike start"** — three captures
   of a 400 px-wide frame: `align="start"`, `align="end"`, and
   `style={{ textAlign: "right" }}`. Assert `end` is byte-identical to the manual
   right frame and different from `start` (the `sameBytes` pattern from
   `icons.runtime.test.tsx`). It is a separate file because the existing
   `text.runtime.test.tsx` is the clamp/cache suite.

### 5.3 Two-direction proof

Run case 3 before the fix (it fails: `end` matched `start`). Then remove the
mapping on the fixed tree and confirm cases 1–3 fail by name. Restore; suite
green.

## 6. STOP conditions

1. `test:runtime` cannot load the binding.
2. A 400 px frame does not actually move the glyphs (the text hugs its content
   regardless of width). Then use a narrower reference element and record the
   measured geometry; do not ship a mapping no test can see.
3. `textAlign: "right"` stops being accepted by the runtime (`StyleDesc` change).
   Then re-derive the mapping from the installed types.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

`textStyle` now emits `textAlign: "right"` for `align="end"` (and passes
`"start"`/`"center"` through). Measured after the fix, in one window and with the
same 400 px frame:

| Comparison | Before | After |
| ---------- | ------ | ----- |
| `align="end"` vs a manual `textAlign: "right"` | different | **byte-identical** |
| `align="end"` vs `align="start"` | **byte-identical** | different |

The element tree reports `textAlign: "right"` for the public `"end"`, and the
existing `"start"`/`"center"` cases are unchanged. Offline **43 files / 609
tests** (607 + 2), runtime **30 files / 590 tests** (29 + the new alignment file,
589 + 1). `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] `align="end"` paints right-aligned in the real runtime.
- [x] `"start"` and `"center"` are unchanged.
- [x] The docs state what `end` means without implying bidi support.
- [x] The new cases fail without the mapping.
- [x] The three gates and the full runtime suite pass.
