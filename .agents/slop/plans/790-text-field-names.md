# 790 — A text field carries a name, in every text field

**Status:** done 2026-10-20 — 6 native + 3 pure cases; Search input 18 → 21,
Tag / token input 19 → 22; unit 506 → 509 in 48 files; the full native suite is
1010 passed / 20 failed of 1030 — the same recorded plan-540 binding classes as
the pre-change run; headless smoke 17/20 with the three playground-owned
failures. Both-direction proof in §4.4.
**Workstream:** components (`packages/components`).
**Number claim:** `790` is the first free number across every worktree —
`components` holds `788`, `tokens-theme` `789`, `playground` `786`,
`primitives` `785`, and nothing claims `790`. Record it in `PLAN.md` D30.
**Depends on:** 110, 117, 391, 666, 748, 752, 755, 783, 788.

---

## 1. Why

Measured on 2026-10-20 in this worktree against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/zz-probe.test.tsx`, deleted before the commit) that mounted the
real example registry and then four targeted trees.

### 1.1 The contract never sees a text field

`src/behaviour/accessibility.test.tsx` lists `"textbox"` (and `"searchbox"`) in
`INTERACTIVE_ROLES`. The accessibility dump spells an `<input>` as
**`textinput`** — the same class of mismatch plan 783 found for `option`
(AccessKit spells it `listboxoption`). Measured: not one node in any of the 43
examples reports `textbox` or `searchbox`, so the rule that "every interactive
node has a name" has never covered a text field.

### 1.2 Two shipped examples carry an unnamed field

With the role spelled correctly, the registry walk reports exactly two unnamed
fields (and no others):

| example | role | name |
| ------- | ---- | ---- |
| `search-input` | `textinput` | **`""`** |
| `tag-input` | `textinput` | **`""`** |

The targeted probe confirms the channel works: a caller `aria-label` lands on
both parts, so the components simply never supply one.

| tree | accessible name |
| ---- | --------------- |
| `<SearchInput />` | `""` |
| `<SearchInput placeholder="Filter files…" />` | `""` |
| `<SearchInput aria-label="Filter files" placeholder="Filter files…" />` | `Filter files` |
| `<TagInput label="Tags"><TagInputField placeholder="Add a tag…">` | `""` |
| `<TagInput label="Tags"><TagInputField aria-label="Add tags">` | `Add tags` |

### 1.3 The docs promise a name that never happens

`packages/components/docs/search-input.mdx` says (lines 29–30) "put a **Field**
around it when the search needs a visible label, or pass `aria-label`", and
(lines 116–117) "The input carries the caller's `aria-label` (or the field's
label)". Neither is true: `FieldInput` is the only consumer of `FieldContext`,
so a `SearchInput` wrapped in a `Field` is still unnamed. A consumer who follows
the page gets a visible label beside a nameless input.

`TagInputField` has no label of its own; its group is named, the field is not.

### 1.4 What is already correct

- `FieldInput` is named from its field's label (`aria-label={field.label}`).
- `ComboboxInput`, `TimePicker` segments and `MentionInput` carry their own
  `label` and are named.
- `CommandMenuInput` names its field.
- Every other role in the registry is named (plans 391, 783, 788).

So the defect is narrow and concrete: one missing role spelling in the contract,
two unnamed inputs, and one documented composition that does not deliver.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/field-context.ts` | **new** — `FieldContext` + `useField`, moved out of `field.tsx` |
| `packages/components/src/field.tsx` | provide the moved context; no behaviour change |
| `packages/components/src/internal/name.ts` | add `controlNameFrom` (first clean source) |
| `packages/components/src/internal/name.test.ts` | 3 pure cases for `controlNameFrom` |
| `packages/components/src/search-input.tsx` | name the `<input>` from caller → field label → placeholder |
| `packages/components/src/tag-input.tsx` | context carries the group label; the field is named from caller → placeholder → group label |
| `packages/components/src/behaviour/search-input.test.tsx` | 3 native cases (18 → 21) |
| `packages/components/src/behaviour/tag-input.test.tsx` | 3 native cases (19 → 22) |
| `packages/components/src/behaviour/accessibility.test.tsx` | `"textinput"` in `INTERACTIVE_ROLES`, with the measured comment |
| `packages/components/docs/search-input.mdx` | naming rule + verification count |
| `packages/components/docs/tag-input.mdx` | naming rule + verification count |
| `packages/components/docs/field.mdx` | one sentence: the field names `FieldInput` **and** `SearchInput` |
| `COMPONENTS.md` | Search inputs + Tag / token input rows: naming sentence and counts |
| `TODO.md`, `PLAN.md` D30, `.agents/slop/plans/README.md` | bookkeeping |

