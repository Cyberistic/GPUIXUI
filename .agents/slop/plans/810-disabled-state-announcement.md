# 810 — A disabled control does not say it is disabled

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth; cross-control) |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Tier 1 rows and current-run passage in `COMPONENTS.md`, `TODO.md`, the plan index) |
| Depends on | `020`, `025`, `026`, `093`, `332`, `583`, `586`, `786`, `796`, `797`, `799`, `802`, `804`, `806`, `807`, `808` |
| Status | **done** — `stateWords`/`describeState` now announce `unavailable` (disabled) and `read only` (read-only) in front of a control's description; 13 parts wired, 35 new offline cases (6 pure + 29 element-tree) and 50 new native cases, 27 doc lines corrected, runtime `78 → 79` files |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

GPUix 0.10.0 has **no `aria-disabled` and no `aria-readonly`** (plans `020`
§1.4, `786`, `799`; `docs/gpuix-capabilities.md` line 141). Every inert control
is therefore emulated: a guard inside its handler, no tab stop while `disabled`,
`readOnly` on a text host.

The consequence was never measured across the family. A probe mounted each
control once enabled and once disabled in the real runtime (release-tag build,
1280 × 800) and dumped `renderer.getA11yTree()`. The two dumps are **identical**:

| Control | Enabled node | Disabled node |
| ------- | ------------ | ------------- |
| `Button` | `Button/Save/[Click,Focus]` | `Button/Save/[Click,Focus]` |
| `IconButton` | `Button/Close/[Click,Focus]` | `Button/Close/[Click,Focus]` |
| `Toggle` | `Button/Bold/[Click,Focus]` | `Button/Bold/[Click,Focus]` |
| `Checkbox` | `Label/-/[] CheckBox/Accept/[Click,Focus]` | identical |
| `Switch` | `Label/-/[] Switch/Pause/[Click,Focus]` | identical |
| `CheckboxGroup` | `Label/-/[] CheckBox/Alpha/[Click,Focus] … Group/-/[]` | identical |
| `RadioGroup` | `RadioButton/Alpha/[Click,Focus] … RadioGroup/-/[Focus]` | identical |
| `ToggleGroup` | `Button/Alpha/[Click,Focus] … Group/-/[Focus]` | identical |
| `Rating` | `RadioButton/1 of 5/[Click,Focus] … RadioGroup/Quality/[Focus]` | identical |
| `Select` | `ComboBox/Fruit/[Click,Focus]` | identical |
| `Slider` | `Slider/Volume/[Focus]` | identical |
| `RangeSlider` | `Slider/Band minimum/[Focus] Slider/Band maximum/[Focus]` | identical |

So a screen-reader user is told a disabled control is an ordinary, actionable
control. The runtime cannot be handed the state: its `A11yTreeNode` carries only
`role`, `label`, `description`, `value`, `author_id`, `expanded`, `selected`,
`level` and `on_action` (`@gpuix/native/dist/testing.d.ts`), and the same subset
is what a consumer install sees.

