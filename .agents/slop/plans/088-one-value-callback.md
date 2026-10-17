# 088 — One value callback name: `onValueChange` across Tier 1

| Field | Value |
| ----- | ----- |
| Phase | F (API consistency) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `047`, `079`, `200` (components' `docs/component-api.md`) |
| Status | **in progress** |

Self-contained: §1 the inconsistency and the evidence, §2 the rule and the naming
table, §3 the exact files, §4 the checks and the two-direction proof, §5 STOP
conditions, §6 the outcome.

---

## 1. The inconsistency

The accepted cross-package contract — `packages/components/docs/component-api.md`
§2, ADR `0004`, plan `200` — says, in one line:

> `onValueChange(value)` fires on request and is the only change callback name.

It states its scope on line 5: it "applies to every Tier 1–2 component in
`packages/components` and `packages/primitives`". The components package obeys it
(`tabs.tsx`, `list.tsx`, `search-input.tsx`, `date-picker.tsx`, … all expose
`onValueChange`). This package does not:

| Public prop | Callback shape |
| ----------- | -------------- |
| `Checkbox.onChange` | `(next: boolean) => void` |
| `CheckboxGroup.onChange` | `(value: readonly string[]) => void` |
| `Input.onChange` / `TextArea.onChange` (`FieldProps`) | `(value: string) => void` |
| `NumberField.onChange` | `(value: number) => void` |
| `OTPField.onChange` | `(value: string) => void` |
| `RadioGroup.onChange` | `(value: string) => void` |
| `Rating.onChange` | `(value: number) => void` |
| `Select.onChange` | `(value: string) => void` |
| `Slider.onChange` / `RangeSlider.onChange` | `(value: number \| readonly [number, number]) => void` |
| `Switch.onChange` | `(next: boolean) => void` |
| `ToggleGroup.onChange` | `(value \| readonly string[]) => void` |

`TODO.md` records this as an open cross-team decision: rename the value
controls, or amend §2 to name a text-field exception. Leaving it unresolved is
the defect: a consumer of both packages writes `onValueChange` on a `Tabs` and
`onChange` on a `Checkbox`, and a Tier 2 example teaches the split.

Two facts make the one-name resolution safe and correct:

- Our callback **is not** React's `onChange`. It receives a value, never an
  event, and the host's own `onChange` (which *does* receive `EventPayload`) is
  the thing it wraps. The familiar name promises a shape we do not have.
- Nothing outside this package consumes the prop yet: `packages/components`
  keeps a local input stand-in ("the control is the GPUix `<input>` host element
  until `@gpuixui/primitives` lands", `field.tsx` §) and does not import this
  package, so there is no call site to deprecate. The only in-repo consumer is
  `examples/basic-app`, which this workstream owns.

## 2. The rule

**A controlled callback is named after the state it reports.**

| State the control owns | PropTypes | Callback |
| ---------------------- | --------- | -------- |
| `value` (the library's single value/selection state) | `value` / `defaultValue` | `onValueChange(value)` |
| `pressed` (`Toggle` only — Radix's shape, already shipped) | `pressed` / `defaultPressed` | `onPressedChange(pressed)` |
| `open` (overlay state) | — | `onOpenChange(open)` |

- `onChange` is **retired** from every public prop in this package. There is no
  alias: an alias would be a second name for the same thing, which is the bug.
- The GPUix **host** handlers stay untouched: `fieldHostProps` still wires the
  element's `onChange`/`onSubmit` to the runtime. Only our public props move.
- No behaviour changes. The same `useControlState` call, the same "only when it
  changed" rule, the same tests — asserting through the new prop name.

## 3. Files to change

### 3.1 Public props (13 files)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Checkbox.tsx` | `CheckboxProps.onChange` → `onValueChange`; `useControlState(..., props.onValueChange)` |
| `…/CheckboxGroup.tsx` | the same |
| `…/Input.tsx` | `FieldProps.onChange` → `onValueChange` (doc comment reworded); `useControlState(..., props.onValueChange)` |
| `…/TextArea.tsx` | passes `props.onValueChange` |
| `…/NumberField.tsx`, `…/OTPField.tsx`, `…/RadioGroup.tsx`, `…/Rating.tsx`, `…/Select.tsx`, `…/Slider.tsx` (two props interfaces), `…/Switch.tsx`, `…/ToggleGroup.tsx` | `onChange` → `onValueChange`; the `props.` read follows |

`Slider.tsx` and `RangeSlider` are one file with two props interfaces
(`SliderProps`, `RangeSliderProps`) — both rename.

### 3.2 Tests (the two directions live here)

| Path | Change |
| ---- | ------ |
| `src/components/*.test.tsx` | any render/JSX that passes the **component** prop. GPUix **host** uses (`hostHandler(el, "onChange")`, `<input onChange={…}>`) stay. |
| `runtime/*.runtime.test.tsx` | the same split: the mounted components take `onValueChange`; raw hosts keep `onChange`. |

Files with component-prop usages: `src/components/fields.test.tsx`,
`src/components/NumberField.test.tsx`, `src/components/OTPField.test.tsx`,
`src/components/Select.test.tsx`, `src/components/Slider.test.tsx`,
`src/components/state-style.test.tsx`, `runtime/controls.runtime.test.tsx`,
`runtime/fields.runtime.test.tsx`, `runtime/number-field.runtime.test.tsx`,
`runtime/otp.runtime.test.tsx`, `runtime/rating.runtime.test.tsx`,
`runtime/value.runtime.test.tsx`, plus any suite the compiler names.

### 3.3 New guard

`packages/primitives/src/callback-names.test.ts` — reads every
`src/components/*.tsx` (the pattern is already proven by `src/exports.test.ts`,
which reads the real package) and fails by file and line if:

1. a public props interface declares `readonly onChange?:` (the retired name),
2. a page in `docs/*.mdx` documents an `onChange` prop row or passes `onChange`
   to one of this package's components (code fences included).

The allowlist is empty. A host `onChange` is written `onChange: (event:
EventPayload) => …` inside a component body, never as a `readonly onChange?:`
prop declaration, so the first rule cannot false-positive on the runtime wiring.

### 3.4 Docs, examples, inventory

| Path | Change |
| ---- | ------ |
| `docs/{input,textarea,number-field,otp-field,checkbox,checkbox-group,radio-group,switch,select,slider,range-slider,rating,toggle-group}.mdx` | prop table rows, usage snippets and prose: `onChange` → `onValueChange`; the "no value callback" prose keeps its meaning |
| `examples/{form,number-field,otp,rating,selection,toggle-group,value}.example.tsx` | prop names |
| `examples/basic-app/src/App.tsx` | prop names (+ its local `Switch` wrapper's `onChange` → `onValueChange`) |
| `packages/primitives/README.md` | one sentence in the API section naming the rule, if it names callbacks at all |
| `COMPONENTS.md` | the rows that quote `onChange` as **our** prop (Input, NumberField, Rating, Slider, RangeSlider, Select, …): use `onValueChange`; rows quoting the **host** stay |
| `TODO.md` | tick the callback-name item; add the cross-team ask: components' plan `110` §7 table and `docs/component-api.md`'s adoption note still say text fields keep `onChange` — that table must be updated when components imports this package (their paths, not ours) |
| `.agents/slop/plans/README.md` | index this plan |

`examples/basic-app` is not under `packages/primitives`, but it is the primitives
workstream's consumer (`TODO.md` §"examples/basic-app"), and the tree does not
typecheck without it; no other workstream owns a file under `examples/`.

## 4. Checks and the two-direction proof

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
nub run test
```

Expected: offline green with the same count as before this plan (the props
rename only); runtime green with the same count; `check`, `lint` and the root
`test` exit `0`.

**Direction A (must fail without the fix).** Before touching the source, change
one suite's prop to `onValueChange` and run it: the old component ignores the
prop, so the callback records zero calls and the assertion fails. Record the
failing test name and count in §6. This is the honest "the test can fail" proof
for a rename: the test's assertion is unchanged, only the name it wires.

**Direction B (must pass with the fix).** After the rename the same suite is
green, and no `onChange` appears on a component prop anywhere in the package
(`callback-names.test.ts`).

The naming guard itself gets the same treatment: add a temporary
`readonly onChange?:` line to a component, watch `callback-names.test.ts` fail by
file, remove it. Record both.

## 5. STOP conditions

- **Stop** if any consumer **outside this worktree** already passes our
  `onChange` through the package boundary: grep
  `/Users/cyberistic/GPUIXUI/workspaces/*/packages/*/src` for
  `@gpuixui/primitives` imports that forward a change prop. Today the components
  package does not import this package at all; if that changed, report the call
  sites instead of breaking them.
- **Stop** if the runtime proves a component's callback is the *host* handler
  rather than ours (i.e. a test can only pass by dispatching a native event that
  the wrapper does not route): report, do not invent a second path.
- Do **not** rename `onPressedChange` (`Toggle`) or `onOpenChange`
  (`Tooltip`, `Select`): §2 makes them the correct names for their state.
- Do **not** add a deprecated `onChange` alias "for convenience": one name is
  the point of the plan.
- Do **not** edit `packages/components`' `docs/component-api.md`, plan `110` §7
  or any other workstream's file. Record the ask in `TODO.md`.
- Do **not** claim any component `done` on the strength of this plan: it is an
  API-consistency change; the inventory rows' blockers (docs site pages,
  published-binary CI) are unchanged.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| Direction A: `runtime/value.runtime.test.tsx` renamed first, source unchanged | **5 failed / 226 passed** — `expected undefined to be 75`, the callbacks never fired |
| `nub run --filter @gpuixui/primitives test` | 37 files, **421 tests green** (was 36 / 419; +2 guard cases) |
| `nub run --filter @gpuixui/primitives test:runtime` | 19 files, **231 tests green** — unchanged count, the same interactions through the new prop |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` (root) | exit `0` |
| guard direction 1: a temporary `readonly onChange?:` in `Checkbox` | `callback-names.test.ts` failed with `src/components/Checkbox.tsx: readonly onChange?: (next: boolean) => void;` |
| guard direction 2: a temporary `onChange={setName}` in `form.example.tsx` | the same test failed naming `examples/form.example.tsx` |

Changed:

- Thirteen public props (`Checkbox`, `CheckboxGroup`, `Input`/`TextArea` via
  `FieldProps`, `NumberField`, `OTPField`, `RadioGroup`, `Rating`, `Select`,
  `Slider`, `RangeSlider`, `Switch`, `ToggleGroup`) are `onValueChange`. The
  internal `useControlState` parameter follows, so the package speaks one name.
- `src/callback-names.test.ts` — the guard, reading the real component sources,
  pages and examples.
- Docs (ten pages), eight examples, `examples/basic-app`, `COMPONENTS.md`'s
  Input row, the package README's new "One value callback" section.
- Unchanged by design: `Toggle.onPressedChange`, `Tooltip.onOpenChange`,
  `Select.onOpenChange`, and every GPUix **host** handler (`fieldHostProps` still
  wires the element's `onChange`).

The cross-team ask is recorded in `TODO.md`: the components workstream's plan
`110` §7 table still names `onChange` for the text fields and must be updated
when that package imports this one.
