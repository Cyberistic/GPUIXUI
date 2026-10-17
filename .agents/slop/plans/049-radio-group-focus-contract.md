# 049 — The radio group's focus contract, and a Switch prop that did nothing

- **Phase:** C (polish). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `044`, `047`, `048`.
- **Status:** done — implemented and measured in the real renderer; evidence in §7.
- **Why:** auditing every Tier 1 focus state turned up four defects in the
  selection controls. They are small, they are all observable in the real
  renderer, and together they decide whether a keyboard user can tell which
  option they are on. Every other focusable primitive already paints a ring;
  a radio group is the one that cannot.

## 1. The defects, as measured

Probes written against the real 0.10.0 `TestRenderer` (deleted after use; the
guarding tests live in §3).

### 1.1 A radio group paints no focus ring

`RadioGroup` calls `useFocus()` and puts `onFocus`/`onBlur` on the **group
wrapper**. GPUI dispatches a focus event to the focused element and React's
per-element handlers mean a wrapper never sees it. The wrapper's `focused` flag
therefore never becomes true in real use — and even if it did, no style reads
it. Measured: after Tab into a group the focused element's `style` is
`{display, flexDirection, gap, cursor}` with no `boxShadow`; a `Checkbox`
focused by the same press carries the ring.

### 1.2 Arrows move the selection, not the focus

The platform radio contract is "selection follows focus". Measured: with Alpha
focused, an ArrowDown delivered to the focused item selects Beta
(`aria-valuetext` flips) and the runtime still reports Alpha as
`getFocusedElementId`. The tab stop also moves to Beta, so the UI now shows a
tab stop, a selection and a focus in two different places. A ring on its own
would make this visibly wrong rather than better.

### 1.3 A controlled value change leaves the tab stop behind

`activeIndex` is `useState` initialised once from `props.value`, and only the
group's own interactions update it. A parent that sets `value` (a "reset"
button, a restored draft) moves the selection and leaves the tab stop on the
old option: Tab enters the group at the wrong radio.

The roving index is redundant: in a correct radio group the tab stop **is** the
selection. It can be derived every render from the current value instead of
stored, which removes the state and the defect together.

### 1.4 `Switch`'s `invalid` prop does nothing

`docs/switch.mdx` says "`invalid` — the track takes the destructive role".
`selectionBoxStyle` reads `spec.invalid`; `switchTrackStyle` never does. The
prop reaches `SelectionSpec` and is dropped. Measured: a switch rendered with
`invalid` has the same `borderColor` as one without.

## 2. The changes

### 2.1 One focus-ring shape for selection controls (`core/selection.ts`)

`Checkbox` and `Switch` each inline the same zero-offset, zero-blur shadow; the
radio has none. Move it into the paint that owns selection metrics:

- add `focused?: boolean` to `SelectionSpec`;
- `selectionBoxStyle` and `switchTrackStyle` set `boxShadow` from a shared
  `focusRing(theme)` when `spec.focused === true`
  (`spreadRadius: borderWidth.strong`, `color: colors.ring`);
- `Checkbox` and `Switch` pass `focused: focus.focused` and drop their inline
  merge (fewer lines, identical output);
- **`switchTrackStyle` also applies `spec.invalid`**: the border takes
  `colors.destructive` like a checkbox's does.

### 2.2 `RadioGroup` tracks focus per item (`components/RadioGroup.tsx`)

Replace `FocusState` (one flag for the wrapper) with:

```ts
export interface RadioGroupFocus {
  readonly focusedIndex: number | null;
  readonly onFocus: (index: number) => void;
  readonly onBlur: (index: number) => void;
}
```

Each item owns `onFocus`/`onBlur`, and its `SelectionSpec` gets
`focused: focusedIndex === index`. The blur handler ignores an index that is no
longer the focused one, so an old item's blur cannot clear the ring the new item
just painted.

### 2.3 Selection follows focus

The group's key handler runs the move, then asks the component to focus the
landing item:

- each item registers its host instance id through a `ref` callback
  (`PublicInstance.id`) into a `useRef<Map<number, number>>`;
- the component reads `useGpuix().renderer` (not `useGpuixRequired`, so an
  element-tree test or a docs render simply has no renderer) and calls
  `renderer.focusElement(id)` for the landing index;
- a click already moves focus natively, so the pointer path is untouched;
- Enter/Space select where focus already is, so they do not move it.

### 2.4 The roving index is derived, not stored

`activeIndex = initialActiveIndex(options, state.current)` each render; delete
the `useState` and the `onActivate` handler slot it needed. `initialActiveIndex`
already answers both questions (the selected option, or the first enabled one).

## 3. Files

```
M packages/primitives/src/core/selection.ts
M packages/primitives/src/core/selection.test.ts
M packages/primitives/src/components/Checkbox.tsx
M packages/primitives/src/components/Switch.tsx
M packages/primitives/src/components/RadioGroup.tsx
M packages/primitives/src/components/selection.test.tsx
M packages/primitives/runtime/controls.runtime.test.tsx
M packages/primitives/docs/radio-group.mdx
M packages/primitives/docs/switch.mdx
M COMPONENTS.md
M TODO.md
A .agents/slop/plans/049-radio-group-focus-contract.md
M .agents/slop/plans/README.md
```

