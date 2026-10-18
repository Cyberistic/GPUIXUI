# 090 — Tier 1 adopts the component API contract

| Field | Value |
| ----- | ----- |
| Phase | F (hardening) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `047`, `074`, `079`, `080`, `081`, `084`, `088`, `089`, `200` |
| Status | **in progress** |

Self-contained: §1 the gap, §2 the contract this package must prove, §3 the
files, §4 the checks and the two-direction proofs, §5 STOP conditions, §6 the
outcome.

---

## 1. The gap

`docs/component-api.md` (components workstream, ADR `0004`, plan `200`) is the
accepted public API spec for every Tier 1–2 component. Its own adoption table
says so, and the integration branch's `TODO.md` carries the one row still open
for this package:

> `[ ]` `packages/primitives` adopts the same contract for Tier 1 (a parts
> table row is the spec; the package is owned by primitives) (owner: primitives)

Tier 1 already **follows** the rules in substance:

| Rule | Where it already lives |
| ---- | ---------------------- |
| controlled/uncontrolled names (§2) | plan `088`, `src/callback-names.test.ts` |
| state-aware `style` (§3) | plans `079`–`081`, every `<Part>State` type in `src/components/index.ts` |
| shared keyboard contract (§4) | `src/core/keyboard.ts`, plans `084` and `089` |
| accessibility subset (§5) | per-component element-tree assertions and the runtime suites |
| data-driven groups instead of compound children (§1) | D16, D25, D27 — a documented deviation, not a missing part |
| pages and examples | plan `047`, `src/exports.test.ts` (frontmatter + index only) |

What is **missing** is enforcement and a record:

1. **Nothing ties the parts table to the exports.** A new public component can
   ship without a record, a state declaration or the documented page sections.
   `exports.test.ts` checks only a page's frontmatter and its index link.
2. **Two implementation seams are public API.** Measured in
   `src/components/index.ts`:
   `IconButton` exports `iconButtonParts` and `renderIconButton` from the package
   root. They exist so the component's element-tree test can call the pure
   renderer; no consumer and no other module imports them. The contract's §1
   says one part exports one component and one props type — a renderer seam is
   not public surface.
3. **The contract's own Tier 1 table is missing four shipped parts**:
   `CheckboxGroup`, `ToggleGroup`, `IconButton` and `InfoTip`. That table lives
   in `docs/component-api.md`, which belongs to the components workstream, so it
   is recorded as a cross-team task rather than edited here.
4. **No cross-control guard for the accessibility subset.** Every component
   asserts its own ARIA props; nothing stops the next component from emitting
   `aria-checked`, which 0.10.0 silently drops.

A component added tomorrow, an accidentally public renderer or one unsupported
ARIA attribute are exactly the shapes that shipped `076`, `083` and `085`; the
fix is one guard across the set, not another per-component assertion.

## 2. The contract this package proves

**One record per public component: its part, its page, and the state types its
`style` props accept (none for a presentational part).** The table is the Tier 1 row of
`docs/component-api.md` §8, kept in `src/contract.test.ts` because the contract
doc is not this package's path. Seven assertions, each able to fail:

1. **The table is complete.** Every exported PascalCase value from the package
   root is a record, or one of the two named non-parts (`ThemeProvider`,
   `MissingThemeProviderError`) which `exports.test.ts` already owns.
2. **Every record is a part.** Each record's name is exported from the root as a
   function (a component cannot be a table row only).
3. **No implementation seam is public.** No root export matches `^render[A-Z]`
   or `[a-z]Parts$`. The seams stay module-level exports that their own test
   imports directly.
4. **Each state type is real.** For a record with a state, the module that
   declares it exports `interface <State>` or `type <State>` — a rename fails
   here instead of silently breaking the documented API.
5. **Each page names its state.** A page whose part has a state contains the
   state type name, so a consumer can discover it where the props are documented.
6. **Each page carries the contract's sections.** `## Usage`, a props section
   (`## API` or `## Variants`), `## Keyboard`, `## Accessibility`, `## Theming`,
   `## Limitations`, `## Verification`, `## Related`.
7. **No component emits an unsupported ARIA prop.** Scan every
   `src/components/*.tsx` for `aria-*` in property position (`name:` or
   `name=`), and allow only the verified 0.10.0 subset: `aria-label`,
   `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
   `aria-valuetext`, `aria-level`. Everything else — `aria-checked`,
   `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-labelledby`,
   `aria-describedby`, `aria-controls`, `aria-current`, `aria-modal`,
   `aria-haspopup`, `aria-pressed`, `aria-disabled` — fails by file and line.

Deliberate deviations, recorded in `packages/primitives/README.md` (not changed):

- `Input`, `TextArea` and `NumberField` share **one** `FieldState`: the state is
  the field chrome's, and the three parts paint the same chrome. The contract's
  `<Part>State` naming rule is satisfied for every part that owns a distinct
  state; the shared field name is the deliberate exception.
- The data-driven groups (`CheckboxGroup`, `RadioGroup`, `ToggleGroup`,
  `Rating`, `OTPField`) take options as data and have no compound children
  (D16, D25, D27). That is a shape deviation from §1, already accepted.
- `IconButton` takes `StateStyle<ButtonState>` because it *is* a `Button`; it
  owns no second state.
- No Tier 1 parent hosts child parts, so §1's typed-by-position children rule
  has nothing to narrow in this package.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/contract.test.ts` | **create** — the table and the seven assertions |