No public prop is added or changed.

## 3. Implementation

### 3.1 Move the field context (no behaviour change)

`src/internal/field-context.ts`:

```ts
/**
 * The label, copy and state a {@link Field} hands to the control it wraps.
 *
 * `@gpuix/react@0.10.0` has no `aria-labelledby`, so a control cannot be named
 * from a `<text>` elsewhere in the tree. The field publishes its label through
 * this context and the control supplies it as `aria-label` (plans 391, 748).
 */

import { createContext, useContext } from "react";

/** What a control inherits from the field around it. */
export interface FieldContextValue {
  readonly label: string;
  readonly description: string | undefined;
  readonly error: string | undefined;
  readonly required: boolean;
}

/** The field around a control, absent outside one. */
export const FieldContext = createContext<FieldContextValue | undefined>(
  undefined,
);

/** The field around the calling control, if there is one. */
export const useField = (): FieldContextValue | undefined =>
  useContext(FieldContext);
```

In `field.tsx` delete the local interface and `createContext` call, import
`FieldContext` from `./internal/field-context.js`, and keep the provider, the
`context` object and `FieldInput`'s `useContext` unchanged. `createContext` drops
from the React import if nothing else uses it; `useContext` stays for
`FieldInput`.

Do not export `useField` from `src/index.ts` or the package `exports`; it is an
internal seam.

### 3.2 `controlNameFrom`

`src/internal/name.ts`, after `controlName`:

```ts
/**
 * The name for a control whose caller-authored label may be absent and whose
 * visible sources are ordered: the first trimmed, non-empty source wins.
 * `undefined` means the caller must name it.
 */
export const controlNameFrom = (
  authored: string | undefined,
  sources: ReadonlyArray<string | undefined>,
): string | undefined =>
  Option.getOrUndefined(
    Option.firstSomeOf([clean(authored), ...Arr.map(sources, clean)]),
  );
```

`clean` is already module-local and does exactly the trim/filter. Do not change
`controlName`; 20 parts depend on its single-source shape.

### 3.3 `SearchInput`

Add imports for `controlNameFrom` and `useField`, and compute once:

```ts
const field = useField();
const name = controlNameFrom(rest["aria-label"], [field?.label, placeholder]);
```

Set it on the `<input>` **after** `{...rest}` so a whitespace-only caller
`aria-label` cannot overwrite the computed fallback:

```tsx
<input
  {...rest}
  aria-label={name}
  {...stateDescription(disabled, rest["aria-description"])}
  …
/>
```

`aria-label={undefined}` is omitted by React, so a field with no caller name, no
field and a blank placeholder stays unnamed (and the contract in §3.6 reports
it).

Precedence: **caller `aria-label` → the `Field`'s `label` → `placeholder`**. The
field's visible label is more authoritative than an example prompt, and the
caller is always right.

### 3.4 `TagInput`

`TagInputContextValue` gains the group's name:

```ts
interface TagInputContextValue {
  …
  /** The group's label, so the field inside it can be named. */
  readonly name: string;
}
```

The root adds `name: label` to `context`. `TagInputField` reads it and computes:

```ts
const { …, name: groupName } = useTagInput();
const name = controlNameFrom(rest["aria-label"], [rest.placeholder, groupName]);
```

and sets `aria-label={name}` after `{...rest}`, beside the existing
`stateDescription` spread.

Precedence: **caller `aria-label` → the field's own placeholder → the group's
`label`**. A placeholder names what this field accepts; the group label is the
always-present fallback.

### 3.5 Why not a new prop

- `SearchInput` already spreads host `InputProps`, so `aria-label` is the
  caller's escape hatch; the component's job is to supply a truthful default.
- `TagInput` already requires a `label`; copying it into the field needs no API.
- A required `label` on `SearchInput` would break every consumer, and an
  invisible label prop would duplicate `aria-label`.

### 3.6 The contract sees text fields

In `src/behaviour/accessibility.test.tsx`, extend the list and its comment:

```ts
  "textbox",
  // AccessKit spells an `<input>` as `textinput`; see the option note above.
  "textinput",
```

Keep `"textbox"`/`"searchbox"` so a future runtime spelling is covered. No new
case: the existing "names every interactive node in every example" case now
covers fields, and fails at `HEAD` with exactly the two entries in §1.2.

## 4. Tests

