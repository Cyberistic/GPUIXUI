# 741 — `RadioGroup` type-ahead, the last keyboard gap in the selection family

| Field | Value |
| ----- | ----- |
| Phase | C/F — closes the last documented Tier 1 keyboard limitation |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Radio groups row in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `044`/`048`/`049` (arrow contract), `353`/`359` (cursor rule), `731`/`732` (the shared type-ahead rule), `089` (tab order), `601` (focus lifetime) |
| Status | **done** — a focused `RadioGroup` selects and focuses the next enabled prefix match, wraps, advances on a repeated letter, skips disabled and blank-text options, and types nothing while disabled or on a chord/held key. 3 element + 9 runtime cases, both directions measured (§4); offline 69 files / 950 tests, scoped live 1 file / 9 |

## 0. Why

`docs/radio-group.mdx` §Limitations ends two bullets with **"No type-ahead
selection."**, and that is the last keyboard feature the selection family is
missing. `Select` already answers a typed prefix (plans `731`/`732`) through
`core/typeahead.ts` + `components/typeahead.ts`, and the comment on that core
module names this exact situation: a long list is unusable with the arrows
alone.

The platform contract a radio group follows (macOS and Windows both do this) is:
a printable character selects the **next** option whose label starts with what
has been typed, moves focus with it, and a repeated letter advances to the next
match. That is the same rule `Select` implements; only the target differs
(`RadioGroup` commits and focuses, because its arrows do the same).

This is **not** a new rule: it is the same pure core, wired into a second
control, so the library keeps one 500 ms prefix rule (the `731` hand-off that
retires the `components` copy points at the same module).

Measured today (this host, pinned release build): a focused radio option
receives printable keys and the group's `onKeyDown` sees them (the arrow
tests already rely on keys bubbling from the option to the group), and no
branch consumes them — so `e` on Alpha in Alpha/Beta/Europe/Estonia does
**nothing**. That is the behaviour this plan changes.

## 1. The contract

1. A **printable** character typed while the group holds focus selects the next
   **enabled** option whose text (`label`, else `value`) starts with the typed
   prefix, and moves native focus to it — `navigate`, exactly what an arrow
   does.
2. Matching is case-insensitive and the search starts **after the keyboard's
   cursor** (`moveFrom(activeIndex, focus.focusedIndex)`, plan `359`), wrapping
   to the first match. A repeated letter therefore advances: `e`, `e` chooses
   Europe, then Estonia.
3. A **disabled** option is skipped. A blank option text is never matched
   (`optionText` already falls back to the value; a blank value matches
   nothing).
4. A **group** with `disabled` types nothing.
5. A prefix that matches nothing changes nothing, and clears the buffer, so a
   dead letter cannot poison the next one (the core rule).
6. Modifier chords (`cmd`/`ctrl`/`alt`), held repeats, `space`, `enter`, the
   arrows and Home/End are **not** typed characters: the first three are refused
   by `typeaheadChar`; the rest are consumed by the existing move/jump/activation
   branch before the type-ahead branch runs.
7. Keyboard state stays observable: a deferring controlled parent still
   advances, because the hook's cursor (not the rendered value) is the search
   origin (`732`).

No public prop is added. No ARIA attribute changes: the option's name is already
its text.

## 2. Files to change

### 2.1 `packages/primitives/src/components/RadioGroup.tsx`

- Import `typeaheadChar` from `../core/typeahead.js` and `useTypeahead` from
  `./typeahead.js`; import `useCallback`, `useMemo` from `react`.
- **`RadioGroupHandlers` gains one member:**

  ```ts
  /** A printable character typed while the group holds focus. */
  readonly onTypeahead: (char: string) => void;
  ```

- In `renderRadioGroup`, replace the key-down body with the three ordered
  branches (move/jump, activation, typed character):

  ```ts
  const onKeyDown = (event: EventPayload): void => {
    const key = event.key ?? "";
    if (move(key) || jump(key)) return;
    if (decideActivation(key, "down", event.isHeld === true)) {
      select(cursorIndex);
      return;
    }
    if (props.disabled === true) return;
    Option.match(typeaheadChar(event), {
      onNone: () => {},
      onSome: handlers.onTypeahead,
    });
  };
  ```

  `activate("up", …)` stays as it is for key up. The `props.disabled` guard is
  the **only** place the group-level disable is enforced for typing; the
  per-option rule lives in the items (§2.1b), so each guard has one owner.

