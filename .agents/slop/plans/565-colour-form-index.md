# 565 — The alpha form owns its two members

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (theme contract truth) |
| Owner | `tokens-theme` |
| Paths | `packages/tokens/src`, `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` |
| Depends on | 540 (the opacity check), 543 (the floor-class index precedent), 558 (the deferred unit) |

## 1. The defect

`ColorForm` is the package's **last exported union without an ordered owner**:

```ts
// packages/tokens/src/opacity.ts
export type ColorForm = "opaque" | "translucent";
```

Every other domain union owns an index beside its narrowing guard —
`themeModes`, `themeContrasts`, `platformNames`, `densityNames`, `statusTones`,
`controlSizes`, `textRoles`, `motionLevels`, `motionPhases`, `metricRules`,
`metricGroups`, `typefaceRules`, `typefaceRoles`, `contrastPairClasses`,
`elevationLevels`, `colorRoles`. Plan 543 added `contrastPairClasses` for a
**diagnostics payload** with no stored boundary and no guard, which is the
precise precedent this union follows. Plan 558 deferred it: "`ColorForm` is the
package's last bare exported union, but it is a diagnostics payload with no
stored form or URL boundary; it is a separate, smaller unit".

The cost is small but real: `docs/tokens.md`'s `Types` row, a diagnostics view
that groups roles by the form they must take, and the opacity example all retype
`"opaque"` / `"translucent"`. A third form would join the type (and every
`switch` a consumer wrote) with no place that notices it is missing from a table
or from the example. The package's own rule is that the domain owns its order;
this is the last exception.

The fix is an index, not a new rule: `roleForm` is already total over the
palette, and the two members are already exercised by the shipped themes.

## 2. Decision

1. **`colorForms` is the ordered index.** `["opaque", "translucent"]`, the order
   the reference and the `ColorForm` row state (the common form first).
2. **`ColorForm` derives from it.** `(typeof colorForms)[number]`, the same
   pattern as `ContrastPairClass`.
3. **No `isColorForm` guard.** A form is produced by `themeOpacityFailures`;
   it never arrives from storage, a URL or a payload. Plan 558's boundary
   argument still holds, and plan 543 shipped its payload index without a guard.
   Adding one would be unused API.
4. **No new rule and no colour move.** `roleForm`, `translucentRoles`,
   `themeOpacityFailures` and every shipped theme are unchanged; the index only
   names the existing domain.

## 3. Exact edits

### 3.1 `packages/tokens/src/opacity.ts`

Replace the bare type with the index and the derived type:

```ts
/**
 * The alpha forms a colour role's value can take, in documentation order.
 * `ColorForm` derives from this list, so a form joins the type, `roleForm` and
 * every table that iterates the forms from one edit. It is an index, not a
 * stored choice: a form is produced by the opacity check, never decoded from
 * input, so it has no narrowing guard (plan 565).
 */
export const colorForms = ["opaque", "translucent"] as const;

/** The alpha form a colour role's value must take. */
export type ColorForm = (typeof colorForms)[number];
```

Extend the `roleForm` JSDoc sentence "Total over `colorRoles`..." with:

```
 * The two forms are `colorForms`, in documentation order; this rule decides
 * which one each role takes.
```

### 3.2 `packages/tokens/src/opacity.example.ts`

Add the executable grouping the index exists for:

```ts
import { colorRoles, type ThemeColors } from "./color.js";
import { colorForms, roleForm, themeOpacityFailures, type ColorForm } from "./opacity.js";
```

and, after the two failure pairs:

```ts
/** Every role grouped by the alpha form it must take, in index order. */
export const rolesByForm: ReadonlyArray<{
  readonly form: ColorForm;
  readonly roles: ReadonlyArray<keyof ThemeColors>;
}> = colorForms.map((form) => ({
  form,
  roles: colorRoles.filter((role) => roleForm(role) === form),
}));
```

`keyof ThemeColors` is the role key type `colorRoles` carries; import the type
from `./color.js`. Do not import `effect/Array`: the package is dependency-free
by design and its own modules use native array helpers.

Update the file header to say the grouping is derived from the form index.

### 3.3 `packages/tokens/src/color-forms.test.ts` (new)

Header comment states the unit plan 558 deferred and what the guard catches:

> `ColorForm` was the last exported union without an ordered owner. A docs
> table, a diagnostics view and the opacity example retyped the two names, and a
> third form would join the type with nothing to notice it had no role. These
> cases hold the index, the total rule and the executed grouping together.

Cases:

1. `colorForms` is exactly `["opaque", "translucent"]` — the documentation
   order, asserted as an independent expectation (not against itself).
2. Every `roleForm(role)` result is a member of `colorForms`, and the set of
   forms the palette produces has the same length as the index — a form added
   to `colorForms` with no role fails case 3, and a form `roleForm` could
   produce without being indexed cannot compile.
3. Every form has at least one role: `colorRoles.filter(role =>
   roleForm(role) === form).length > 0`. This is the case that fails if a third
   form is added to the index without a role (the discrimination proof in §4).
4. `themeOpacityFailures` names an indexed form in both directions: a
   translucent `shadow` reports `expected: "opaque"`; a solid `overlay` reports
   `expected: "translucent"`; each `expected` is in `colorForms`.
5. The executed `rolesByForm` lists the forms in index order, partitions every
   `colorRoles` member exactly once (sum of lengths equals the palette length,
   and the union has no duplicate), and has no empty group.
6. Every shipped theme still returns `[]` from `themeOpacityFailures`.