### 4.1 SearchInput — `src/behaviour/search-input.test.tsx` (18 → 21)

Import `Field` from `../field.js` and `nodesWithRole` from `../internal/a11y.js`.

1. **`names the field from its placeholder`** — `<SearchInput placeholder="Filter files…" />`;
   expect the one `textinput` name to be `"Filter files…"`. At `HEAD`: `""`.
2. **`a caller aria-label wins over the placeholder`** — `aria-label="Filter files"`
   with a different placeholder; expect `"Filter files"`. Passes at `HEAD`; it
   is the pin that the computed fallback never overwrites the caller.
3. **`a Field names the search field it wraps`** —
   `<Field label="Search the docs"><SearchInput placeholder="Filter files…" /></Field>`;
   expect `"Search the docs"`. At `HEAD`: `""` (the documented composition).

### 4.2 TagInput — `src/behaviour/tag-input.test.tsx` (19 → 22)

The shared `Harness` sets `placeholder="Add a tag"`, so:

4. **`names the field from its placeholder`** — `<Harness />`; expect
   `"Add a tag"`. At `HEAD`: `""`.
5. **`a caller aria-label wins over the placeholder`** — render the parts
   directly with `aria-label="Add tags"`; expect `"Add tags"`. Passes at `HEAD`;
   the pin.
6. **`a field with no placeholder is named by its group`** —
   `<TagInput label="Tags" value={[]} onValueChange={() => {}}><TagInputField /></TagInput>`;
   expect `"Tags"`. At `HEAD`: `""`.

### 4.3 `controlNameFrom` — `src/internal/name.test.ts` (3 pure cases)

7. caller wins: `controlNameFrom(" Save ", ["Placeholder"])` → `"Save"`.
8. first clean source: `controlNameFrom(undefined, ["  ", "Field label", "Placeholder"])`
   → `"Field label"`.
9. everything blank: `controlNameFrom("  ", [undefined, "   "])` → `undefined`.

### 4.4 Both-direction proof

```sh
cd packages/components
# 1. the contract alone, before the component fix
git stash push -- src/search-input.tsx src/tag-input.tsx src/field.tsx \
  src/internal/field-context.ts src/internal/name.ts
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx
# expected: 1 failed — "search-input: textinput", "tag-input: textinput"
git stash pop

# 2. the per-component cases, with only the naming lines removed
git stash push -- src/search-input.tsx src/tag-input.tsx
nub x vitest run --config vitest.behaviour.config.ts \
  src/behaviour/search-input.test.tsx src/behaviour/tag-input.test.tsx
# expected: cases 1, 3, 4 and 6 fail; cases 2 and 5 pass (the caller pins)
git stash pop
```

If untracked `field-context.ts`/`name.ts` edits make the stash workflow
awkward, remove the naming lines by hand, run, and restore from `git diff` —
record the exact run in the commit message either way.

### 4.5 Mutation proofs to record

| Mutation | Must fail |
| -------- | --------- |
| drop `"textinput"` from the contract | nothing on the fixed source (the rule is the guard); with the source at `HEAD` and the role present, the contract fails |
| swap the search precedence (placeholder before field label) | search case 3 |
| apply `aria-label` **before** `{...rest}` and pass `aria-label="  "` | search case 1 (blank caller label wins) |
| drop the tag group-label fallback | tag case 6 |
| name the tag field from the group before the placeholder | tag case 4 |

The first row is the contract's own proof and is measured in §4.4 step 1.

## 5. Docs, inventory and `COMPONENTS.md`

