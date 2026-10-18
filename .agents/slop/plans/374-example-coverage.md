# 374 — The two components with no example, and the guard that keeps it that way

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `060`, `065`, `071`, `073`, `092`, `341`, `345`, `347` |
| Status | done |

Self-contained: §0 the measured values, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. What was measured before the plan (2026-10-18)

The mission's component bar says every component has "at least one working
example"; the package's own docs index (`packages/primitives/docs/README.md`)
records an example per page. Both were hand-maintained.

Three facts:

1. **`Tooltip` is the only public component no example renders by name.** A scan
   of the (then thirteen) example files for `<Name>` found every other component.
   `InfoTip` is rendered by the feedback example and wraps `Tooltip` internally,
   so the tooltip *mechanism* is mounted — but no example uses `Tooltip`'s own
   API (`content`, `side`, `align`, a slot trigger), which is exactly the
   composition plan `341` fixed and plan `345` extended.
2. **A second gap is hidden behind a shared prefix.** The first scan matched
   `grep -F "<Checkbox"`, which is also satisfied by `<CheckboxGroup`; a
   boundary-aware check (`<Name` followed by whitespace, `/` or `>`) reported
   **`Checkbox`** as the second component no example renders. The standalone
   box only appears through the group, which paints its own row and calls no
   `Checkbox` component.
3. **The docs index links both at other screens**: `Tooltip` at the feedback
   example (only `InfoTip`), `Checkbox` at the selection example (only
   `CheckboxGroup`). Neither link is false — both surfaces paint — but neither
   demonstrates the component the page documents.
4. **Nothing guards the bar.** `runtime/examples.runtime.test.tsx` proves the
   registry and the screen list agree (plan `092`), and `src/exports.test.ts`
   proves every public component has a page. Neither says a component is
   *rendered* by an example, so a new component can ship with a page, a test and
   an inventory row and no example, and every suite stays green.

The tree at the time of writing: offline `659` tests in `45` files, runtime
`610` tests in `32` files, icons `24`.

## 1. The decision

**An example covers a component only when it renders that component by name;
the package enforces it.** Add a `Checkbox` screen (a tri-state asset table) and
a `Tooltip` screen (release actions), register both with the runtime suite
(which mounts them in both palettes), and add one source-scan guard that fails
by component name when the set drifts.

Rejected alternatives:

- **Count `InfoTip`/`CheckboxGroup` as their components' examples.** The bar
  says *working example*, and the thing a consumer copies is the composition:
  `Tooltip` around a focusable control (its tip also becomes that control's
  description), and a standalone tri-state `Checkbox` in a column where the name
  is context rather than a hit area. The variants demonstrate neither API.
- **Put the tooltip in the feedback example and the checkbox in the selection
  example.** Both screens already have a job; mixing an unrelated composition
  into them makes the example harder to copy and does not show `indeterminate`,
  `side` or `align`.
- **Guard only the docs table.** A table guard would pass today (both links
  exist) and would not notice a component no example renders; source coverage is
  the invariant that matters.
- **Type-level enforcement** (a required `example` field on the component
  contract) would couple runtime components to the example registry, which
  `apps/playground` also consumes. A source scan is the smallest honest check.

## 2. The rule

```ts
// src/example-coverage.test.ts (shape)
const componentNames = (indexSource) => /* PascalCase value exports */;
const renders = (sources, name) =>
  new RegExp(`<${name}(?=[\\s/>])`).test(sources);

expect(missing).toStrictEqual([]); // names, one line each
```

- The component list comes from the **real public surface**
  (`src/components/index.ts`), skipping `export type` and camelCase helpers.
- Coverage is a **rendered element**, not an import, and the trailing boundary is
  required: `<Button` must not be satisfied by `<ButtonGroup`, or `Checkbox` by
  `<CheckboxGroup` (the exact miss §0.2 records).
- `ThemeProvider` and `MissingThemeProviderError` are the two allowlisted
  exports: the provider is supplied by the host/fixture (the docs table says
  "every example (host-supplied)"), and the error is not a component. The
  allowlist lives beside the guard with that reason, and the guard fails if an
  allowlisted name stops being a public export.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/examples/tooltip.example.tsx` | **new** — a release-actions card: `Tooltip` around `Button`, `IconButton` and `Toggle`, caller-owned publish state, status line, root `testId="tooltip-example"` |
| `packages/primitives/examples/checkbox.example.tsx` | **new** — a release-asset table: a tri-state header `Checkbox` over three standalone row boxes, caller-owned selection, status line, root `testId="checkbox-example"` |
| `packages/primitives/examples/index.ts` | register `checkbox: CheckboxExample` and `tooltip: TooltipExample` |
| `packages/primitives/runtime/examples.runtime.test.tsx` | `SCREENS` entries `checkbox`/`tooltip`; one interaction case each (tri-state → select all; hover a tip → publish) |
| `packages/primitives/src/example-coverage.test.ts` | **new** — the guard from §2 |
| `packages/primitives/docs/README.md` | the `Checkbox` and `Tooltip` rows link their own examples; note the coverage guard under "Page contract" |
| `packages/primitives/docs/checkbox.mdx`, `docs/tooltip.mdx` | a worked-example line in `## Verification`, naming the screen and what it proves |
| `COMPONENTS.md` | the `Checkboxes` and `Tooltips` rows record the mounted examples (plan `374`) |
| `TODO.md` | a ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | this plan's row |

