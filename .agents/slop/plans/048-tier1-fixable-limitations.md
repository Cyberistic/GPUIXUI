# 048 — Three fixable Tier 1 limitations (primitives workstream)

- **Phase:** C (polish). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `047`.
- **Status:** done — all three landed and proven in the real renderer; evidence
  in §7.
- **Why:** plan 047's pages name three limitations that the runtime can actually
  support. They are small, testable, and each one removes a real consumer
  papercut. The rest of the documented limitations (no `aria-checked`, no
  `focusVisible`, no scrollbar tint, no rotation) stay limitations — the
  runtime does not support them.

## 1. The three changes

### 1.1 `ButtonGroup` can have an accessible name

`role="group"` with no name is not useful to a screen reader. GPUix supports
`aria-label` on a host element (a `Button` already relies on it).

- `ButtonGroupProps.label?: string` → `aria-label={label}` on the group div.
- Page: API row and a usage line; remove the "no accessible name" limitation.
- Example: the form example's action group passes `label="Form actions"`.

### 1.2 `ScrollArea` forwards `onScroll`

GPUix 0.10.0's host props include `onScroll?: (event: EventPayload) => void`,
populated with `deltaX`, `deltaY`, `precise` and `touchPhase`. This component
currently drops it, so a consumer cannot react to scrolling at all.

- `ScrollAreaProps.onScroll?: (event: EventPayload) => void` → forwarded to the
  div. It is a **delta** event, not an offset: document that a consumer
  accumulates deltas and that there is no `onScrollChange`/absolute offset.
- Page: API row, keyboard section, and the limitation becomes "deltas only".
- Runtime test: wheel over the area and assert the handler saw `deltaY -100`.

### 1.3 `RadioGroup` handles Home and End

`core/keyboard.ts` already exports `decideAbsolute`, but the group never calls
it. A long radio list cannot jump to its ends.

- `decideAbsolute(count, key, isDisabled?)` gains the same optional disabled
  predicate `decideMove` has, so Home/End land on the nearest **enabled** end.
- `RadioGroup` handles Home/End before the activation check and selects the
  landing option, exactly as an arrow does.
- Page: keyboard table rows; remove the Home/End limitation.
- Runtime test: Home selects the first enabled option, End the last, skipping
  disabled ends.

## 2. Files

```
M packages/primitives/src/components/ButtonGroup.tsx
M packages/primitives/src/components/ScrollArea.tsx
M packages/primitives/src/components/RadioGroup.tsx
M packages/primitives/src/core/keyboard.ts
M packages/primitives/src/core/keyboard.test.ts
M packages/primitives/src/components/presentational.test.tsx
M packages/primitives/src/components/selection.test.tsx
M packages/primitives/runtime/controls.runtime.test.tsx
M packages/primitives/runtime/layout.runtime.test.tsx
M packages/primitives/examples/form.example.tsx
M packages/primitives/docs/button-group.mdx
M packages/primitives/docs/scroll-area.mdx
M packages/primitives/docs/radio-group.mdx
M COMPONENTS.md
M TODO.md
A .agents/slop/plans/048-tier1-fixable-limitations.md
M .agents/slop/plans/README.md
```

## 3. Test plan (each must fail before the change)

1. **ButtonGroup name** — `presentational.test.tsx` asserts the rendered group
   carries `aria-label` when `label` is given; `controls.runtime.test.tsx`
   asserts an accessibility `Group` node with that label. Before the change the
   prop does not exist (type error) and the a11y node has no label.
2. **ScrollArea deltas** — `layout.runtime.test.tsx` records `onScroll` events,
   wheels `-100`, dispatches native events and asserts the handler saw
   `deltaY === -100`. Before the change the prop does not exist.
3. **Home/End** — `keyboard.test.ts` asserts `decideAbsolute` skips a disabled
   first/last; `controls.runtime.test.tsx` asserts Home selects the first
   enabled option and End the last. Before the change the group ignores both
   keys (announced value stays on the default).

Prove both directions per component: run the new assertion with the change
reverted (fails), then with it applied (passes). Record the measured commands in
§5.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expect: 153 + the new unit assertions, all pass.

nub run --filter @gpuixui/primitives test:runtime
# expect: 7 files, 60 + 4 new runtime assertions, all pass.

nub run check
# expect: check-tests, lint, fmt, check-types pass.
```

## 5. STOP conditions

- GPUI does not deliver `onScroll` to React in the test renderer → do not fake
  it; keep the limitation, record the measurement here, and drop that item.
- AccessKit reports the group under a role other than `Group` → assert the role
  it actually reports; never invent one.
- Home/End change makes the roving tab stop disagree with the selection →
  stop; the tab stop and selection must move together.

## 6. Acceptance criteria

- The three props/keys work and are proven in the real renderer.
- The three pages and `COMPONENTS.md` no longer claim the fixed limitation.
- `TODO.md` records the unit as done; plan index updated.
- Two-direction evidence recorded in §7.

### §7 Evidence

Measured 2026-10-17 on the locally-built 0.10.0 binding.

**Tests first (they failed before the change):** `tsc --noEmit` rejected the new
`label` / `onScroll` props and the third `decideAbsolute` argument — the tests
named behaviour the code did not have.

**Two directions, one probe each:**

| Change | Probe (implementation reverted) | Result |
| ------ | ------------------------------- | ------ |
| `ButtonGroup` name | remove `aria-label={label}` | unit: `expectSome` fails at `presentational.test.tsx:159`; runtime: `Group`/`Text alignment` → `false` |
| `ScrollArea` deltas | remove `onScroll={onScroll}` | runtime: `expected [] to include -100` |
| `RadioGroup` Home/End | remove `jump(key)` from `onKeyDown` | runtime: `expected 'unchecked' to be 'checked'` for Beta on Home |

After restoring: **156 unit tests pass** (`nub run --filter @gpuixui/primitives
test`), **64 runtime tests pass** in 7 files
(`nub run --filter @gpuixui/primitives test:runtime`), and `nub run check` is
green.

**One adjacent fix the probe exposed:** `RadioGroup`'s keyboard path now also
refuses to select while the whole group is `disabled`, matching the pointer path
(both use the same `disabled` predicate). It is covered by the same `select`
helper, not a new test.

**Measured fact for the page:** AccessKit reports the labelled group as role
`Group`; the runtime test asserts that role rather than inventing one.

**Adjacent coverage added in the same pass:** `runtime/examples.runtime.test.tsx`
now repaints every example with `testThemeDark` and asserts each root's fill is
the dark `card` role (64 runtime tests total). Probe: changing the layout
example's root to `tone="background"` fails that assertion with the expected
`background` value; restoring it passes.
