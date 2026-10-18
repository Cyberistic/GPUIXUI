# 328 — Combobox "create new option"

**Phase:** C/F · **Owner:** components workstream · **Depends on:** 116, 138, 302, 323.

## 1. Why

`Comboboxes` is marked `done` with one functional gap that the inventory names
explicitly: **no create-new-option affordance** (`src/combobox.tsx`,
`comboboxMeta.limitations`, `docs/combobox.mdx` → Limitations). A searchable
picker that cannot create the thing the user just typed is the most common
combobox dead end: choosing a project, a tag or a person that does not exist yet.

The runtime's headless combobox only knows string `items`, so the component can
append one synthetic row and intercept its selection. That keeps focus, arrows
and Enter in the proven runtime path while the option model stays ours.

## 2. Contract

```ts
<Combobox onCreate={(query) => addProject(query)}
  createLabel={(query) => `New project “${query}”`} … />
```

| Prop | Meaning |
| ---- | ------- |
| `onCreate?: (query: string) => void` | Present ⇒ a create row is offered when the trimmed query has no exact match. Called once with the trimmed query, after the row is selected. |
| `createLabel?: (query: string) => string` | The row's text. Default `Create “<query>”`. |

Rules:

- The row appears **last**, after the ranked matches, only while the query is
  non-blank and no option's label or value equals it case-insensitively after
  trimming.
- Single mode: selecting it reports the trimmed query as the value, calls
  `onCreate`, closes, clears the query and returns focus to the trigger — the
  same exit as selecting a real option (plan 138/323).
- Multiple mode: selecting it calls `onCreate`, adds the trimmed query to the
  selection once, clears the query and keeps the popup open with focus in the
  input.
- Without `onCreate` nothing changes: no row, no sentinel in `items`.
- The synthetic value never crosses the public callback: `onValueChange` sees
  the trimmed query, never the internal sentinel.

## 3. Files and exact changes

1. `packages/components/src/combobox/logic.ts`
   - `CREATE_PREFIX` (a NUL-prefixed constant, so it cannot collide with a real
     option value), `createValue(query)`, `parseCreateValue(value)` returning
     `Option.Option<string>`, and `canCreate(options, query)`.
   - Pure Effect (`Arr`, `Option`, `Str`), no React.
2. `packages/components/src/combobox/logic.test.ts`
   - `canCreate`: blank/whitespace false; exact label false; exact value false;
     case and surrounding whitespace ignored; a prefix or substring of a label
     is still a new value; no options true.
   - sentinel round-trip; a normal value parses to `None`; the sentinel is not
     equal to the query.
3. `packages/components/src/combobox.tsx`
   - Add the two props; append the synthetic value to `items`; teach `labelFor`
     and `isDisabled` about it; intercept `onValueChange`; give the create row
     the stable `testId="combobox-option-create"`.
   - Update the header comment and `comboboxMeta.limitations` (drop "or
     create-new-option affordance"; keep "no async options").
4. `packages/components/src/behaviour/combobox.test.tsx`
   - Five native tests (see §4).
5. `packages/components/examples/combobox.example.tsx`
   - A "create a project" picker whose `onCreate` appends to the option array
     and selects the new value, next to the existing read-only picker.
6. `packages/components/docs/combobox.mdx`
   - A "Creating values" section with the props, the single/multiple rules and
     one example; update the Limitations list and the Verification count.
7. `COMPONENTS.md`
   - The Combobox row: remove the create-new limitation, keep async, update the
     native test count.
8. `.agents/slop/plans/README.md` — index row; `TODO.md` — one ticked task.

## 4. Test plan (each must be able to fail)

Logic (`src/combobox/logic.test.ts`):

- "refuses to create a value that already exists" — removes the case-insensitive
  label check and it fails.
- "offers creation for a new non-blank query" — returns true only for new text;
  a blank query and an exact value fail it.
- "round-trips the synthetic value" — a prefix change breaks both directions.

Behaviour (`src/behaviour/combobox.test.tsx`, real GPUix renderer):

1. `offers a create row after the ranked matches` — typing `Des` with
   `onCreate` shows the last row as `combobox-option-create` labelled
   `Create “Des”`; remove the append and it fails.
2. `selects the typed value with Enter and reports it once` — `onCreate` and
   `onValueChange` each called once with `Des`; popup closed; trigger named
   `Des`; focus is on the trigger.
3. `does not offer creation for an existing option` — typing `Cal` against
   `Calendar` shows no create row.
4. `creates in multiple mode without storing the sentinel` — `onValueChange`
   receives `["calendar", "Des"]` (order preserved, no synthetic value), the
   popup stays open.
5. `creates from a pointer press` — clicking the create row runs the same
   single-select exit; guards a wrapper that only handles the keyboard.

Both-direction proof: comment out the append in `combobox.tsx`; tests 1, 2, 4
and 5 fail; restore and all pass. Delete the case-insensitive comparison in
`canCreate`; the "existing option" logic test fails.

## 5. Commands

```sh
nub run --filter @gpuixui/components test              # logic + inventory
nub run --filter @gpuixui/components test:behaviour    # 46 files
nub run check
nub run lint
nub run test
```

Expected: the new logic tests pass, the behaviour suite grows from 481 to 486,
and the three gates exit 0.

## 6. STOP conditions

Stop and report, do not improvise, if:

- the headless combobox cannot select a synthetic `items` entry without the
  sentinel leaking into `value`, `inputValue` or `onValueChange`;
- the create row steals the highlight from a real match on open (the runtime's
  `autoHighlight` must still land on the first real row);
- the close path no longer returns focus to the trigger, or Escape/outside-press
  behaviour changes;
- a test can only pass by asserting the sentinel (rewrite the test instead).

## 7. Acceptance

- [x] `onCreate` produces one trailing row only when there is no exact match.
- [x] Single and multiple selection paths report the trimmed query, never the
      sentinel, and preserve the existing close/focus contract.
- [x] No `onCreate` means byte-for-byte the old `items` and behaviour.
- [x] Logic + six native tests fail without the feature and pass with it.
- [x] Docs, example, inventory record and `COMPONENTS.md` agree with the code.
- [x] `nub run check`, `nub run lint` and `nub run test` are green; the
      behaviour suite was run and reported 487 passing.

## 8. Result

Landed 2026-10-18.

- `combobox/logic.ts`: `CREATE_PREFIX` (NUL-prefixed), `createValue`,
  `parseCreateValue`, `canCreate`. Six unit tests; two of them fail when the
  exact-match comparison is removed.
- `combobox.tsx`: `onCreate`/`createLabel`; the create row is appended last, its
  selection is intercepted for both the string (single) and array (multiple)
  shapes the runtime reports, and the sentinel never reaches `onValueChange`.
  The create row carries `testId="combobox-option-create"`.
- Six native tests, not five: the pointer/Enter paths plus a separate test for a
  caller-supplied `createLabel`. Measured 23/23 in `combobox.test.tsx`.
- Both-direction proof: removing the append failed exactly the five create tests
  that need a row (the "existing option" guard still passed because it asserts
  absence); removing `canCreate`'s exact-match comparison failed its unit test
  and `does not offer creation for an existing option`. Both restorations pass.
- Full behaviour suite: **487 passed** (46 files); unit **324 passed** (33
  files). Example, docs page, inventory record and `COMPONENTS.md` updated.
- Multiple mode was first driven by a pointer selection; the click leaves the
  input unfocused, so the test selects the first value with the keyboard and
  covers the pointer path separately in single mode.
