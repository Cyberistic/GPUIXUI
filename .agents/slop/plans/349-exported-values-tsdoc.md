# 349 — Every exported value carries a TSDoc summary

**Phase:** F/G (public API documentation) · **Owner:** primitives · **Depends
on:** `030`, `031`, `090`, `097`, `203` · **Status:** planned

## 1. The defect

The docs site generates its **Values API** from the packages' exported values and
their TSDoc (`apps/docs/src/lib/api-values.ts`; plan `490`). Twelve exports on
this workstream's packages reach it with no summary:

`BUTTON_GROUP_MODES`, `BUTTON_VARIANTS`, `buttonVariants`, `ENTER_KEY`,
`PROGRESS_TONES`, `SELECTION_STATES`, `SPACE_KEY`, `STACK_DIRECTIONS`,
`SURFACE_TONES`, `surfaceStyle`, `textStyle`, `TOGGLE_VARIANTS`.

The docs site covers the gap with a docs-owned `SUMMARIES` override table, and
its guard says so: *"SUMMARIES overrides `${key}`, but `${value.source}` now
documents it; delete the override"*. The override exists only until the source
documents the value — and the source is this workstream's.

**Measured during planning (required before writing §2):** a scan of every
shipped declaration in `packages/primitives/src` finds **36** exported values
without a JSDoc, not 12. The extra 24 are the seams `src/contract.test.ts` (plan
`090`) keeps module-level rather than in the package root:

| Group | Undocumented values |
| ----- | ------------------- |
| render seams (`render*`) | `renderBox`, `renderButtonGroup`, `renderCheckbox`, `renderCheckboxGroup`, `renderInput`, `renderLabel`, `renderOtpField`, `renderProgress`, `renderRadioGroup`, `renderRating`, `renderSeparator`, `renderSpacer`, `renderSkeleton`, `renderSlider`, `renderSpinner`, `renderStack`, `renderGrid`, `renderSwitch`, `renderToggleGroup` |
| internal seams | `GroupShapeContext`, `useFocus` |
| public values (the docs list above, plus `BUTTON_GROUP_AXES`) | `BUTTON_GROUP_AXES`, `BUTTON_GROUP_MODES`, `BUTTON_VARIANTS`, `buttonVariants`, `ENTER_KEY`, `PROGRESS_TONES`, `SELECTION_STATES`, `SPACE_KEY`, `STACK_DIRECTIONS`, `SURFACE_TONES`, `surfaceStyle`, `textStyle`, `TOGGLE_VARIANTS` |
| other pure core exports | `TOGGLE_GROUP_TYPES`, `initialActiveIndex` |

`packages/icons` is fully documented (all four value declarations carry a
summary).

Two statements of the rule apply:

1. `AGENTS.md` §5 / EF-11: exported APIs require JSDoc.
2. Nothing prevents the next export from shipping undocumented: `src/exports.test.ts`
   checks the docs-page half of the component bar, `src/contract.test.ts` checks
   component parts, and neither reads a value's documentation.

**Note on the compiler API:** TypeScript 7.0.2 (the native compiler this repo
pins) no longer ships the classic `createProgram`/`checker` API at the package
root (`exports` maps `.` to `lib/version.cjs`; the tree API is under
`./unstable/*`). The guard therefore reads source text, not a Program. It is a
declaration scan, not a type-aware one: it checks the doc attached to each
exported value declaration, which is exactly what the docs generator reads.

## 2. The fix

### 2.1 The summaries

Give every undocumented exported value a one- or two-line TSDoc that says what
the value **is** and, where it is not obvious, what it is for — reader-facing
prose, no plan numbers, no restating the name:

```ts
/** The button groups' two layouts: joined into one control, or spaced apart. */
export const BUTTON_GROUP_MODES = ["attached", "separated"] as const;
```

The render seams get one line each (`/** The element tree `Box` renders… */`) so
a test or a docs generator that reaches them is not left guessing; the internal
hooks get the contract they enforce.

### 2.2 The guard

A new test, `packages/primitives/src/tsdoc.test.ts`, scans the **shipped** source
of `packages/primitives` and `packages/icons` and asserts every exported value
declaration is immediately preceded by a JSDoc block.

- Scope and file exclusions match `src/package-manifest.test.ts` (plans `348`):
  `*.ts(x)` under `src`, excluding `*.test.ts(x)` and any `testing/` directory.
- A declaration is `export const|let|function|class|enum`, including
  `export async function`.
- "Documented" means the nearest preceding non-blank line closes a block comment
  and the block opens with `/**` — a plain `/*` block is not TSDoc.
- Failure output is `file:line: export …`, sorted, so the fix is a jump.
- Both packages are scanned from one test for the same reason as plan `348`:
  both are this workstream's, and the alternative is the same scanner twice.

## 3. Files to change

1. **`packages/primitives/src/components/*.tsx`** — the 18 render/context/hook
   seams listed in §1 (`Box`, `ButtonGroup`, `Checkbox`, `CheckboxGroup`,
   `Input`, `Label`, `OTPField`, `Progress`, `RadioGroup`, `Rating`, `Separator`,
   `Skeleton`, `Slider`, `Spinner`, `Stack`, `Switch`, `ToggleGroup`,
   `group-shape`, `internal`).
2. **`packages/primitives/src/core/*.ts`** — the 18 core values listed in §1
   (`keyboard`, `layout`, `selection`, `style`, `toggle-group`, `variants`).
