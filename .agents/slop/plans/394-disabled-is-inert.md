# Plan 394 — Disabled means inert: no hover, no press, no ring, no tab stop

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish — interaction-state consistency) |
| Owner | components workstream |
| Depends on | `110`, `111`, `113`, `116`, `200`, `201`, `305`, `332`, `334`, `388`, `393` |
| Status | done — six measured leaks fixed; 7 new native cases (Button 13, InlineEdit 16, Collapsible 13, SearchInput 11, List 44, behaviour 609); six mutation proofs (one fix reverted at a time fails exactly its case). §1 row 4 was extended after the first pass, when the Escape/Enter path was still live with the clear control hidden |
| Number | First free number in the `300–399` block (last landed: `393`) |

This plan is self-contained. A weaker executor can run every step without
reading another plan. Verdicts marked **measured** were reproduced on this host
(Intel macOS, the locally built `darwin-x64` binding from plan `140`) with
`nub run --filter @gpuixui/components test:behaviour`.

---

## 1. The bug

Plan `393` established the rule for *opening*: a disabled trigger never opens
anything. This plan closes the other half of the same rule — a disabled control
must not **look** interactive either.

Five measured holes, all reproduced on `HEAD` `9f1097b` with one probe suite
(`src/behaviour/probe.test.tsx`, deleted again before the fix lands):

| # | Part | What a disabled instance does today | Measured |
| - | ---- | ----------------------------------- | -------- |
| 1 | `internal/button.tsx` `Button` / `IconButton` | keeps the variant's `hover` and `active` fills, so it lights up under the pointer although it cannot be pressed | `style.hover` defined on the disabled button (and on the enabled one) |
| 2 | `inline-edit.tsx` display | paints the focus ring when `disabled` **and** `autoFocus` are both set, and keeps `hover: accent` | `style.boxShadow` defined; `style.hover` defined |
| 3 | `collapsible.tsx` `CollapsibleTrigger` | has no `disabled` prop at all: a caller's `disabled` falls through to the host div, stays in the tab order and still toggles | `customProps.tabIndex: 0`, `onOpenChange` called once, `style.hover` defined |
| 4 | `search-input.tsx` clear control and key path | still renders while the field is disabled, so a press clears a field the user cannot type in; with the control hidden, Escape still ran `clear` and Enter still ran `onSubmit` | `findByTestId("search-clear")` returned an element; a disabled field reported `clear: 1, submit: 1` |
| 5 | `list.tsx` `ListItem` | a disabled row in a selectable/activatable list still gets `cursor: pointer` and the hover/press fills | `style.cursor: "pointer"`, `style.hover` defined |

Parts that already do this correctly — use them as the reference shape, do not
change them:

- `accordion.tsx` `AccordionTrigger` and `tabs.tsx` `TabsTrigger`:
  `hover: disabled ? undefined : {...}` plus `cursor`/`opacity` and
  `tabIndex={disabled ? -1 : ...}`.
- `time-picker.tsx` `TimePickerClear` and `hotkey-recorder.tsx` clear control:
  `if (!clearable || !hasValue || disabled) return null`.
- `internal/button.tsx` and `field.tsx`: `useState(autoFocus && !disabled)`.

---

## 2. The contract this plan enforces

A part with `disabled`:

1. never paints `hover` or `active`;
2. never paints a focus ring seeded from `autoFocus`;
3. is out of the tab order (`tabIndex = -1`, or no `tabIndex` when the part
   never has one);
4. drops its own click and key activation, while still forwarding the caller's
   handlers;
5. keeps `cursor: "not-allowed"` and its dimmed opacity.

`disabled` is never inferred. No new prop is added where the part has no
interactive role (`BreadcrumbLink` stays as it is; `current` is the
non-interactive form).

---

## 3. Exact changes

### 3.1 `packages/components/src/internal/button.tsx`

Replace the `disabledStyle` helper (around line 130) so a disabled control
clears the variant's interaction diffs:

```ts
/** A control's look when it is disabled: dimmed, out of the tab order, inert. */
const disabledStyle = (disabled: boolean): StyleDesc =>
  disabled
    ? {
        opacity: 0.5,
        cursor: "not-allowed",
        hover: undefined,
        active: undefined,
      }
    : { opacity: 1, cursor: "pointer" };
```

`controlStyle` spreads `variantStyle` first and the caller of `disabledStyle`
spreads it after, so the `undefined` values overwrite the variant diffs in both
`Button` and the icon branch of `IconButton`. Do not reorder those spreads.

Update the file header's "Known gap" sentence only if it becomes wrong; it is
about `aria-disabled` and stays true.

### 3.2 `packages/components/src/inline-edit.tsx`

Two edits:

