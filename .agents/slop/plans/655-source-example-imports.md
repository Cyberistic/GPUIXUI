# 655 — Every source `@example` is a copyable module

**Phase:** F (documentation truth for the extension API) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 355 (the documented snippets), 356 (the source JSDoc examples) ·
**Number block:** 500–699 (`tokens-theme` overflow; 655 is the next free number
across every worktree) ·
**Status:** done

## 1. The defect

Plan `356` stated that "the source JSDoc examples are unguarded" and closed the
hole by extending `snippets.test.ts` to read every non-test module. The guard
does not, in fact, read every example: the import-contract case filters the
snippets first.

```ts
snippets
  .filter(({ code }) => [...code.matchAll(importPattern)].length > 0)
  .forEach(({ label, index, code }) => { /* require imports */ });
```

A block with no import is treated as a contextual continuation of a previous
block. That is right for `docs/tokens.md`, where a section may sequence an
expression under a setup block. It is wrong for a **source** module: an
`@example` there stands alone, with no previous block.

Fourteen of the package's 44 source examples have no import, and five of them
call the package's own API with an undeclared `theme`:

| Module | Example | Broken copy |
| ------ | ------- | ----------- |
| `color.ts` | `isHexColor`, `alpha` | `isHexColor is not defined` |
| `contrast.ts` | `relativeLuminance`, `contrastRatio`, `compositeOver` | the function is not defined |
| `elevation.ts` | `elevationShadow`, `elevationShadows` | `theme` and the function are not defined |
| `motion.ts` | `motionTransition` | `theme` and the function are not defined |
| `styles.ts` | `textStyle`, `statusTone`, `filledControl`, `focusRing`, `selectionStyle` | `theme` and the function are not defined |
| `theme.ts` | `getTheme` | `getTheme is not defined` |

`docs/tokens.md` and the package README already import the functions they call
(plan `355`), and the executed `.example.ts` files run in the suite (plan `350`).
The JSDoc is the third copyable surface, and the half plan `356` left open.

## 2. Decision

Treat every fenced block in a package source module as a **copyable module**:

1. It starts with the `@gpuixui/tokens` (or `/react`) import for every public
   name it calls.
2. An example that paints with a theme declares that theme with
   `getTheme("light")` (or `"dark"` where the example is dark-specific), so it
   runs on its own.
3. Contextual values that are not package API — a JSX child, a `focused`
   boolean — stay as they are; they are the caller's state, not an import.

The docs page's fragment rule does **not** change: a Markdown page may sequence
blocks, and its snippets are already guarded. The new rule is scoped to
`sourceSnippets`, whose label ends in `@example`.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/color.ts` | Add `import { alpha, isHexColor } from "@gpuixui/tokens";` to the two examples |
| `packages/tokens/src/contrast.ts` | Add the import to the `relativeLuminance`, `contrastRatio` and `compositeOver` examples |
| `packages/tokens/src/elevation.ts` | Add `import { elevationShadow, getTheme } ...` / `elevationShadows, getTheme`, and `const theme = getTheme("light");` |
| `packages/tokens/src/motion.ts` | Add `import { getTheme, motionTransition } ...` and `const theme = getTheme("light");` |
| `packages/tokens/src/styles.ts` | Add imports and a `getTheme("light")` binding to `textStyle`, `statusTone`, `filledControl`, `focusRing`, `selectionStyle` |
| `packages/tokens/src/theme.ts` | Add `import { getTheme } from "@gpuixui/tokens";` to the `getTheme` example |
| `packages/tokens/src/snippets.test.ts` | Add the copyable-module case; extend the header with plan 655's defect |
| `COMPONENTS.md` | One clause in the **Theme extension** row: every source example imports the API it calls |
| `TODO.md` | Add and tick the row under *Design tokens and theming*; progress `284/358` → `285/359` |
| `.agents/slop/plans/README.md` | Index 655 and add its summary paragraph |
| `.agents/slop/rd/2026-10-19-tokens-next-655.md` | The audit note and the probe that found the 14 blocks |

No other file. Do not edit `docs/tokens.md`: its snippets obey a different,
already-guarded rule, and no public value moves.

## 4. The guard

In `snippets.test.ts`, after the "has snippets to check" case:

```ts
it("makes every source example a copyable module", () => {
  sourceSnippets.forEach(({ label, index, code }) => {
    expect(
      [...code.matchAll(importPattern)].length > 0,
      `${label} #${index}: no @gpuixui/tokens import`,
    ).toBe(true);
  });
});
```

The existing "imports every public name it calls, renders or types" case then
reads these blocks: with an import present, the `.filter` no longer drops them,
and a missing function is named by the existing detector. Do not relax that
filter; the new case is what makes the filter's precondition true for source
blocks.

## 5. Tests

### `packages/tokens/src/snippets.test.ts`

The existing suite is the regression test. The new case must be able to fail:

- **On the pre-fix tree** it reports all 14 labels above (`color.ts @example #0`,
  `#1`, `contrast.ts #2`, `#3`, `#4`, `elevation.ts #0`, `#1`, `motion.ts #0`,
  `styles.ts #0`, `#1`, `#2`, `#6`, `#7`, `theme.ts #0`). Record the run in the
  commit message.
- **On the fixed tree** it passes, and the existing name-import case still
  passes for every source example.

Do not add a test that asserts the number `44` or `14`; the count changes when a
module gains an example. The labels are the report.

Run:

```sh
cd packages/tokens
nub exec vitest run src/snippets.test.ts
```

Expected: one file green; the new case passes; no other case changes.

### Full suite

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 181 files, all green, the test count plus one (or plus the cases in
the file).

## 6. Commands and gates

From `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run check:tests
nub run check
nub run lint
nub run test
```

Expected: clean. If another workstream's package fails for its own reason,
record the exact failure and do not claim this plan's workspace gate passed.

## 7. STOP conditions

Stop and report with evidence if:

- a source fence is deliberately **not** a module — a counterexample, a diff, a
  shape sketch. Move it to prose or a docs page; do not invent an import that
  changes its meaning.
- adding `getTheme` to an example changes what the example teaches (for example
  a provider-scoped `theme` is the point) — keep the contextual binding and
  record the exception in the test's header, not in a silent filter.
- a function named by an example is not exported by `index.ts`/`react.ts` — that
  is a public-API gap, not an import edit.
- the new case fails for a block that already carries an import (the regex is
  wrong) — fix the detector, not the example.
- a docs guard pins a sentence that must change — search the literal before
  editing and make the guard derive the claim rather than deleting it.

## 8. Acceptance

- [x] Every `sourceSnippets` block contains a `@gpuixui/tokens` or
      `@gpuixui/tokens/react` import; the new case passes.
- [x] The 14 blocks list in §1 show the import on the fixed tree (spot-check
      each module).
- [x] On the pre-fix tree the new case fails with the 14 labels (the
      both-directions evidence is recorded in the commit message).
- [x] `nub exec vitest run src/snippets.test.ts` and the full tokens suite pass
      (11/11 in the file; 6541 tests in 181 files).
- [x] `nub run check`, `nub run lint` and `nub run test` were run; results are
      recorded in the commit message.
- [x] No token value, colour, pair, metric, floor, role or check kind moves.