- In the `RadioGroup` component:
  - `const activeIndex = initialActiveIndex(props.options, selected.value.current);`
  - `const cursorIndex = moveFrom(activeIndex, focus.focusedIndex);`
  - extract the existing `onFocusMove` body into
    `const focusOption = useCallback((index: number) => { … }, [focus, renderer]);`
    and pass it as `onFocusMove` (behaviour unchanged).
  - build the type-ahead items and hook:

    ```ts
    const typeItems = useMemo(
      () =>
        Arr.map(props.options, (option) => ({
          value: option.value,
          label: optionText(option.label, option.value),
          disabled: option.disabled === true,
        })),
      [props.options],
    );
    const typeahead = useTypeahead(typeItems, cursorIndex, (match) => {
      selected.set(match.item.value);
      focusOption(match.index);
    });
    ```

  - pass `onTypeahead: typeahead` in the handlers object.

Keep the module header honest: add one sentence naming type-ahead beside the
arrow contract.

### 2.1b `RadioGroupHandlers` call sites in the element suites

The new member is required, so each fixture gains it. Every site below passes a
literal or a helper; add `onTypeahead: vi.fn()` (or a parameter on the helper):

- `src/components/selection.test.tsx` — the `radioHandlers` helper (line ~55).
- `src/components/blank-option-labels.test.tsx` — its `radioHandlers` constant.
- `src/components/style-order.test.tsx` — its `radioGroupHandlers()` helper.
- `src/components/state-style.test.tsx` — two literals inside the RadioGroup
  cases.

### 2.2 `src/components/selection.test.tsx` — element-tree cases

Extend `radioHandlers` with an optional `onTypeahead` parameter (default
`vi.fn()`), then add to `describe("RadioGroup")`:

1. **"hands a printable key to the type-ahead rule and leaves the rest alone"** —
   `onKeyDown(keyEvent("e"))` calls `onTypeahead("e")` once; `onKeyDown` with
   `down`, `home`, `enter`, `space` and `tab` adds no further call, and
   `onSelect` stays untouched (the letter selects nothing by itself).
2. **"refuses a chord and a held repeat before the character rule"** —
   `keyEvent("e", { modifiers: { shift: false, ctrl: false, alt: false, cmd: true } })`
   and `keyEvent("e", { isHeld: true })` each leave `onTypeahead` uncalled.
3. **"types nothing into a disabled group"** — `{ disabled: true }` plus
   `keyEvent("e")` leaves `onTypeahead` uncalled.

### 2.3 `runtime/radio-typeahead.runtime.test.tsx` (new)