Use `shippedThemes` from `./shipped-themes.js` for case 6, matching the other
full-set suites (do not rebuild a list).

### 3.4 `packages/tokens/src/docs.test.ts`

Add a case beside the other public-value guards:

```ts
it("names every alpha form in the ColorForm row", () => {
  const line = markdown
    .split("\n")
    .find((candidate) => candidate.startsWith("| `ColorForm` |"));
  if (line === undefined) throw new Error("docs/tokens.md has no ColorForm row");
  colorForms.forEach((form) => expect(line).toContain(`"${form}"`));
});
```

Import `colorForms` from `./opacity.js` (the file already imports
`translucentRoles`).

### 3.5 `docs/tokens.md`

- **Types** table, `ColorForm` row: `| `ColorForm` | The alpha form a colour role's value must take, derived from `colorForms`: `"opaque"` or `"translucent"`. |`
- **Role opacity** paragraph (currently "`translucentRoles` is the index of the
  three veils, `roleForm` the total rule..."): name `colorForms` as the ordered
  index of the two forms before `translucentRoles`, and say the executed example
  groups `colorRoles` by it.
- The opacity code block may gain `colorForms; // ["opaque", "translucent"]`
  and must import it — `snippets.test.ts` checks every named import.

### 3.6 `packages/tokens/README.md`

In the opacity paragraph, after "`roleForm` is the rule", add that
`colorForms` is the ordered index of the two forms and that the example groups
the palette by it. No count changes.

### 3.7 `docs/design-system.md`

§9's opacity/format sentence (or the guarantee paragraph that enumerates the
checks) names the two forms; make it say "the two forms in `colorForms`" if it
currently retypes them. If no sentence retypes the pair, leave the page alone —
do not invent prose for a constant.

### 3.8 `COMPONENTS.md`

**Theme opacity check** row: after "the three veils — `selection`, `overlay`
and `selectionOnFill`, the `translucentRoles` index", add "`colorForms` is the
ordered index of the two forms". No count changes.

### 3.9 `TODO.md` and the plan index

- Add one ticked row under *Design tokens and theming* and move the progress
  count (`226/292` → `227/293`).
- Add plan `565` to `.agents/slop/plans/README.md` after `564`, status `done`,
  dependencies `540, 543, 558`, plus a closing paragraph naming the deferred
  unit, the no-guard decision and that no colour, pair, floor or metric moves.

## 4. Exact commands, expected results, both directions

Run from the worktree root.

1. Write `color-forms.test.ts` (and the docs case) first, then:

   ```sh
   nub run --filter @gpuixui/tokens test -- src/color-forms.test.ts
   ```

   Expected: **fails** — `colorForms` is not exported yet (the import cannot
   resolve). That is the failing direction this plan records.

2. Apply §3.1–§3.9, then:

   ```sh
   nub run --filter @gpuixui/tokens test -- src/color-forms.test.ts src/docs.test.ts
   ```

   Expected: every case passes.

3. Prove the discriminating case can fail: temporarily append `"gradient"` to
   `colorForms` in `opacity.ts` and rerun case 3. Expected: the "every form has
   a role" case fails for `gradient`; also run `nub run --filter @gpuixui/tokens
   check-types` and expect a type error where `roleForm`'s return no longer
   covers the wider union (do not ship this edit). Remove the member.

4. Full suite and gates:

   ```sh
   nub run --filter @gpuixui/tokens test
   nub run check
   nub run lint
   nub run test
   ```

   Baseline before the change is **142 files / 5731 tests** (`npx vitest` run
   on this tree, 2026-10-19). Expected after: 143 files, every case green;
   `check` includes `check:tests`, lint, format and type-check.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any test or guard needs a **new public type or function** beyond
  `colorForms` (this plan ships one value and derives one existing type);
- `roleForm` would need to change to satisfy a case — it is total and this plan
  moves no rule;
- any shipped theme's `themeOpacityFailures` is not `[]` before or after (it is
  `[]` on the pre-change tree; a failure is a pre-existing defect to report);
- `docs.test.ts`'s public-value guard requires naming `colorForms` somewhere
  the plan did not anticipate — add the mention to the Role opacity paragraph
  only;
- a form added to the index has no role and the coverage case fails — that is
  the guard working; remove the invented form rather than deleting the case;
- `TODO.md`'s progress count cannot be made consistent from the file — record
  the current count and the increment in the commit message instead of guessing.

## 6. Acceptance

- `colorForms` is exported, ordered `["opaque", "translucent"]`, and
  `ColorForm` derives from it.
- No `isColorForm` guard ships; the Plan-558 boundary rationale is stated in
  the source and the index entry.
- `opacity.example.ts` groups every `colorRoles` member by its form, and the
  group is exercised by `color-forms.test.ts`.
- Every other value, colour, pair, floor, metric, theme, platform style and
  recipe is unchanged; all shipped sets still pass.
- `docs/tokens.md` names the index and every form; the README, the ledger row
  and the plan index are current.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 7. Candidates left out (and why)

- **`isColorForm` guard.** A form is a diagnostics payload produced by the
  check, never an input; plan 543 shipped `contrastPairClasses` without one.
- **`rolesByForm` as a public helper.** `colorForms` + `roleForm` + `colorRoles`
  compose it in one line; a public wrapper would be a second name for the same
  expression. The executed example is the copyable form.
- **A new opacity rule.** The check is total and every shipped set passes; this
  unit owns the domain, not a new guarantee.
- **`translucentRoles` derived from `roleForm`.** It already is the input the
  rule reads; deriving it from the rule would be circular.