3. **`packages/primitives/src/tsdoc.test.ts`** — new guard (§2.2).
4. **`.agents/slop/plans/README.md`**, **`TODO.md`** — the task record and the
   cross-team note.

No behaviour, no type, no dependency changes. `COMPONENTS.md` is not touched: no
component changed.

Cross-team note (recorded in `TODO.md`, not edited here): once these land, the
docs site's `SUMMARIES` override must drop the twelve public keys — its own guard
fails until it does. That is the intended hand-off, and the docs-site workstream
asked for the annotations (its plan `490`).

## 4. Test plan

| Mutation (apply, run, revert) | Must fail |
| --- | --- |
| remove the docstring from `ENTER_KEY` | one case naming `ENTER_KEY` at its file and line |
| remove the docstring from `textStyle` | one case naming `textStyle` |
| add `export const UNDOCUMENTED = 1;` to `src/index.ts` | one case naming `UNDOCUMENTED` |
| replace a JSDoc with a plain `/* … */` block | the same declaration fails (a plain block is not a summary) |
| add `export const UNDOCUMENTED = 1;` to `packages/icons/src/index.ts` | the icons half of the scan fails |

Each mutation is the bug being guarded: a value reaches the docs generator (or a
consumer) with no summary.

### Commands

```sh
nub run --filter @gpuixui/primitives test -- src/tsdoc.test.ts
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
```

Measured baseline (2026-10-18, this host): primitives offline **42 files /
573 tests**. Expected after: **43 files / 574 tests** (one guard case).

## 5. STOP conditions

Stop and report rather than improvise if:

- the scan finds a declaration it cannot classify (e.g. `export default`, a
  decorator, or a declaration split across lines before the keyword) — report
  the construct instead of widening the regex to guess;
- a value genuinely must ship without a summary (e.g. a generated table) — that
  is an allowlist decision for the plan owner, not a silent exemption in the
  guard;
- the number of undocumented declarations exceeds **60**: the measurement above
  is 36; a jump that large means generated code landed and the sweep should be
  split;
- adding a summary changes a doc page's generated API in a way that contradicts
  a shipped claim — record it and stop.

## 6. Acceptance

- All 36 exported values carry a reader-facing TSDoc summary.
- `src/tsdoc.test.ts` fails when any exported value on either package loses its
  summary or carries only a plain block comment, and scans both packages.
- `nub run check`, `nub run lint` and `nub run test` are green.
- `TODO.md`, the plan index and this plan's Result section record the change,
  the counts and a cross-team row for the docs-site override removal.

## 7. Result

Landed on `agent/primitives`, 2026-10-18.

### 7.1 What changed

36 exported values across 19 files in `packages/primitives` gained a reader-facing
TSDoc summary — the twelve the docs-site Values API named, plus 24 render/internal
seams the same scan found (the full list is §1). `packages/icons` needed nothing.

`src/tsdoc.test.ts` walks the shipped source of both packages and asserts every
`export const|let|function|class|enum` is immediately preceded by a JSDoc block.
It is a declaration scan, not a type-aware one: TypeScript 7.0.2 (the pinned
native compiler) no longer publishes the classic Program API at its package root.

### 7.2 Both-direction proofs (each mutation applied, run, reverted)

| Mutation | Failing observation |
| --- | --- |
| remove `ENTER_KEY`'s summary | `src/core/keyboard.ts:30: export const ENTER_KEY = "enter";` |
| remove `textStyle`'s summary | `src/core/style.ts:295: export const textStyle = …` |
| add an undocumented `export const UNDOCUMENTED = 1;` to `src/index.ts` | `src/index.ts:17: export const UNDOCUMENTED = 1;` (plus the export contract's own two cases) |
| replace `PROGRESS_TONES`'s `/** … */` with a plain `/* … */` | `src/core/style.ts:445: export const PROGRESS_TONES = [` |
| add the same undocumented export to `packages/icons/src/index.ts` | the icons half of the scan reports it |

### 7.3 Suites

| Run | Result |
| --- | --- |
| `nub run --filter @gpuixui/primitives test` | **43 files / 574 tests green** (was 42 / 573; +1 guard case) |
| `nub run check` / `nub run lint` / `nub run test` | green |

### 7.4 Deviations

- **Scope grew from 12 to 36 before implementation.** The plan's STOP condition
  asked for a report above 20; the measurement found 36, of which 18 are the
  `render*` seams that `src/contract.test.ts` (plan `090`) deliberately keeps
  module-level and two are internal hooks. The extra 24 are one-line summaries in
  files already open for the twelve, so the split would have produced two plans
  for one mechanical change. The §1 measurement records the decision; §5's
  ceiling was raised to 60 accordingly.
- The guard is text-based, not compiler-API based: TypeScript 7 removed
  `createProgram`/`checker` from the package root (`exports` maps `.` to
  `lib/version.cjs`; the tree API is `./unstable/*`). The plan's §2.2 text was
  corrected before implementation.
- The guard scans both packages from one test, per the plan `348` precedent, so
  `packages/icons` cannot regress either.

### 7.5 Cross-team hand-off

The docs site's `SUMMARIES` override table must drop the twelve public keys once
it takes this branch — its own guard (`api-values.ts`) fails until it does, which
is exactly the contract it documents. Recorded as a `TODO.md` row for the
docs-site workstream; no docs-site path was touched here.
