# 027 — One `## API` section per Tier 1 page, and a guard that it is true

- **Status:** done
- **Phase:** F (documentation truth / component-page contract)
- **Depends on:** `040`, `047`, `074`, `090`
- **Owner:** primitives workstream (`packages/primitives`)

## 1. The gap

Every public Tier 1 component has an in-package page, and the page contract
(`src/contract.test.ts`) requires `Usage`, `Keyboard`, `Accessibility`,
`Theming`, `Limitations`, `Verification` and `Related`. The mission's page
requirement also includes **API/prop docs**, and the pages do document props —
but not in a consistent place:

- 24 pages put the prop table under `## API`;
- **7 pages** — `meter`, `number-field`, `otp-field`, `rating`, `slider`,
  `range-slider`, `toggle` — put the same table under
  `## Variants, sizes and states`;
- `textarea` puts its two extra props under `## API` and the shared field props
  in prose.

So a consumer (and the docs-site workstream, which adapts these pages) cannot
rely on where the props are, and nothing stops a new prop from shipping with no
row at all. `src/docs.test.ts` in `packages/icons` already compares a page's API
table to `IconProps` (plan `357`); `packages/primitives` has no equivalent, so
this package — the one with 31 parts — is the unguarded half.

This is a documentation-contract gap, not a behaviour change: every table
already exists and is accurate. The fix normalises the heading and adds the
missing guard.

## 2. Decision

- Every component page has exactly one `## API` section, placed after
  `## Variants, sizes and states` (the convention the other 24 pages follow).
  The prop table moves there; the behaviour prose that followed it stays under
  `## Variants, sizes and states`.
- `## API` joins the required sections in `src/contract.test.ts`.
- A new assertion in that file parses each part's own props from source and
  requires the page's API section to name every one of them (as a table row or a
  code span), and requires every table key in the API section to be a prop that
  exists somewhere in the package.
