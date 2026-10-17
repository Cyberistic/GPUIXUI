# 079 — State-aware `style`, slice 1: the seam and the controls

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream (`packages/primitives`) |
| Depends on | `030`, `040`, `041`, `047`, `074`, `078` |
| Status | planned 2026-10-18 |
| Source | `docs/component-api.md` §3 (components worktree, plan `200`/`305`); components `TODO.md` → "`packages/primitives` adopts the same contract for Tier 1 … (owner: primitives)" |

Self-contained.

---

## 1. Why

The Tier 1–2 public API contract (`docs/component-api.md`, accepted in the
components worktree) says a component is styled **from a public state object**,
not from CSS, data attributes or CSS variables — none of which exist in GPUix:

```tsx
<TabsTrigger
  value="billing"
  style={(state) => ({ opacity: state.active ? 1 : 0.85 })}
/>
```

`style` is `StateStyle<PartState>` — the published runtime type
(`@gpuix/react/floating`, the same one GPUix's own `SelectItem`/`ComboboxItem`
use): a `StyleDesc` **or** `(state) => StyleDesc`. Plan `305` landed that for
eleven parts in `packages/components`. Its `TODO.md` leaves one row open,
addressed to this package:

> `[ ]` `packages/primitives` adopts the same contract for Tier 1 (a parts
> table row is the spec; the package is owned by primitives) (owner: primitives)

Today every primitive accepts a plain `StyleDesc`, so a consumer who wants a
different **checked**, **focused**, **invalid** or **disabled** look has to fork
the component or re-derive the state outside it. That is exactly the ownership
shadcn promises and this package does not yet deliver.

This plan is **slice 1**: the shared resolution seam and the controls that own
their own focus/checked state (`Button`, `Toggle`, `Checkbox`, `Switch`,
`Input`, `TextArea`, `NumberField`). Slice 2 (`080`) covers the group roots and
the remaining styled regions (`Label`, `ScrollArea`, `Select`, `OTPField`,
`Rating`, `CheckboxGroup`, `RadioGroup`, `ToggleGroup`, `Slider`,
`RangeSlider`). Per-item styling for the data-driven composites (radio options,
toggle items, slider thumbs, rating stars, OTP cells) is **not** part of either
slice: those are data, not parts, and exposing `optionStyle`/`thumbStyle` is a
separate API decision — recorded as an open TODO row rather than smuggled in
here.

## 2. The contract this adopts

1. The type is **the runtime's**, not a copy: import `StateStyle` and
   `resolveStyle` from `@gpuix/react/floating`.
2. A part's `style` is resolved **after** its own rules and merged last, so a
   callback wins exactly where an object style wins today. An object style keeps
   working unchanged (same union).
3. The state object is **public API**: a named, exported `<Part>State` type.
   Field names come from the contract's vocabulary (`checked`, `disabled`,
   `focused`, `invalid`, `open`, …). Two additions are needed because this
   package has real states the components' eleven parts do not:
   `ButtonState.loading` and `CheckboxState.indeterminate`.
4. State is computed on every render from values the part already has. No new
   context, no effect, no second state store.

### State table (slice 1)

| Component | Type | Fields | Notes |
| --------- | ---- | ------ | ----- |
| `Button` | `ButtonState` | `disabled`, `focused`, `loading` | `disabled` mirrors the prop; `loading` is its own state (a loading button stays focusable) |
| `Toggle` | `ToggleState` | `checked`, `disabled`, `focused` | `checked` is the contract word for a toggle's pressed state — there is no `pressed` in the vocabulary |
| `Checkbox` | `CheckboxState` | `checked`, `indeterminate`, `disabled`, `focused`, `invalid` | `checked` is false while indeterminate, so the pair is explicit rather than a three-state string |
| `Switch` | `SwitchState` | `checked`, `disabled`, `focused`, `invalid` | |
| `Input`, `TextArea`, `NumberField` | `FieldState` | `disabled`, `focused`, `invalid` | one type, because the three share one chrome resolver |

Merge order in every case:

```
controlStyle / selectionBoxStyle / fieldChrome base
  + focus ring (where the component adds one)
  + resolveStyle(style, state)        ← caller wins, property by property
```