`docs/gpuix-capabilities.md` already names the honest workaround for this
("carry state in `aria-valuetext`/`aria-selected`; describe with
`aria-description`"), and `Button` already uses the description channel for
`Loading` (`aria-description="Loading"`, plan `785`). The disabled/read-only
state simply never joined it.

### 0.2 The claims this contradicts

The pages say the state is not announced, which is true of the platform but not
of what the library can do, and they name the tab order as the only signal:

- `button.mdx:152` "There is no `aria-disabled`: a disabled button is removed from the tab order instead, which is the strongest truthful alternative."
- `checkbox.mdx:143` "`disabled` removes the tab stop; there is no `aria-disabled`."
- `checkbox.mdx:145`, `checkbox-group.mdx:141`, `radio-group.mdx:154`, `switch.mdx:113`, `toggle-group.mdx:184` "assistive technology hears the value but not the fact that it is locked"
- `slider.mdx:132` "0.10.0 has no `aria-readonly`, so the state is not announced"
- `select.mdx:314`, `range-slider.mdx:132`, `rating.mdx:132`, `toggle.mdx:123`
- `icon-button.mdx:106`, `switch.mdx:111`, `checkbox-group.mdx:136`
- plus the shorter read-only contrasts (`button.mdx:197`, `toggle.mdx:40`, `toggle.mdx:162`, `toggle-group.mdx:149`, `toggle-group.mdx:247`, `checkbox.mdx:113`, `checkbox-group.mdx:94`, `radio-group.mdx:70`, `switch.mdx:81`, `select.mdx:120`, `slider.mdx:68`, `range-slider.mdx:61`)

All 27 lines are listed by `rg -n "aria-disabled|aria-readonly"
packages/primitives/docs`. §3.4 replaces them with the truth.

### 0.3 What must not change

- the **roles, names and value texts**: plans `057`–`093` measured them; this
  plan only adds a description;
- the **tab order** (plans `089`, `340`, `800`, `804`) and the **focus rings**
  (`084`, `332`, `603`);
- the **behaviour**: a disabled control still refuses every path, a read-only one
  still refuses changes and keeps its stop;
- **enabled controls**: their announced description must be exactly what it is
  today (only the state words are new, and they are absent when no state holds);
- a caller's own description and a slot tip must still compose (`748`, `586`).

## 1. The decision

**Announce the state the runtime cannot express, through the one channel it
does publish: `aria-description`.**

| State | Word |
| ----- | ---- |
| `disabled` | `unavailable` |
| `readOnly` | `read only` |
| `loading` | `Loading` (existing `Button` behaviour, moved into the shared rule) |

Precedence: `disabled` wins over `readOnly` (the rule every control's paint,
handlers and tab stop already follow), and `loading` leads because it is an
activity: `"Loading. unavailable. Net of refunds."`.

Why `unavailable` rather than `disabled`: it is what a native disabled control is
called on Windows/UIA and by Narrator, it reads naturally after a name
("Save changes … unavailable"), and it matches the word the components
workspace's date picker already names an unavailable day with. The word is fixed
English, like `Loading` and `Label`'s `required`; recorded as a limitation (§3.5).

**Not changed:** the `on_action` list. A disabled control still advertises
`Click` (`aria-disabled` controls do too: ARIA keeps the action and marks the
state), so suppressing the handler would be a different, riskier change
(handler removal changes event bubbling) and is not part of this plan.

**Read-only is included**, because it is the same defect one state weaker and the
same one-line wiring per part; splitting it would mean editing the same 11 pages
twice and leaving `786`–`804`'s "not announced" claims true for longer.

## 2. The rule

One pure helper pair in `components/internal.ts`, beside `joinDescription` and
`ariaName` (the accessibility boundary helpers), with the same blank-string rule
(`usableLabel`):

```ts
/** A control state the runtime cannot put in the accessibility tree. */
export interface AnnouncedState {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly loading?: boolean;
}

/** The words such a state adds: `Loading`, `unavailable`, `read only`. */
export const stateWords = (state: AnnouncedState): string =>
  Arr.join(
    Arr.getSomes([
      state.loading === true ? Option.some("Loading") : Option.none(),
      state.disabled === true
        ? Option.some("unavailable")
        : state.readOnly === true
          ? Option.some("read only")
          : Option.none(),
    ]),
    ". ",
  );

/** A caller's description with the state words in front of it. */
export const describeState = (
  description: string | undefined,
  state: AnnouncedState,
): string | undefined => joinDescription(stateWords(state), description);
```

Properties the tests pin:

- no state → `stateWords` is `""` and `describeState` returns the description
  unchanged (trimmed/absent by `joinDescription`, plan `586`);
- `disabled` → `"unavailable"`; `readOnly` → `"read only"`; both →
  `"unavailable"`; `loading` + `disabled` → `"Loading. unavailable"`;
- a description composes **after** the state words with one sentence boundary:
  `"unavailable. Net of refunds."`; a blank description adds no `". "`.

Every surface with a control node passes its own state:
`describeState(description, { disabled, readOnly })` (or `props`, which is
structurally the same for the single-root parts).

## 3. The files

### 3.1 The helper

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/internal.ts` | add `AnnouncedState`, `stateWords`, `describeState` beside `joinDescription`; export them (module seam, not the package root) |

### 3.2 The call sites

Each row is the **node that carries the accessible name** (the control a reader
lands on). A container that is not a control gets nothing.

| File | Node | State read |
| ---- | ---- | ---------- |
| `components/Button.tsx` | the button (`aria-description={description}`) | replace the hand-rolled `Loading` expression with `describeState(props["aria-description"], props)`; drop the now-unused local |
| `components/Toggle.tsx` | the root | `props` |
| `components/Checkbox.tsx` | the single control object (`"aria-description": joinDescription(...)`) | `describeState(joinDescription(props.description, props["aria-description"]), props)` |
| `components/Switch.tsx` | same shape | same |
| `components/Input.tsx` | `fieldHostProps` (covers `TextArea` too) | `describeState(props["aria-description"], props)` |
| `components/NumberField.tsx` | the inner text host (line ~233) | `props` |
| `components/Select.tsx` | `SelectTrigger` | `props` (its `description` is already resolved) |
| `components/Slider.tsx` | `renderSlider`'s track | `props` |
| `components/Slider.tsx` | `renderRangeSlider`'s two thumbs | `props` — each thumb gets `describeState(props["aria-description"], props)`; the group root stays a container |
| `components/Rating.tsx` | each star (`role="radio"`) | `props` — a new `aria-description`, because the star has none today |
| `components/CheckboxGroup.tsx` | `renderRow`'s row (parent and options) | `describeState(description, { disabled, readOnly })` with the row's **effective** flags |
| `components/RadioGroup.tsx` | each option row | `describeState(option.description, { disabled, readOnly: props.readOnly })` |
| `components/ToggleGroup.tsx` | each item | `props`' `disabled` per item + the group's `readOnly`; a new attribute, because items have none today |
| `components/OTPField.tsx` | the `role="group"` root (the field's only named node) | `stateWords({ disabled: props.disabled, readOnly: props.readOnly })` as a new `aria-description` |

`IconButton` inherits `Button`'s path. `ScrollArea`, `Surface`, `InfoTip`,
`Tooltip`, `Progress`, `Meter`, `Spinner`, `Skeleton`, `Text`, `Stack`, `Box`,
`Separator` and `Spacer` have no `disabled`/`readOnly` control node and are
untouched.

### 3.3 Tests

| File | Change |
| ---- | ------ |
| `src/components/description.test.tsx` | add a `describe("the state words")` block: 6 pure cases over `stateWords`/`describeState`; an element-tree matrix over every renderer that declares `aria-description` (9 parts with a `disabled` prop, enabled/disabled/read-only) plus the composed-description and busy cases; **extend the source scan** so a surface that declares the prop must reach `describeState`, and a **second scan** fails by file when a part with a `disabled` prop calls neither `describeState` nor `stateWords` |
| `runtime/inert-announcement.runtime.test.tsx` | **new** — the real `getA11yTree()` matrix: each part enabled (`description` absent or the caller's) and inert (`unavailable` / `read only`), read from the node by role and name |

### 3.4 Documentation

Rule to apply on every page: the runtime still has no `aria-disabled` /
`aria-readonly`, **and the state is announced in the description** — say both.
Suggested sentence: "There is no `aria-disabled`; a disabled control leaves the
tab order and announces `unavailable` in its description, the channel the
runtime does publish."

| File | Lines (`rg -n "aria-disabled|aria-readonly"`) |
| ---- | ------------------------------------------- |
| `docs/button.mdx` | 152, 197 |
| `docs/icon-button.mdx` | 106 |
| `docs/checkbox.mdx` | 113, 143, 145 |
| `docs/checkbox-group.mdx` | 94, 136, 141 |
| `docs/radio-group.mdx` | 70, 154 |
| `docs/switch.mdx` | 81, 111, 113 |
| `docs/toggle.mdx` | 40, 123, 162 |
| `docs/toggle-group.mdx` | 149, 184, 247 |
| `docs/select.mdx` | 120, 314 |
| `docs/slider.mdx` | 68, 132 |
| `docs/range-slider.mdx` | 61, 132 |
| `docs/rating.mdx` | 132 |
| `docs/gpuix-capabilities.md` | 141's workaround already points at `aria-description`; add the sentence that primitives use it for `disabled`/`readOnly` |

`packages/primitives/README.md` line 270 ("**78 test files**") → `79`.
`COMPONENTS.md`: the Tier 1 preamble gains the rule, the current-run passage
says 79 runtime files, and the rows that spell out "the missing `aria-readonly`
is stated" / "No `aria-disabled`" get a short `**Inert announcement (810):**`
clause (Buttons, Checkboxes, Radio groups, Selects, Switches, Rating, Slider /
Range slider, Toggle, Toggle Group, IconButton). Historical "N tests at plan …"
sentences stay untouched.

### 3.5 The limitation to record

The word is fixed English, like `Loading`, `Spinner`'s `"Loading"` and
`Label`'s `required`. A consumer can add their own words in `aria-description`
(they compose after), but cannot rename these three. Recorded on the capability
page's ARIA row and in `COMPONENTS.md`'s rule paragraph; a `ThemeProvider`-level
word table is a separate, larger API decision.

## 4. Commands and expected results

Run from the worktree root. Every command is scoped to what this plan touches.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test` | offline suite green; **75 files** (no new offline file), the new unit + element cases pass |
| 2 | `nub run --filter @gpuixui/primitives test:runtime -- inert-announcement` | the new file green; every inert case reports its word |
| 3 | `nub run --filter @gpuixui/primitives test:runtime -- description` (and `-- name`) | the neighbouring a11y suites still green |
| 4 | `nub run --filter @gpuixui/primitives test:runtime` | **79 files**, 0 failed (the end-of-task check for a cross-cutting change) |
| 5 | `nub run check` (root) | green — `docs-counts`, `runtime-hygiene`, `tsdoc`, `contract`, `exports` all accept the new file and the counts |
| 6 | `nub run lint` (root) | green |
| 7 | `nub run test` (root) | green |

`nub run test:runtime` is the full runtime suite. This change is cross-cutting
(every control's description), so it is the end-of-task check; the **live merge
gate** is not required for this branch unit.

## 5. Test plan, and how each test can fail

### 5.1 The rule (offline, pure)

`stateWords`/`describeState` cases in `description.test.tsx`:

1. no state → `""`, and `describeState("Net of refunds.", {})` is the description;
2. `disabled` → `"unavailable"`;
3. `readOnly` → `"read only"`;
4. `disabled` + `readOnly` → `"unavailable"` (disabled wins);
5. `loading` + `disabled` → `"Loading. unavailable"`;
6. a description composes after (`"unavailable. Net of refunds."`), and a blank
   one adds nothing (`"unavailable"`).

**Failure direction:** deleting the `disabled` branch makes 2, 4, 5 and 6 fail.

### 5.2 The wiring (offline, element tree)

For each of the 13 parts: render enabled and inert through its `render*` function
with `testTheme`, and assert the host element's `aria-description` is absent (or
the caller's) when enabled and starts with the word when inert. A row asserts the
**node**, not the helper, so a component that forgets to call it fails by name.

**Failure direction:** reverting `Checkbox`'s call to
`joinDescription(props.description, props["aria-description"])` fails the
`Checkbox` row (and `checkbox · disabled` only, so the matrix is not a tautology).

### 5.3 The announcement (runtime, the real claim)

`runtime/inert-announcement.runtime.test.tsx` — one window per case, the node
found by `a11yNode(dump, { role, label })`, reading `node.aria?.description`:

| Part | role / label | enabled | disabled | read-only |
| ---- | ------------ | ------- | -------- | --------- |
| Button | `Button` / `Save` | absent | `unavailable` | — |
| Button + description | `Button` / `Save` | `Net of refunds.` | `unavailable. Net of refunds.` | — |
| IconButton | `Button` / `Close` | absent | `unavailable` | — |
| Toggle | `Button` / `Bold` | absent | `unavailable` | `read only` |
| Checkbox | `CheckBox` / `Accept` | absent | `unavailable` | `read only` |
| Switch | `Switch` / `Pause` | absent | `unavailable` | `read only` |
| Input | `TextInput` / `Name` | absent | `unavailable` | `read only` |
| TextArea | `MultilineTextInput` / `Notes` | absent | `unavailable` | `read only` |
| NumberField | `TextInput` / `Quantity` | absent | `unavailable` | `read only` |
| Select | `ComboBox` / `Fruit` | absent | `unavailable` | `read only` |
| Slider | `Slider` / `Volume` | absent | `unavailable` | `read only` |
| RangeSlider | `Slider` / `Band minimum` | absent | `unavailable` | `read only` |
| Rating | `RadioButton` / `3 of 5` | absent | `unavailable` | `read only` |
| CheckboxGroup | `CheckBox` / `Alpha` | absent | `unavailable` | `read only` |
| RadioGroup | `RadioButton` / `Alpha` | absent | `unavailable` | `read only` |
| ToggleGroup | `Button` / `Alpha` | absent | `unavailable` | `read only` |
| OTPField | `Group` / `Verification code` | absent | `unavailable` | `read only` |

Plus one composed case: `<Tooltip content="Net of refunds."><Button disabled>"` →
`"unavailable. Net of refunds."` (the slot and the state compose, plan `586`).

**Failure directions (all three must be observed and recorded in §7):**

1. remove the `disabled` branch from `stateWords` → every `disabled` cell fails;
2. remove one control's `describeState` call (`Checkbox`) → exactly its cells
   fail, by part name;
3. remove the `readOnly` branch → every `read only` cell fails.

### 5.4 The guards

- `src/description.test.tsx`'s source scan fails by file when a surface that
  declares `aria-description` bypasses `describeState`.
- `src/docs-counts.test.ts` fails when the README/`COMPONENTS.md` file counts
  drift (`78 → 79`).
- `src/runtime-hygiene.test.ts` requires the new runtime file's header comment.
- `theme-matrix` and `name` (runtime) prove no role/name/paint regressed.

## 6. STOP conditions

Stop and record rather than improvise if:

- a disabled control's node turns out to **drop its description** (then the
  runtime cannot carry the word; the plan becomes documentation plus a
  `TODO.md` limitation, and no component code ships);
- the description channel turns out to be **shared** with the name in the dump
  (a label would move) — re-measure before wiring more than one part;
- any **enabled** control's announced description changes in the runtime matrix
  (a regression in `joinDescription`'s composition), or a `name`/`theme-matrix`
  case fails for a reason other than the new description;
- a part's node cannot be found by role + label as §5.3 expects (record the
  role the runtime really publishes and correct the table — do not weaken the
  assertion to "any node").

## 7. Outcome

Implemented as planned.

**The helper.** `AnnouncedState`, `stateWords` and `describeState` live in
`components/internal.ts` beside `joinDescription`; the words are `Loading`,
`unavailable` and `read only`, with `disabled` beating `readOnly` and the
caller's description composed after. `Button`'s hand-rolled `Loading` expression
was replaced by the helper, so the busy half is unchanged
(`"Loading. Net of refunds."`).

**Wired (13 parts, plus `IconButton` through `Button`).** `Button`, `Toggle`,
`Checkbox`, `Switch`, `Input`/`TextArea` (`fieldHostProps`), `NumberField`,
`Select`'s trigger, `Slider`'s track, both `RangeSlider` thumbs, every `Rating`
star, `CheckboxGroup`'s rows (parent included), `RadioGroup`'s options,
`ToggleGroup`'s items, and the `OTPField` group. `Rating` stars, `RangeSlider`
thumbs, `ToggleGroup` items and the `OTPField` group had no `aria-description`
before; they do now. `RangeSlider`, `Rating`, `ToggleGroup` and `OTPField` have
no caller description prop, so they call `stateWords` directly.

**Measured after** (release-tag build, `runtime/inert-announcement`, 50 cases):

| Case | Node | Description |
| ---- | ---- | ----------- |
| `Button` working | `Button/Save` | absent |
| `Button` disabled | `Button/Save` | `unavailable` |
| `Button` disabled + description | `Button/Save` | `unavailable. Net of refunds.` |
| `Button` loading + description | `Button/Save` | `Loading. Net of refunds.` |
| `Button` disabled + loading | `Button/Save` | `Loading. unavailable` |
| `Button` disabled inside a `Tooltip` | `Button/Save` | `unavailable. Net of refunds.` |
| `Toggle` / `Checkbox` / `Switch` read-only | `Button` / `CheckBox` / `Switch` | `read only` |
| `Input` / `TextArea` / `NumberField` disabled | `TextInput` / `MultilineTextInput` / `TextInput` | `unavailable` |
| `Select` disabled | `ComboBox/Fruit` | `unavailable` |
| `Slider` disabled | `Slider/Volume` | `unavailable` |
| `RangeSlider` disabled | `Slider/Band minimum` and `… maximum` | `unavailable` |
| `Rating` disabled | `RadioButton/3 of 5` | `unavailable` |
| `CheckboxGroup` / `RadioGroup` / `ToggleGroup` rows | per row | `unavailable` / `read only` |
| one disabled `CheckboxGroup` option | `CheckBox/Beta` | `unavailable`, while `CheckBox/Alpha` stays absent |
| `OTPField` disabled | `Group/Verification code` | `unavailable` |

**Both directions measured** (each restored before the next):

1. the `disabled` branch removed from `stateWords` → **20 of 50** runtime cases
   failed (all 16 disabled rows + the composed, tooltip, busy and
   disabled-option cases), by name;
2. `Checkbox` reverted to `joinDescription(...)` alone → exactly
   `Checkbox disabled` and `Checkbox read-only` failed in the runtime file, and
   the two `Checkbox` element rows plus the wiring guard failed offline;
3. the `readOnly` branch removed → exactly the **14** read-only runtime rows
   failed.

**Docs.** The 27 `aria-disabled`/`aria-readonly` lines across 11 pages now state
the description word beside the missing attribute, the capability page names the
channel the library uses (and records that the action list is unchanged), the
README says **79** runtime files and `COMPONENTS.md`'s current-run passage
matches, with the rule in the Tier 1 preamble.

**Counts.** Offline **75 files / 1110 tests** (the new cases live in the existing
`description.test.tsx`: 33 → 68); runtime **79 files / 1081 tests**, 0 failed on
the cross-cutting full run; `check`, `lint` and `test` green.

**Limitation recorded:** the three words are fixed English (the same contract as
`Loading` and `required`); a consumer can append their own description but cannot
rename them. A `ThemeProvider`-level word table is a separate API decision.

## 8. Acceptance

- every inert control's accessibility node carries the documented word, proven
  in the real runtime for all 13 parts in both inert states;
- an enabled control's node is unchanged, and a caller's description still
  composes with one sentence boundary;
- the busy `Button` still announces `Loading` and now also `unavailable` when it
  is disabled as well;
- the 27 stale documentation lines are corrected, and no page claims the state is
  unannounced;
- `nub run check`, `nub run lint` and `nub run test` pass, the runtime suite is
  79 files green, and the README/inventory counts match;
- the fixed-English limitation is stated on the capability page and in
  `COMPONENTS.md`.