1. Line ~94: `const [focused, setFocused] = useState(autoFocus && !disabled);`
2. Line ~201, in the display's style: change
   `hover: { backgroundColor: theme.colors.accent },` to
   `hover: disabled ? undefined : { backgroundColor: theme.colors.accent },`.

Nothing else in the file changes; the input branch is already `readOnly` when
disabled and never renders a hover diff.

### 3.3 `packages/components/src/collapsible.tsx`

`CollapsibleTrigger` gains a real disabled state, following `AccordionTrigger`:

1. Add to `CollapsibleTriggerProps`:

   ```ts
   /** Leave the tab order, drop activation and dim. Never inferred. */
   readonly disabled?: boolean;
   ```

2. Destructure `disabled = false` in the component (next to `autoFocus`).
3. Seed focus from the prop correctly:
   `const [focused, setFocused] = useState(autoFocus && !disabled);`
4. `toggle` becomes guarded: `const toggle = (): void => { if (!disabled) setOpen(!open); };`
5. On the div:
   - `tabIndex={disabled ? -1 : 0}`;
   - `autoFocus={autoFocus && !disabled}`;
   - `onClick={disabled ? undefined : (event) => { onClick?.(event); toggle(); }}`;
   - `activationHandlers(toggle, { disabled, onKeyDown, onKeyUp })`.
6. In the base style, next to `color`:
   - `cursor: disabled ? "not-allowed" : "pointer"`;
   - `opacity: disabled ? 0.5 : 1`;
   - `hover: disabled ? undefined : { backgroundColor: theme.colors.hover }`;
   - `active: disabled ? undefined : { backgroundColor: theme.colors.active }`.

The caller's `onKeyDown`/`onKeyUp` still run when disabled because
`activationHandlers` forwards them; only the action is muted (same contract as
`Button`).

### 3.4 `packages/components/src/search-input.tsx`

The clear control becomes conditional on the field being usable:

```tsx
{value === "" || disabled ? null : (
```

(around line 150). This mirrors `TimePickerClear` and `HotkeyRecorder`'s clear
control. An empty or disabled field shows no clear affordance.

Hiding the control is not enough, because the input's own key path still ran:
guard `clear` and the submit handler as well:

```ts
const clear = (): void => {
  if (disabled || value === "") return;
  // …
};

onSubmit={() => {
  if (!disabled) onSubmit?.(value);
}}
```

### 3.5 `packages/components/src/list.tsx`

In `ListItem`'s style, replace the `focusable` spread (around line 778) with one
that also requires an enabled row:

```ts
...(focusable && !disabled
  ? {
      cursor: "pointer",
      hover: { backgroundColor: theme.colors.accent },
      active: { backgroundColor: theme.colors.active },
    }
  : {}),
```

The row keeps `opacity: disabled ? 0.5 : 1`; a disabled row gains
`cursor: "not-allowed"` by adding that key to the base style next to `opacity`.
Do **not** change `focusable` itself (it drives the roving model's `tabIndex`
and the collection rules); only the pointer affordance is gated.

---

## 4. Tests (native behaviour)

Add these cases; keep the suite's two-space `it(` convention so
`inventory.test.ts` counts them.

| File | New case | What it would catch |
| ---- | -------- | ------------------- |
| `src/behaviour/button.test.tsx` | "a disabled control carries no hover or press fill" | renders a disabled and an enabled `Button`; asserts the disabled `style.hover`/`style.active` are `undefined` and the enabled ones are defined | a variant diff leaking past `disabledStyle` |
| `src/behaviour/inline-edit.test.tsx` | "a disabled display paints no ring and no hover" | renders `<InlineEdit disabled autoFocus value="x" />`; asserts the display's `boxShadow` and `hover` are `undefined`, and `customProps.tabIndex` is `-1` | the `autoFocus` seed without `!disabled`, and the ungated hover |
| `src/behaviour/collapsible.test.tsx` | "a disabled trigger is inert" | renders a disabled trigger inside `Collapsible` with an `onOpenChange` spy; asserts `tabIndex -1`, a real centre press and Enter/Space call nothing, a caller `onKeyDown` still runs once, opacity `0.5`, and `hover` undefined | the missing prop (it currently falls through and toggles) |
| `src/behaviour/collapsible.test.tsx` | "a disabled trigger never takes focus" | renders disabled + `autoFocus`; asserts `focusedTestId` is `None` and no ring is painted | the unconditional `autoFocus={autoFocus}` |
| `src/behaviour/search-input.test.tsx` | "a disabled field offers no clear control" | renders `value="draft" disabled`; asserts `findByTestId("search-clear")` is `undefined`; then the same tree enabled has one | the press that clears an unusable field |
| `src/behaviour/search-input.test.tsx` | "ignores Escape and Enter while the field is disabled" | focuses a disabled field with a value, sends `escape` and `enter`, and asserts `onClear`/`onSubmit` never ran | the key path that survived hiding the control |
| `src/behaviour/list.test.tsx` | "a disabled row shows no pointer affordance" | single-select list with an enabled and a disabled row; asserts the disabled row's `style.cursor` is `"not-allowed"` and `style.hover`/`style.active` are `undefined`, while the enabled row keeps `cursor: "pointer"` and a hover fill | the `focusable`-only gate |