| `packages/primitives/src/components/index.ts` | drop `iconButtonParts` and `renderIconButton` from the root export |
| `packages/primitives/src/components/IconButton.tsx` | make `iconButtonParts` module-local (no `export`); keep `renderIconButton` a module export so `IconButton.test.tsx` keeps its pure renderer |
| `packages/primitives/README.md` | a "Component API contract" section: what is enforced, the deviations, and the two files that guard it |
| `TODO.md` | tick this task under the primitives section; add the cross-team row for the contract doc |
| `COMPONENTS.md` | one paragraph beside the focus/tab-order matrices naming the contract guard and its count |
| `.agents/slop/plans/README.md` | index this plan |

No other component changes unless a guard fails (§5).

## 4. Checks and the two-direction proofs

```sh
nub run --filter @gpuixui/primitives test        # expected: 38 files, +N tests, green
nub run --filter @gpuixui/primitives check-types
nub run check                                    # expected: exit 0
nub run lint                                     # expected: exit 0
nub run fmt                                      # expected: exit 0
```

**Direction A (a public component with no record).** Delete the `ButtonGroup`
record from the table. Run the suite: assertion 1 must fail naming `ButtonGroup`.
Restore.

**Direction B (an implementation seam back in the root).** Add
`export { renderIconButton } from "./components/IconButton.js";` to
`src/components/index.ts`. Run the suite: assertion 3 must fail naming
`renderIconButton`. Restore.

**Direction C (a page loses a contract section).** Delete `## Keyboard` from
`docs/button.mdx`. Run the suite: assertion 6 must fail naming `button.mdx` and
`Keyboard`. Restore.

**Direction D (a state type is renamed).** Rename `ButtonState` to `ButtonLook` in
`Button.tsx` and `components/index.ts`. Run: assertion 4 must fail naming
`Button` and `IconButton`. Restore. (Assertion 5 fails separately when the table
renames the state with the source and the page is not updated.)

**Direction E (an unsupported ARIA prop).** Add
`"aria-checked": checked` to the `Checkbox` host props. Run: assertion 7 must
fail naming `Checkbox.tsx` and `aria-checked`. Restore.

If an assertion fails **without** a deliberate mutation, that is a real
deviation: fix it, record it here with the before/after, and keep the assertion.

## 5. STOP conditions

- **Stop** if the contract's Tier 1 table and this package disagree on the *part
  list* beyond the four known extras: report the row and both readings rather
  than silently picking one.
- **Stop** if a state type is declared somewhere other than the component
  module (e.g. re-exported from `core/`): record which parts share it and add it
  to the table's `from` field instead of weakening assertion 4 for everyone.
- **Stop** if the ARIA scan cannot distinguish a prop from prose in a doc
  comment: restrict it to `src/components/*.tsx` property position and report
  the exact false-positive line; do not delete the guard.
- Do **not** add a `style` prop or a state type to a presentational part
  (`Box`, `Stack`, `Grid`, `Separator`, `Spacer`, `Text`, `Progress`, `Meter`,
  `Spinner`, `Skeleton`, `Tooltip`, `ButtonGroup`) to grow the table: the
  contract says a part with no state has no state, and a prop that exists only
  for the guard is a hack.
- Do **not** edit `docs/component-api.md` (outside this workstream): record the
  four missing rows as a cross-team `TODO.md` task.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 38 files, **428 tests green** (was 37 / 421; +1 file, +7 contract tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | 20 files, **263 tests green** — unchanged; the demoted `IconButton` seams are not imported by any other module |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` (root) | exit `0` |

Both-direction proofs, each measured by mutation and restored:

| Direction | Mutation | Failed assertion |
| --------- | -------- | ---------------- |
| A | dropped the `ButtonGroup` row from the table | `records every public component` — `expected [ 'ButtonGroup' ] to strictly equal []` |
| B | re-exported `renderIconButton` from `src/components/index.ts` | `keeps implementation seams out of the package root` — `[ 'renderIconButton' ]` |
| C | deleted `## Keyboard` from `docs/button.mdx` | `carries the sections every component page promises` — `button.mdx: ## Keyboard` |
| D | renamed `ButtonState` to `ButtonLook` in `Button.tsx` and the root | `declares every advertised state type` — `Button: no declaration for ButtonState`, `IconButton: no declaration for ButtonState` (assertion 5, the page's state name, fails when the table is renamed with it) |
| E | added `aria-checked={…}` to `Checkbox`'s host props | `emits only the ARIA props the runtime maps` — `Checkbox.tsx:125 aria-checked` |

Changed:

- `src/contract.test.ts` — the Tier 1 parts table (31 public components: page and
  state types) and the seven assertions.
- `src/components/index.ts`, `src/components/IconButton.tsx` — `IconButton` no
  longer leaks `renderIconButton`/`iconButtonParts` from the package root; the
  renderer seam stays module-level for its own element-tree test. This was the
  one real deviation the audit found.
- `packages/primitives/README.md` — the "Component API contract" section: what
  is enforced and the four deliberate deviations.
- `COMPONENTS.md` — the contract paragraph beside the focus and tab-order
  matrices.
- `TODO.md` — this task ticked; a cross-team row for the contract doc's four
  missing Tier 1 parts (`CheckboxGroup`, `ToggleGroup`, `IconButton`, `InfoTip`).
- `.agents/slop/plans/README.md` — this plan indexed.

No component behaviour changed. The audit found one deviation (a public
implementation seam), fixed here; the rest of the contract was already met in
substance by plans `079`–`081`, `084`, `088` and `089`, which is why the table
and the guards are the honest deliverable rather than a rewrite.