A callback **replaces** the object style, it does not add to it; returning `{}`
keeps the default look. Nested `hover`/`active` rules in the base keep working
unless the callback supplies its own — recorded as a limitation in the docs and
in `COMPONENTS.md`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `src/components/internal.ts` | add `StateStyle` re-export + `resolvePartStyle(base, style, state)` using the published `resolveStyle`; one place for the merge order |
| `src/components/Button.tsx` | export `ButtonState`; `style?: StateStyle<ButtonState>`; resolve with `{ disabled, focused, loading }` |
| `src/components/Toggle.tsx` | export `ToggleState`; resolve with `{ checked: state.current, disabled, focused }` |
| `src/components/Checkbox.tsx` | export `CheckboxState`; resolve with the derived selection state |
| `src/components/Switch.tsx` | export `SwitchState`; resolve with `{ checked, disabled, focused, invalid }` |
| `src/components/Input.tsx` | export `FieldState`; `style?: StateStyle<FieldState>`; resolve inside `fieldChrome` (which `TextArea` also uses) |
| `src/components/NumberField.tsx` | `style?: StateStyle<FieldState>`; resolve its own chrome with the same state |
| `src/components/index.ts` | export `ButtonState`, `ToggleState`, `CheckboxState`, `SwitchState`, `FieldState` |
| `src/components/state-style.test.tsx` | **new** offline suite (§5) |
| `runtime/state-style.runtime.test.tsx` | **new** runtime suite (§5) |
| `docs/button.mdx`, `toggle.mdx`, `checkbox.mdx`, `switch.mdx`, `input.mdx`, `textarea.mdx`, `number-field.mdx` | a "Style by state" subsection with the state table and one snippet; add the `style` row's type where the API table names it |
| `packages/primitives/README.md` | one paragraph under "Two layers"/components: `style` is state-aware, and the two vocabulary additions |
| `COMPONENTS.md` | one sentence in the notes of each of the seven Tier 1 rows: "style accepts a `<X>State` callback (plan 079)" |
| `TODO.md` | tick slice 1; record slice 2 (`080`) and the data-driven per-item styling question |
| `.agents/slop/plans/README.md` | index this plan and `080` |

Do **not** touch `docs/component-api.md` (components workstream) — cite it.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives check-types      # exit 0
nub run --filter @gpuixui/primitives test             # exit 0, 375 existing + new
nub run --filter @gpuixui/primitives test:runtime     # exit 0, 184 existing + new
nub run check                                         # exit 0 (tests-can-fail, lint, fmt, types)
```

## 5. Test plan

### Offline — `src/components/state-style.test.tsx` (new)

Call the pure render functions (the wrappers are hook holders) with fixtures.
Each case passes a callback that records the state it received and returns
`{ backgroundColor: "#123456" }`, then asserts three things:

1. the recorded state equals the documented shape for that fixture;
2. `hostStyleString(element, "backgroundColor")` is `#123456` — the callback's
   style reached the resolved style;
3. an **object** style still paints (one case, on `Button`), so the union did
   not regress the old contract.

Cases:

- `renderButton` with `focused: true` → `{ disabled: false, focused: true, loading: false }`; a disabled fixture reports `disabled: true`; a loading fixture reports `loading: true`;
- `renderToggle` pressed → `{ checked: true, disabled: false, focused: false }`;
- `renderCheckbox` checked and a second fixture indeterminate → `checked` true vs `indeterminate` true (never both);
- `renderSwitch` checked → `checked: true`;
- `fieldChrome` (the exported resolver) with `{ invalid: true, disabled: false }` and `focused: true` → `{ disabled: false, focused: true, invalid: true }`, and the callback's colour wins over the chrome's background;
- `renderNumberField`'s chrome path: call `renderNumberField` with the fixture state and assert the recorded `FieldState` and the painted colour (the same resolver, proven through the component that reimplements it).

### Runtime — `runtime/state-style.runtime.test.tsx` (new)

Four measured cases, each mounting a tree in the real `TestRenderer` and
reading `TestElement.style`:

