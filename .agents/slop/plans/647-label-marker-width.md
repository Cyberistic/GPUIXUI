# 647 — The required marker keeps its own width

**Owner:** primitives workstream. **Phase:** F (Tier 1 correctness).
**Depends on:** `030`, `041`, `368`, `383`, `581`, `587`.
**Status:** done.

## 0. The bug

`Label`'s required marker is a `Text` run in the same flex row as the name.
Plan `383` removed a text run's automatic content floor (`minWidth: 0`) so a
long name wraps instead of pushing a sibling out. The marker inherited that
floor, so the row could also shrink the **marker itself**.

Measured on the pinned `@gpuix/native@0.10.0` release-tag build, a required
`Label` reading "Notification preferences" in fixed-width columns:

| Column | Name painted | Marker painted |
| ------ | ------------ | -------------- |
| 240 px | one line     | 6 px           |
| 120 px | one line     | 5 px           |
| 80 px  | one line     | 3.5 px         |
| 60 px  | two lines    | 2.5 px         |
| 40 px  | four lines   | 1.5 px         |
| 12 px  | many lines   | 0.5 px         |

The star is the only visual signal that the field is required (0.10.0 has no
`aria-required`), so a narrow form column or property panel paints it away.

## 1. The fix

`Text` already exposes the escape hatch plan `587` added for a `Grid`
`max-content` cell: `shrink={false}` resolves `minWidth: "auto"`, restoring the
runtime's automatic content floor while the name keeps `minWidth: 0` and wraps.

Files:

- `packages/primitives/src/components/Label.tsx` — pass `shrink={false}` to the
  required marker `Text`. Nothing else changes.
- `packages/primitives/runtime/label-required.runtime.test.tsx` — one runtime
  case: the marker's painted width in a 60 px column equals its width in a
  240 px column and stays inside the column.
- `packages/primitives/src/components/presentational.test.tsx` — the marker
  carries `shrink={false}` (the element-tree seam).
- `packages/primitives/docs/label.mdx` — the verified limitation and the
  verification entry.
- `COMPONENTS.md` — the Label row records the measurement.
- `TODO.md` — the task row and the section count.

## 2. Commands and expected results

From `workspaces/primitives`:

```sh
nub run --filter @gpuixui/primitives test src/components/presentational.test.tsx
# Expected: 1 file passed, 31 tests.

nub run --filter @gpuixui/primitives test:runtime runtime/label-required.runtime.test.tsx
# Expected: 1 file passed, 4 tests (the 3 a11y cases plus this one).

nub run --filter @gpuixui/primitives test
# Expected: 60 files passed, 860 tests (the new assertion joins an existing case).

nub run check
nub run lint
nub run test
# Expected: exit 0.
```

## 3. Both-direction proof (recorded)

Remove `shrink={false}` from the marker and re-run the scoped runtime file:

```text
× keeps the marker's own width in a narrow column
AssertionError: expected 2.5 to be 6
Tests  1 failed | 3 passed (4)
```

Restore it: `4 passed (4)`. The offline case fails the same way by returning
`Option.none()` for the marker's `shrink`.

## 4. STOP conditions

- The marker's width in the narrow column differs from the roomy one after the
  fix: stop, do not weaken the assertion; the floor is not reaching the host.
- The name no longer wraps (its painted height stays one line in the 60 px
  column): stop, the label's own `shrinkLayoutStyle` was changed by mistake.
- Any focus/role/name assertion in the same file changes: stop and report — this
  plan changes no semantics.

## 5. Acceptance

The marker keeps one width at every column width, the name wraps, all four
assertions above pass, and `COMPONENTS.md`, the page and `TODO.md` record the
measurement.