- `docs/search-input.mdx`
  - Anatomy (lines 29–30): "There is no separate label part: the field is named
    by the caller's `aria-label`, else the `Field` it sits in, else its
    `placeholder`."
  - Accessibility (lines 116–117): replace "The input carries the caller's
    `aria-label` (or the field's label)" with the same ordered rule and why
    (0.10.0 cannot name an input from a sibling `<text>`).
  - Verification: **21 tests**, naming the three new cases.
- `docs/tag-input.mdx` §Accessibility: add "The field is named by the caller's
  `aria-label`, else its `placeholder`, else the group's `label`; the group
  itself stays named by `label`." Verification: **22 tests**.
- `docs/field.mdx` §Accessibility: add "A `SearchInput` inside a `Field` takes
  the field's label as its accessible name, like `FieldInput`." Keep the
  existing `FieldInput` claim.
- `COMPONENTS.md`:
  - **Search inputs**: "the input is named by the caller's `aria-label`, else the
    `Field` it sits in, else the placeholder"; `18` → `21` native tests.
  - **Tag / token input**: "the field is named from the placeholder, falling back
    to the group label"; `19` → `22` native tests.
- `src/inventory.ts`: no prop or limitation changes; only the docs counts move.
- No docs-site hand-off: these pages are the package's own.

## 6. Commands and expected results

Run from `packages/components` unless stated:

| Command | Expected |
| ------- | -------- |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/zz-probe.test.tsx` | the probe in §1.2 prints the two unnamed fields; **delete the file before committing** |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx` | after adding `textinput` and **before** the component fix: 1 failed, naming `search-input` and `tag-input`; after the fix: 2 passed |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/search-input.test.tsx` | 21 passed |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/tag-input.test.tsx` | 22 passed (the recorded `mention-input`-style plan-540 red does not apply to this file, which was 19/19) |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/field.test.tsx src/behaviour/fieldset.test.tsx` | 12 + 7 passed — the context move changes no behaviour |
| `nub run --filter @gpuixui/components test` | exit 0; unit 506 → 509 (3 `controlNameFrom` cases) |
| `nub run check` | exit 0 (inventory, docs counts, exports) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |
| `nub run test:behaviour` (end-of-task check; this change is cross-cutting across the contract) | record passed/failed/total — every failure must be one of the recorded plan-540 classes; expected total 1024 + 6 = 1030 with the same 20 recorded failures |

Scoped native smoke: the headless playground registry is GPUix primitives and
does not mount a search or tag field, so use the `TestRenderer` suites above.
Run the full headless suite once as the end-of-task check if time allows:
`nub apps/playground/dist/smoke/run.js` and record the ids and result.

## 7. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId`/`a11yNodes` reports a different role than `textinput` for
  an `<input>` on this binding — record it and adjust the contract list, do not
  guess.
- Adding `textinput` to the contract reports an unnamed field the plan did not
  name — report it; do not add an allow-list.
- The `Field` context move changes `FieldInput`'s name or `aria-description` —
  re-check the provider value; do not duplicate the context.
- A caller `aria-label` stops winning (blank caller label overwritten) — the
  attribute order is wrong.
- A previously green case outside the four touched files turns red.
- A new case cannot be made to fail at `HEAD` for the stated reason — a test that
  cannot fail is not a test; report it.

## 8. Acceptance

- Every `<input>` the package paints is named: `SearchInput` from the caller,
  the wrapping `Field`, or the placeholder; `TagInputField` from the caller, its
  placeholder, or the group label.
- The accessibility contract covers `textinput`, and it fails at `HEAD` on the
  two shipped examples (measured), passes after.
- Six new native cases and three pure cases; docs, `COMPONENTS.md`, `TODO.md`,
  `PLAN.md` D30 and the plan index agree with the run.
- `nub run check`, `nub run lint` and `nub run test` exit 0.

## 9. Result (2026-10-20)

Implemented exactly as planned; no STOP condition was hit.

- **Contract**: `"textinput"` is in `INTERACTIVE_ROLES`, and the module note
  names the second misspelling after `listboxoption`. Measured at `HEAD` (with
  only the component sources stashed, §4.4 step 1) the case fails with
  `['search-input: textinput', 'tag-input: textinput']`; after the fix it
  passes.
- **`SearchInput`**: the `<input>` is named by the caller's `aria-label`, else
  the wrapping `Field`'s label, else the placeholder. The field context moved to
  `internal/field-context.ts` so a control other than `FieldInput` can read the
  label; `field.test.tsx` is unchanged at 12/12.
- **`TagInputField`**: named by the caller's `aria-label`, else its placeholder,
  else the group's `label` (now carried on the part context).
- **Tests**: Search input 21/21, Tag / token input 22/22, accessibility 2/2,
  Field 12/12. `name.test.ts` 17 (3 new `controlNameFrom` cases). Both-direction
  run in §4.4: 5 failed / 40 passed without the component change — the contract
  case plus four naming cases (the two caller pins stay green).
- **Gates**: `nub run check` and `nub run lint` exit 0; `nub run test` is 509
  tests in 48 files; `nub run test:behaviour` is **1010 passed / 20 failed of
  1030**, the same 20 plan-540 classes as the 1004/20 of 1024 baseline.
- **Headless smoke**: `nub apps/playground/dist/smoke/run.js` is **17/20** —
  only `focus-traversal`, `floating-placement` and `shell-navigation`, the same
  three the playground workstream already records. No live run: no scenario in
  this change opens a window, and the full live suite is the merge gate.