No component code changes. Both examples use only public exports.

## 4. Commands

```sh
nub run --filter @gpuixui/primitives test            # expect 660 (659 + 1 guard)
nub run --filter @gpuixui/primitives test:runtime    # expect 612 (610 + 2 screens)
nub run --filter @gpuixui/primitives check-types
nub run check                                        # check-tests, lint, format, all types
```

## 5. Test plan and the two-direction proof

**Guard** (`src/example-coverage.test.ts`) — "renders every public component in
at least one example".

- Green direction: 31 components + provider; `Checkbox` found in
  `examples/checkbox.example.tsx` and `Tooltip` in `examples/tooltip.example.tsx`
  by the new screens.
- Failing direction A (the bug being fixed): before the examples existed the
  guard reported `Checkbox` and `Tooltip` (measured; §0). Removing either
  example's blocks now fails by that name.
- Failing direction B (a new component ships with no example): add a temporary
  `export { Placeholder }` to `src/components/index.ts` with a trivial function,
  run the suite, see `Placeholder` named; remove it. This proves the guard reads
  the surface rather than a hard-coded list.
- Failing direction C (prefix collision): the `(?=[\s/>])` boundary is what
  caught `Checkbox`; delete the standalone `<Checkbox` blocks from the new
  example while `<CheckboxGroup` remains in the selection example and the guard
  must still name `Checkbox`. Same for `<Button` vs `<ButtonGroup`.
- Failing direction D (stale allowlist): remove `ThemeProvider` from the public
  index and the guard's allowlist assertion fails naming it.

**Runtime** (`runtime/examples.runtime.test.tsx`):

- "selects release assets through the checkbox example": the header box
  announces `mixed`, the status reads "1 of 3 selected", clicking a row box
  repaints "2 of 3", and clicking the header selects all three and announces
  `checked`.
- "opens the tooltip example's tips and publishes the release": the delete
  tip is absent, hover paints "Delete this draft permanently.", and clicking
  Publish repaints "Published to the stable channel."
- Failing directions: drop a row's `onValueChange` and the status assertion
  fails; drop the `Tooltip` wrapper (or the injected handlers from `Button`,
  plan `341`'s bug) and the hover assertion fails; break the status text and
  the click assertion fails.
- The existing "paints every example from the dark palette" iterates `SCREENS`,
  so both new screens are covered in `testThemeDark` automatically; each root
  must be a `tone="card"` `Box`.

## 6. STOP conditions

Stop and report if:

- `src/components/index.ts` cannot be parsed for value exports without a
  dependency (do not add a parser; the regex in §2 is enough — STOP if not);
- the runtime hover on an `IconButton` inside a `Tooltip` does not paint the
  tip (that would reopen plan `341`/`345`; record the measurement, do not weaken
  the assertion);
- adding the screens changes any existing test count other than the expected
  (+1 offline, +2 runtime);
- a lint/format/type gate fails for a reason outside this plan's files.

## 7. Outcome

Measured after implementation (2026-10-18):

- the guard reported `Checkbox` and `Tooltip` before the fix and passes after
  it; the prefix direction was observed on the first run (a `grep -F` scan had
  hidden `Checkbox` behind `<CheckboxGroup`);
- a first probe of the declaration-form direction passed **silently**: the guard
  only parsed `export { … }` blocks, so an `export const Placeholder` was not
  part of the surface. It now also parses `export const|function|class` and the
  same probe fails naming `Placeholder` (removed afterwards) — the blind spot
  was found by trying to prove the guard wrong;
- both runtime cases paint and interact in the real `TestRenderer`; the
  tri-state header announces `mixed` then `checked`, and the delete tip opens on
  hover;
- offline `660` tests in `46` files; runtime `612` tests in `32` files (two new
  screens); icons unchanged at `24`;
- `nub run check` green.

## 8. Acceptance

- `Checkbox` and `Tooltip` each have a mounted, registered example that uses
  their own API and a caller-owned interaction.
- Every public component is rendered by at least one example, and a new
  component with no example fails by name.
- The docs index points both pages at their own examples; both pages and the
  inventory record it.
- All gates in §4 pass.