- `children` is exempt from the coverage check: it is composition, shown by the
  usage block, not a row in every table (`Tooltip` documents it; `Button` does
  not). Inherited props (`TriggerHandlers`, a spec interface's fields) are
  allowed table keys but are not required, because the pages document the slot
  contract once on `Button`/`Tooltip`.

No public type changes. No runtime change.

## 3. Steps

### 3.1 Move the seven tables under `## API`

Files (each: insert `## API` before the `| Prop |` table; move the paragraphs
that currently follow the table to *before* the new heading, so the API section
is the table and nothing else):

- `packages/primitives/docs/meter.mdx`
- `packages/primitives/docs/number-field.mdx`
- `packages/primitives/docs/otp-field.mdx`
- `packages/primitives/docs/rating.mdx`
- `packages/primitives/docs/slider.mdx`
- `packages/primitives/docs/range-slider.mdx`
- `packages/primitives/docs/toggle.mdx`

Shape for each (the prose differs per page; do not rewrite it):

```md
## Variants, sizes and states

<the paragraphs that used to follow the table>

## API

| Prop | Type | Default | Consequence |
| ---- | ---- | ------- | ----------- |
| … the existing rows, unchanged … |
```

Do not change any row's text, and do not change the section order otherwise.
`textarea.mdx` already has `## API`; leave it as it is (its prose form is the
documented shared-props shape and the new guard accepts code spans).

### 3.2 Require the section

In `packages/primitives/src/contract.test.ts`, add `"## API"` to
`REQUIRED_SECTIONS`, with `## Variants, sizes and states` still not required
(three pages legitimately have no variants section).

Run:

```sh
nub run --filter @gpuixui/primitives test -- contract
```

**Expected:** green after 3.1 (if any page is still missing the heading, the test
fails by page name — finish 3.1 rather than weakening the list).

### 3.3 Add the prop-coverage guard

In the same file, add:

1. **A source index.** Read every non-test file under `src/components` and
   `src/core` (the existing `read`/`readDir` helpers). Index every
   `interface <Name>` and `type <Name> = …` — exported or package-local, because
   bases such as `ToggleGroupBase` are local and must still be resolvable.
2. **`ownProps(name)`** — the props the part's props declaration owns, following
   local bases:
   - `interface X { … }` → the identifiers before `:` in its balanced body,
     plus `ownProps` of each plain `extends` base (a local base such as
     `ToggleGroupBase` or a `core/` spec such as `BoxSpec` counts);
   - `interface X extends TriggerHandlers` → the body only. The slot contract is
     documented once on `Button`/`Tooltip`, not nine rows on every control;
   - `interface X extends Omit<ButtonProps, …>` → the body only (`IconButton`
     documents the subset of `Button` it keeps);
   - `export type X = A | B` → `ownProps(A) ∪ ownProps(B)`;
   - `export type X = A` → `ownProps(A)`;
   - `export type X = Omit<A, "k" | …> & { … }` → `ownProps(A)` minus the
     omitted keys, plus the inline fields;
   - `export type X = { … }` → the inline fields.
   Use a brace-balanced body reader, not a first-`}` split.
3. **`knownProps`** — every field declared by any indexed interface or inline
   object literal, plus the quoted names of a `Pick<Props, …>` alias
   (`TriggerHandlers` is one). A table key outside it is a phantom prop.
4. **`documentedNames(page)`** — the first-cell table keys of the `## API`
   section (splitting `a / b`) plus every code span in that section's
   non-table lines. `documentedNames` must therefore contain every own prop
   except `children`.
5. **Two assertions**, aggregated so a failure names every offender:

```ts
it("documents every prop each part declares", …)
// expect([{ part, missing: [...own].filter(p => p !== "children" && !documented.has(p)) }])
//   .toStrictEqual([])

it("names only props that exist", …)
// expect([{ part, unknown: tableKeys.filter(k => !known.has(k)) }])
//   .toStrictEqual([])
```

The part list is the existing `PARTS` table; the props type is
`` `${part.name}Props` `` and must be indexed (a missing declaration fails the
first assertion by part name).

Run:

```sh
nub run --filter @gpuixui/primitives test -- contract
```

**Expected:** green. If a page is reported missing a prop, add the row to its
API table in the same style as its neighbours (do not remove the prop from
source, and do not add the name to an allowlist).

### 3.4 Prove both directions

- **Coverage direction:** delete one row from `docs/toggle.mdx`'s API table and
  run the contract suite — it must fail naming `Toggle` and `pressed`. Restore.
- **Phantom direction:** change a table key in `docs/meter.mdx` to `vale` and run
  — it must fail naming `Meter` and `vale`. Restore.
- **Section direction:** delete `## API` from `docs/slider.mdx` and run — it must
  fail on the required-section list. Restore.
- Re-run the suite; all green.

### 3.5 Gates

```sh
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
nub run test
```

**Expected:** all exit `0`. The offline primitives count rises by the new
assertions (two tests, independent of the 31 parts).

## 4. STOP conditions

- A page's existing table disagrees with its props type in a way that needs a
  **behaviour** decision (e.g. the table documents a prop that no longer exists
  because the component changed): stop, record it as a `TODO.md` row with the
  evidence, and do not silently delete the row.
- The props parser would need to understand a shape outside the five listed in
  §3.3: stop and report the declaration rather than adding a broad regex that
  matches arbitrary text.
- The change would need a file outside `packages/primitives/docs`,
  `packages/primitives/src/contract.test.ts`, `TODO.md` and this plan: record it
  in `TODO.md` instead.
- Any temptation to change component source or public props to satisfy the docs:
  out of scope.

## 5. Test plan (what must be able to fail)

| Direction | Test | Fails when |
| --- | --- | --- |
| every own prop documented | `contract.test.ts` coverage case | a prop is added but no API row/code span names it (the pre-plan tree fails on none; deleting a row proves it) |
| no phantom props | `contract.test.ts` phantom case | a row is renamed to a key no interface declares |
| every page has the section | `REQUIRED_SECTIONS` | a page's `## API` heading is removed |
| the seven pages are normalised | the same coverage case | a moved table loses a row |

The guard reads source and markdown, so it is runtime-free: the proof does not
depend on the native binding and runs in the default `test` script.

## 6. Acceptance

- All 31 component pages have one `## API` section holding their prop table.
- Every own prop of every part is named in its API section; every API table key
  is a real prop.
- The three mutation directions above were run and failed as described.
- `nub run check`, `nub run lint`, `nub run test` and the package test pass, and
  the commands were actually run.
- `TODO.md` records the task as done; `COMPONENTS.md` needs no status change
  (every Tier 1 row already carries its page link and stays `wip` for the
  published-binding reason).

## 7. Deliberately out of scope

- The docs-site's own copies of these pages (owner: docs-site). Its TODO row
  already lists the six missing pages; this plan only makes the in-package
  sources consistent for it to adapt.
- A build-time API extractor. The repo's convention is a source-reading test
  (plan `357`), which needs no new dependency.
- `## Variants, sizes and states` as a required section: `Progress`, `Spinner`
  and `Meter` state everything in `Accessibility`/`Theming` and have no
  variants to enumerate.

## 8. Outcome (measured 2026-10-19)

- The seven pages now carry `## API`; the behaviour prose that followed each
  table stays in a named section before it (`Values` for Rating/Slider,
  `Code handling` for OTP, `Draft and precision` for NumberField, the existing
  variants section for Toggle; Meter and Range slider had nothing after the
  table, so the heading is the only change).
- `src/contract.test.ts` requires `## API` and gains the two API-table
  assertions, backed by a brace-balanced declaration reader. The reader follows
  local bases, `Omit<…>` intersections, unions and `Pick<…>` aliases; it skips
  `TriggerHandlers` and `Omit<Base, …>` so the pages document the slot contract
  once rather than on every control.
- The first run found one real doc gap — `Toggle`'s table did not name
  `aria-description` although the prop is public and the page describes it in
  prose — which is now a row.
- Mutation proofs, each run:
  - deleting `Toggle.pressed`'s row → `docs/toggle.mdx: Toggle.pressed`;
  - renaming `Meter.value` to `vale` → both `Meter.value` (missing) and
    `meter.mdx: vale` (phantom);
  - deleting `## API` from `slider.mdx` → `slider.mdx: ## API` plus every
    Slider prop.
- Commands, all exit `0`:
  - `nub run --filter @gpuixui/primitives test` — **722 passed** (720 before;
    the two API-table cases).
  - `nub run check` (includes `check:tests`, lint, format and every package's
    `check-types`), `nub run lint`, and `nub run test` (the whole workspace).
- `COMPONENTS.md` needed no status change: the Tier 1 rows already link these
  pages and stay `wip` for the published-binding reason, not for docs.