Header comment names the limitation this plan removes (the runtime-hygiene guard
requires one). Use `openWindow`, `Surface`, `arrange`-style local helpers copied
from `runtime/roving-arrows.runtime.test.tsx`; deliver every key to the element
the component says holds focus (the `walk` helper's rule).

Fixture: `RadioGroup` over `Alpha`, `Beta`, `Europe`, `Estonia`, `value="a"`,
`testId="rg"`, reporting values into an array.

1. `"selects the next option whose text starts with the typed letter"` —
   `keyDown("rg-a", "e")` → `onValueChange` reports `"eu"`, focus is `rg-eu`,
   the accessibility value of `rg-eu` is `"checked"` and `rg-a` is
   `"unchecked"`.
2. `"advances on a repeated letter"` — `e`, `e` → reports `["eu","ee"]`, focus
   `rg-ee`.
3. `"wraps from the last match"` — from Estonia, `e` → Europe (reports `"eu"`
   again, i.e. the value changed).
4. `"skips a disabled match and a blank one"` — Europe disabled and a blank
   option between Beta and Estonia: `e` lands on Estonia.
5. `"changes nothing on an unmatched letter, and does not poison the next one"` —
   `z` → no report, focus unchanged; then `e` → Europe.
6. `"still advances for a controlled parent that defers the report"` — mount
   with `value="a"` and a callback that only records: `e`, `e` → reports
   `["eu","ee"]` and focus visits `rg-eu` then `rg-ee` (the plan-`732` cursor
   rule; without it the second `e` reports `eu` again).
7. `"types nothing while the group is disabled"` — `disabled`: `e` → no report,
   focus unchanged.
8. `"does not treat activation or a held key as a character"` — `enter` on the
   focused option selects the **focused** option (not a prefix match) and a
   held `e` types nothing.

### 2.4 `packages/primitives/docs/radio-group.mdx`

- Keyboard table: add one row
  `| Any printable character | selects the next enabled option whose text starts with the typed prefix, wrapping; a repeated letter advances |`.
- After the arrow paragraph, add a **Type-ahead** paragraph: case-insensitive,
  500 ms buffer, starts after the keyboard cursor (so a deferring parent cannot
  trap it), skips disabled options, a chord or held key types nothing.
- Limitations: delete `- No type-ahead selection.`
- Verification: add the three element cases and the runtime file.

### 2.5 `COMPONENTS.md`

- The **Radio groups** row gains one sentence: **Type-ahead (741):** a printable
  prefix selects the next enabled option from the focused one and wraps, the
  same `core/typeahead.ts` rule `Select` uses; a repeated letter advances, a
  deferring controlled parent still advances, and a disabled group types
  nothing (3 element + 8 runtime cases, each failing without the wiring).
- Both current-run passages `**64 files**` → `**65 files**`.

### 2.6 `packages/primitives/README.md`

- The runtime suite sentence `**64 test files**` → `**65 test files**`.

### 2.7 `TODO.md` and `.agents/slop/plans/README.md`

- Add and tick a `packages/primitives` row (plan `741`) in the Primitives
  workstream section.
- Add the plan to the `020–049` primitives block table with its measured
  result and deps.

## 3. Commands and expected results

Run from the repo root (or `packages/primitives` without `--filter`).

```sh
# 1. the element suites, including the new cases
nub run --filter @gpuixui/primitives test
# expect: 69 files / 950 tests pass (947 + 3 new), the two count guards pass
# only after the docs are updated.

# 2. the new runtime file, scoped
nub run --filter @gpuixui/primitives test:runtime runtime/radio-typeahead.runtime.test.tsx
# expect: 1 file / 8 tests pass.

# 3. the suites this change touches
nub run --filter @gpuixui/primitives test:runtime runtime/roving-arrows.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/activation.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/focus-loss.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/tab-order.runtime.test.tsx
# expect: each file passes; the arrow/activation/tab contracts are unchanged.

# 4. the package's type gate
nub run --filter @gpuixui/primitives check-types
```

Do **not** run the whole runtime suite while iterating; it is the end-of-task
check only if the change turns out cross-cutting.

## 4. Test plan — both directions

The regression this plan guards: a radio group with five options answered every
printable key with nothing, so choosing a named option meant walking the arrows
(measured: `e` on Alpha left the value and focus on Alpha).

Prove each new test against the old behaviour first:

1. Delete the `onTypeahead` branch from `onKeyDown` and run the runtime file:
   cases 1–4 and 6 fail by name (no report, focus unchanged); the negative cases
   (5's first half, 7, the held half of 8) still pass, as they should.
2. Restore the branch but pass `from = Option.some(activeIndex)` (the
   value-derived tab stop) instead of the cursor: the new
   `"continues the prefix from the option the arrows reached"` case fails with
   `['rg-b','rg-eu','rg-eu']` — the search restarted after the value instead of
   after the option the arrows reached.
3. Remove the `props.disabled` guard: the runtime and element "disabled" cases
   fail (a disabled group reports and focuses).
4. Remove `disabled` from the item model: case 4 fails (the prefix lands on
   Europe).
5. Call `handlers.onTypeahead(key)` instead of running `typeaheadChar`: the
   element "leaves every other key alone" and "refuses a chord and a held
   repeat" cases fail, and the runtime held-key case fails (`space` and a held
   `e` would type).
6. Element suite: deleting the `onTypeahead` call fails case 1; removing the
   move/jump/activation early returns makes cases 1 and 2 report extra calls
   (an arrow or Enter reaching the prefix rule).

Record the exact failing assertion text in the plan's status line and the commit
body.

## 5. STOP conditions

Stop and report (do not improvise) if:

- printable keys do **not** reach the group's `onKeyDown` in the real runtime (the
  radio group would need its own key handler per option, a different change);
- the type-ahead makes an arrow, Home/End, Enter or Space behave differently
  (the activation/arrow matrices fail);
- the prefix rule reports or focuses a disabled option, or a disabled group;
- a call to the type-ahead rule changes the element tree at all (an element
  suite outside the new cases fails);
- `runtime/tab-order` or `runtime/focus-loss` regresses (typing must not create
  a focus lifetime or a second tab stop).

## 6. Acceptance

- A focused `RadioGroup` selects and focuses the next enabled prefix match,
  wraps, advances on a repeated letter, skips disabled options, ignores chords
  and held keys, and types nothing while disabled.
- A deferring controlled parent still advances (the cursor rule), proven in the
  runtime.
- Three element-tree cases + eight runtime cases, each failing in the stated old
  direction; the arrow/activation/tab/focus suites unchanged.
- The page, `COMPONENTS.md`, the README counts, `TODO.md` and the plans index
  tell the truth.
- `nub run --filter @gpuixui/primitives test`, the four scoped runtime files and
  `check-types` pass.
