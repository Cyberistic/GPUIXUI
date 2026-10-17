# 043 — `testId` parity for the presentational primitives (primitives workstream)

**Phase:** C (consistency pass on the Tier 1 API).
**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** `030`, `040`, `041`.
**Status:** `done` — see §6.

## 1. Problem

Every interactive primitive (`Box`, `Stack`, `Grid`, `ScrollArea`, `Button`,
fields, selection controls, `Progress`, `Skeleton`, `Spinner`, `Select`,
`Tooltip`, `Label`) accepts `testId`, the library's automation convention. Three
presentational primitives do not: `Text`, `Separator`, `Spacer`.

The gap is not cosmetic: the runtime theme suite had to find a `Text` node by its
string content, which breaks as soon as two nodes paint the same words. A library
whose own tests cannot address an element has an incomplete API.

## 2. Design

- Add `readonly testId?: string` to `TextProps`, `SeparatorProps`, `SpacerProps`
  and forward it to the host element. `Separator`'s labelled variant returns a
  different wrapper, so it must forward the id in **both** branches.
- No new behaviour: GPUix already carries `testId` on `div` and `text` (verified
  in the runtime by §5).
- Do not add `testId` to `ThemeProvider` (it renders no host element) or to the
  `labelledBy` helper (it returns an aria prop, not a host prop).

## 3. Files to change

```
packages/primitives/src/components/Text.tsx         EDIT prop + forward
packages/primitives/src/components/Separator.tsx    EDIT props + forward (rule, labelled, spacer)
packages/primitives/src/components/presentational.test.tsx  EDIT one test over all four element shapes
packages/primitives/runtime/layout.runtime.test.tsx EDIT one test: a Text's testId is in the retained tree
COMPONENTS.md                                       EDIT the Text row (automation id)
```

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expect: 149 tests (one more than before), all passing
nub run --filter @gpuixui/primitives test:runtime
# expect: 52 tests, all passing
nub run check
# expect: green
```

## 5. Two-direction proof

Remove `testId={testId}` from `renderText`'s `<text>`:

```sh
nubx vitest run src/components/presentational.test.tsx
# expect: "forward the automation id the caller gave them" fails on the first id
nubx vitest run --config vitest.runtime.config.ts runtime/layout.runtime.test.tsx
# expect: "addresses a Text element by the testId ..." fails
```

Restore both: green.

## 6. Measured results

2026-10-17, this worktree:

- `nub run --filter @gpuixui/primitives test` → **149 passed**;
- `nub run --filter @gpuixui/primitives test:runtime` → **52 passed**;
- `nub run check` green.

Two-direction: without the `testId` on `renderText`, the offline test fails with
`the element tree did not carry what this test asserts on` and the runtime test
fails on the missing element; restoring it makes both pass.

## 7. STOP conditions

- `<text>` rejects `testId` at the type level → do not cast; record the runtime
  limitation in `COMPONENTS.md` and leave `Text` without one.
- `nub run check` cannot stay green.