## 4. Test plan (each assertion must fail before its change)

1. **Focus ring, unit** — `core/selection.test.ts`: a focused selection box and a
   focused switch track carry `boxShadow`; unfocused ones do not; the spread is
   `borderWidth.strong` and the colour is `colors.ring`.
2. **`invalid` switch, unit** — a switch track with `invalid` has
   `borderColor === colors.destructive`, without it `colors.input`. Before the
   change both are `colors.input`.
3. **Per-item ring, unit** — `renderRadioGroup` with `focusedIndex: 1` paints the
   ring on Beta's box only, and every item carries `onFocus`/`onBlur`.
4. **Focus follow, runtime** — Tab into the group, ArrowDown: Beta is checked
   **and** `focusedElement()`'s `aria-label` is `Beta`. Before the change the
   label stays `Alpha`.
5. **Ring follows focus, runtime** — Tab into the group: Alpha's style has
   `boxShadow`, Beta's does not; after ArrowDown it is the other way round;
   after tabbing out neither has one.
5b. **Checkbox and Switch rings, runtime** — the ring the refactor shares is
   wired by each control: clicking a Checkbox paints its ring, clicking the
   Switch beside it clears the checkbox's and paints the switch's.
6. **Controlled tab stop, runtime** — mount a controlled group at `a`, re-mount
   at `b`, Tab in from the control above: the focused label is `Beta`. Before
   the change it is `Alpha`.
7. **Both directions** — for each item, revert only that change and record the
   assertion that fails (§7).

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expect: 161 unit tests (156 before; +5), all pass.

nub run --filter @gpuixui/primitives test:runtime
# expect: 7 files, 68 runtime tests (64 before; +4), all pass.

nub run check
# expect: check-tests, lint, fmt, check-types pass.
```

## 6. STOP conditions

- `renderer.focusElement` is absent from the published `NativeRenderer` type or
  does not move native focus in the test renderer → stop; keep the ring only if
  it can be attached to the item that actually holds focus, otherwise leave the
  defect documented with this measurement.
- A `ref` callback on a host `div` does not yield an instance with an `id` → do
  not synthesise ids or scrape the tree; stop and record it.
- Moving focus inside a key handler causes a re-entrant focus event that loses
  the ring → fix the ordering in `onBlur` (guard by index); do not drop focus
  movement.
- Any runtime assertion can only be made to pass by re-focusing the group in the
  test harness → stop; the test must deliver the key to the focused item, as a
  user does.

## 7. Evidence

Measured 2026-10-17 on the locally-built 0.10.0 binding.

**Probe before the change** (scratch file, deleted): Tab into the group focuses
the `Alpha` item; an ArrowDown delivered to that item flips `aria-valuetext` to
Beta while `getFocusedElementId` still reports Alpha; neither item nor the
group carries a `boxShadow`. A `Checkbox` focused by a click does.

**Two directions, one probe each:**

| Change | Probe (implementation reverted) | Result |
| ------ | ------------------------------- | ------ |
| per-item focus ring | drop the `focused` branch from `selectionBoxStyle` | runtime: `rings the radio that holds focus` → `expected false to be true` (`controls.runtime.test.tsx:458`) |
| focus follows selection | drop `handlers.onFocusMove(index)` from `navigate` | runtime: `expected 'Alpha' to be 'Beta'` (`controls.runtime.test.tsx:491`) |
| derived roving index | restore the mount-only `useState` | runtime: `expected 'Alpha' to be 'Beta'` (`controls.runtime.test.tsx:521`) |
| `Switch` invalid | make `emptyBorder` the input role again | unit: the `invalid` assertion fails at `selection.test.ts:156` (input role received, destructive expected) |
| Checkbox ring wiring | drop `focused: focus.focused` from its spec | runtime: `rings a focused Checkbox and Switch` → `expected false to be true` |
| Switch ring wiring | the same revert in `Switch` | runtime: the same assertion fails on `Dark mode` |

After restoring: **161 unit tests pass** (`nub run --filter @gpuixui/primitives
test`) and **68 runtime tests pass** in 7 files (`nub run --filter
@gpuixui/primitives test:runtime`), and `nub run check` is green.

### §7b Final run

Measured 2026-10-17, after the four changes were restored:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | 16 files, **161 tests passed** (156 before; +5) |
| `nub run --filter @gpuixui/primitives test:runtime` | 7 files, **68 tests passed** (64 before; +4) |
| `nub run check` | tests-can-fail, lint, fmt and `check-types` all pass |

**Measured facts for the page:**

- `renderer.focusElement` is a **method on the renderer**: destructuring it
  loses `this` and throws `Cannot read properties of undefined (reading
  'native')`. The component calls `target.focusElement?.(id)` on the renderer
  itself.
- The ring lands on the option's **circle** (`selectionBoxStyle`), not on the
  option row, so a runtime test reads the row's first child.
- Tab into the group paints the ring on the focused option before any arrow is
  pressed (per-item `onFocus` is what makes that work; the wrapper never sees
  the event).