Expected new totals:

| Suite | Before | After |
| ----- | ------ | ----- |
| `button.test.tsx` | 12 | 13 |
| `inline-edit.test.tsx` | 15 | 16 |
| `collapsible.test.tsx` | 11 | 13 |
| `search-input.test.tsx` | 9 | 11 |
| `list.test.tsx` | 43 | 44 |
| behaviour, whole package | 602 | 609 |

Update every stated count (COMPONENTS.md rows and each docs page's Verification
line) — `inventory.test.ts` fails otherwise.

---

## 5. Docs and ledgers

1. `packages/components/docs/collapsible.mdx`
   - props table `CollapsibleTrigger` row: add `disabled: boolean` (default
     `false`) and say "leaves the tab order, dims, drops hover and activation".
   - behaviour table: add the disabled row.
   - Verification: 13 tests, naming the disabled cases.
2. `packages/components/docs/search-input.mdx`
   - `disabled` row: add "hides the clear control".
   - Verification: 10 tests.
3. `packages/components/docs/inline-edit.mdx`
   - `disabled` row already says "Leaves the tab order, ignores activation.";
     add "no ring and no hover".
   - Verification: 16 tests.
4. `packages/components/docs/list.mdx`
   - the disabled-row sentence (~line 56) gains "and it paints no hover or
     press fill and no pointer cursor".
   - Verification: 44 tests.
5. `COMPONENTS.md`
   - **Collapsible sections** row: note the `disabled` trigger; count 13.
   - **Search inputs** row: note the hidden clear control; count 10.
   - **Inline edit** row: note the inert disabled display; count 15 → 16.
   - **Lists / list items** row: note the disabled row's inert pointer state;
     count 43 → 44.
   - Button is internal and has no row; its suite count is not in a ledger.
6. `packages/components/src/*.tsx` meta records: only the Collapsible one gains
   a limitation if the plan adds one. The others need no text change; their
   `testFile` is unchanged.

---

## 6. Commands and expected results

Run from `packages/components` unless stated:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/button.test.tsx src/behaviour/inline-edit.test.tsx src/behaviour/collapsible.test.tsx src/behaviour/search-input.test.tsx src/behaviour/list.test.tsx
```

Expected: 5 files, **13 + 16 + 13 + 11 + 44 = 97** tests passing.

```sh
nub run --filter @gpuixui/components test
```

Expected: 39 files, **383** unit tests passing (no unit test changes).

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected: 49 files, **609** behaviour tests passing.

```sh
nub run --filter @gpuixui/components check-types
nub run lint
nub run fmt
nub run check:tests
```

Expected: each prints its success line; `fmt` reports every file formatted.

---

## 7. Both-direction proof (required)

`scripts/verify-two-directions.sh` needs `jj`, which is not installed (D1), so
prove it by hand and record the result in the commit message:

1. With the new tests in place and the source **unfixed**, run the five files
   above with the probe-equivalent assertions. Expected: exactly the new cases
   fail (6–7 failures), the pre-existing cases still pass.
2. Apply §3. With the tests unchanged, run them again. Expected: all 97 pass.
3. Revert one fix at a time (for the Button, the InlineEdit seed, the
   Collapsible guard, the SearchInput condition, the List gate) and confirm only
   that fix's case fails. Record each mutation in the commit message or as a
   numbered list in the plan's status line.

---

## 8. STOP conditions

Stop and report, do not improvise, if any of these happen:

- `StyleDesc` rejects `hover: undefined` in a part despite `accordion.tsx`
  compiling with the same expression (the pinned types changed).
- A disabled `CollapsibleTrigger` still toggles after the guard, because the
  native click arrives on a child rather than the trigger div — measure it and
  report before adding a wrapper.
- The `List` row's `tabIndex` changes behaviour for an enabled row; the roving
  model's `focusable` flag is not part of this plan.
- Any existing test that is not listed above fails.
- The behaviour suite reports fewer than 609 tests (a case was silently not
  collected — check the two-space `it(` convention).

---

## 9. Acceptance criteria

- The six measured holes are gone, each proven by a native case that fails
  without its fix.
- The disabled contract (§2) holds for `Button`, `IconButton`, `InlineEdit`,
  `CollapsibleTrigger`, `SearchInput` (pointer and keys) and `ListItem`.
- All five suites, the whole behaviour suite and the unit suite pass with the
  counts above.
- Docs pages, `COMPONENTS.md` and the inventory check agree with the code.
- `nub run check`, `nub run lint` and `nub run test` pass at the repo root.