1. **Button**: a `style` callback paints `destructive` while `focused` and
   `secondary` otherwise; `focusNext()` flips the painted colour (proves
   `focused` is live, not a render-time constant).
2. **Checkbox**: the callback paints `primary` while checked and `muted` while
   not; a real click flips it (proves `checked` comes from resolved state, not
   the prop).
3. **Input**: the callback paints the destructive colour when `invalid`; two
   fields, one valid and one invalid, paint their own states (proves the state
   is per-instance).
4. **Toggle**: the callback paints the pressed colour after a click (proves a
   controlled/uncontrolled value reaches the callback).

### Both directions

Change `resolvePartStyle` to ignore the callback
(`mergeStyle(base, undefined)`) → every new offline case and all four runtime
cases fail. Restore → green. Record the exact command and result in §8.

## 6. STOP conditions

Stop and report if:

- `resolveStyle`/`StateStyle` are not importable from the published
  `@gpuix/react/floating` (they are — verified in 0.10.0), or importing them
  pulls the native binding into `core/` (it must not: the seam lives in
  `components/internal.ts`, which already sits on the runtime side);
- a state cannot be computed without new state or an effect (none expected);
- the docs coverage guard treats a state type as an undocumented component
  (types are erased from the runtime export table; if a guard trips, fix the
  guard's allowlist, not the type);
- a test's callback cannot win over a nested `hover`/`active` rule — record the
  merge limit in the docs instead of flattening the runtime's style model.

## 7. Acceptance criteria

- `style` on the seven slice-1 components accepts `StateStyle<<X>State>`, and
  each state type is exported from the package root.
- The callback receives the documented state and its result merges last; object
  styles and every existing behaviour are unchanged.
- Seven docs pages document the state with a snippet; `COMPONENTS.md` and the
  README record the mechanism and the two vocabulary additions.
- The new suites fail with the resolver removed and pass with it; all gates in
  §4 are green.
- `TODO.md` ticks slice 1 and records slice 2 (`080`).

## 8. Result

Landed 2026-10-18.

- The seam is the runtime's own: `resolvePartStyle(base, style, state)` in
  `src/components/internal.ts` calls the published `resolveStyle` from
  `@gpuix/react/floating` and merges its result through the existing
  `mergeStyle`. No local `StateStyle` lookalike.
- Seven parts now accept `StateStyle<<Part>State>` and export the state type:
  `Button` (`disabled`, `focused`, `loading`), `Toggle` (`checked`, `disabled`,
  `focused`), `Checkbox` (`checked`, `indeterminate`, `disabled`, `focused`,
  `invalid`), `Switch` (`checked`, `disabled`, `focused`, `invalid`), and
  `Input`/`TextArea`/`NumberField` (`FieldState`: `disabled`, `focused`,
  `invalid`). `FieldState` is one type because the three share one chrome
  resolver.
- **Measured**:
  - `src/components/state-style.test.tsx` — 7 cases: each state payload, the
    callback's colour winning, and the old object form on `Button`;
  - `runtime/state-style.runtime.test.tsx` — 4 cases: `focused` follows
    `focusNext`, `checked` follows a click, `invalid` differs per field
    instance, and a toggle's pressed state reaches the paint.
  - `nub run --filter @gpuixui/primitives test` → 34 files / **382 tests**
    (was 375); `test:runtime` → 17 files / **188 tests** (was 184).
- **Both directions**: replacing the body with `mergeStyle(base, undefined)`
  failed **all 7** offline cases and **all 4** runtime cases; restoring it made
  both runs green again.
- Docs: seven pages gained "Style by state" (state table + snippet) and the
  verification bullet; `README.md` records the mechanism and the two vocabulary
  additions (`loading`, `indeterminate`); `COMPONENTS.md` notes the state on
  each row and the new test counts.
- Deviation from the plan: `TextArea` re-bases its own vertical padding after
  the resolved style, so a callback's `paddingTop` does not survive — recorded
  on its page and in the plan's test notes rather than hidden.
- Slice 2 is planned as `080`; per-item styling for the data-driven composites
  remains an open API question (TODO row, plan 080 §6).
