# 812 — A failed validation is painted but never announced

**Status:** done
**Phase:** F (integration and polish)
**Depends on:** `026`, `203`, `351`, `583`, `586`, `786`, `799`, `802`, `804`, `810`
**Owner:** primitives

## 0. The bug

Every value-bearing Tier 1 control takes `invalid` and paints the theme's
`destructive` boundary when validation fails (plan `351`'s 13-control matrix).
None of them tells assistive technology. GPUix 0.10.0 publishes **no
`aria-invalid`** (`docs/gpuix-capabilities.md` §4), and the package's one channel
for a state the runtime cannot express — `aria-description`, through
`stateWords`/`describeState` (plan `810`) — carries only `Loading`,
`unavailable` (disabled) and `read only` (read-only).

Measured before the fix, on the release-tag build, a fresh window each:

| part | node | `description` with `invalid` |
| ---- | ---- | ---------------------------- |
| `Input` | `TextInput:Name` | `undefined` |
| `Select` | `ComboBox:Fruit` | `undefined` |
| `CheckboxGroup` | `CheckBox:Alpha` | `undefined` |
| `RadioGroup` | `RadioButton:Alpha` | `undefined` |
| `OTPField` | `Group:Verification code` | `undefined` |

A screen-reader user is told nothing a sighted user is told by red chrome. Three
pages currently document the gap as a limitation (`docs/input.mdx` §Limitations,
`docs/label.mdx` §Limitations, `docs/rating.mdx` §Limitations) — those sentences
are the false claims this plan removes.

## 1. The rule

`invalid` joins `AnnouncedState` and `stateWords` as a third, independent state
word. It composes rather than competes:

- `loading` leads (it is an activity);
- `disabled` wins over `readOnly` (the existing rule, unchanged);
- `invalid` follows, because a form disabled during save can still hold a
  failed validation, and an invalid read-only field is exactly the review state
  plans `786`–`804` introduced.

So `stateWords({ loading: true, disabled: true, invalid: true })` is
`"Loading. unavailable. invalid"`, and a caller's description or slot tip still
composes after it through `describeState` (`invalid. <description>`). `invalid`
is announced **only when it is true**; a valid control's description is
byte-identical to today's.

The word is the fixed English `invalid` — the vocabulary a screen reader already
uses for a failed field (`aria-invalid` maps to "invalid entry" in AccessKit
consumers). It is not localised by this package, exactly like `Loading`,
`unavailable`, `read only` and a required marker's `required` (plan `581`).

## 2. Files to change

### 2.1 `packages/primitives/src/components/internal.ts`

1. `AnnouncedState` (around line 274): add
   `readonly invalid?: boolean;` after `loading`, with a TSDoc line saying it is
   a failed validation.
2. `stateWords` (around line 287): append
   `state.invalid === true ? Option.some("invalid") : Option.none()` to the
   `Arr.getSomes` list, after the inert branch and before `Arr.join`.
3. Update the `stateWords` and `describeState` JSDoc: name all four states and
   the composition order.
4. Update `AnnouncedState`'s own TSDoc: it currently names only
   `aria-disabled`/`aria-readonly`; add `aria-invalid` (0.10.0 has none).

### 2.2 The four call sites that hand-build their state object

These pass a literal, so `invalid` must be added explicitly:

| file | line (approx.) | change |
| ---- | -------------- | ------ |
| `src/components/Select.tsx` | 663 | `describeState(description, { disabled, readOnly, invalid })` |
| `src/components/OTPField.tsx` | 197 | `stateWords({ disabled, readOnly: props.readOnly, invalid: props.invalid })` |
| `src/components/CheckboxGroup.tsx` | 239 | `describeState(description, { disabled, readOnly, invalid })` |
| `src/components/RadioGroup.tsx` | 322 | `describeState(option.description, { disabled, readOnly: props.readOnly, invalid: props.invalid === true })` |

The remaining parts already pass their whole props object to
`describeState`/`stateWords` and need no wiring:
`Input`/`TextArea` (shared `fieldHostProps`), `Checkbox`, `Switch`,
`NumberField`, `Rating`, `Slider`, `RangeSlider`.

**`Label` is deliberately excluded.** It is a visible caption, not an
interactive control: it has no role and no name derived from a control, and the
field it sits beside is the node that announces the state. Its `invalid` stays
paint-only, and the page says so.

### 2.3 Docs — state what is announced

Every page whose `invalid` row exists:

| file | change |
| ---- | ------ |
| `packages/primitives/docs/input.mdx` | replace the "not an announced error" bullet: the field now announces `invalid` in its description (plan `810`'s channel) and still needs a visible error `Text` |
| `packages/primitives/docs/textarea.mdx` | add one bullet to its limitations: `invalid` is announced as `invalid` in the description |
| `packages/primitives/docs/number-field.mdx` | same |
| `packages/primitives/docs/otp-field.mdx` | same, naming the group node that carries it |
| `packages/primitives/docs/select.mdx` | same, on the trigger |
| `packages/primitives/docs/checkbox.mdx` | same |
| `packages/primitives/docs/checkbox-group.mdx` | same, each row |
| `packages/primitives/docs/radio-group.mdx` | same, each option row |
| `packages/primitives/docs/switch.mdx` | same |
| `packages/primitives/docs/rating.mdx` | replace the "Validation is paint only" limitation |
| `packages/primitives/docs/slider.mdx` | same, on the track and thumb nodes |
| `packages/primitives/docs/range-slider.mdx` | same |
| `packages/primitives/docs/label.mdx` | replace "it is not announced by itself": the label's own paint is not a node's state; the control announces `invalid` |
| `docs/gpuix-capabilities.md` | the `aria-*` row (§3) and §4 accessibility paragraph: `invalid` joins the `unavailable`/`read only` workaround list |

Sentence to use, adapted per part: *"`invalid` also announces `invalid` in the
control's description, the channel the missing `aria-invalid` is filled with
(plan `812`); a visible error message is still the caller's."*

### 2.4 `COMPONENTS.md`

Extend the Tier 1 "Inert states are announced (plan `810`)" paragraph into
"States are announced", naming `invalid` beside `unavailable`/`read only`, and
note in the `Label` row that the caption is paint-only because the control owns
the announcement.

## 3. Test plan

### 3.1 The rule (offline, `src/components/description.test.tsx`)

Extend the "state words" `describe` block:

- `stateWords({ invalid: true })` is `"invalid"`;
- `stateWords({})` stays `""` (the existing case);
- `stateWords({ disabled: true, invalid: true })` is `"unavailable. invalid"`;
- `stateWords({ disabled: true, loading: true, invalid: true })` is
  `"Loading. unavailable. invalid"`;
- `describeState(DESCRIPTION, { invalid: true })` is `"invalid. <description>"`.

Add a wiring guard beside the two source-scan cases already there:

- scan `src/components/*.tsx` for `readonly invalid?: boolean;` and assert the
  result is exactly the known twelve files plus `Label.tsx`. This is a
  maintenance tripwire: a new invalid-bearing part must come here and join the
  runtime matrix below, and a part silently dropping its prop is reported by
  name. It must fail when `TextArea` (which inherits the prop through
  `FieldProps`) is added without thought — the test reports the file.

### 3.2 The native proof (`runtime/invalid-announcement.runtime.test.tsx`, new)

A table-driven file modelled on `runtime/inert-announcement.runtime.test.tsx`:
one window per case, read the painted accessibility tree with
`a11yNode(runtime.a11y(), { role, label })`.

Twelve parts — `Input`, `TextArea`, `NumberField`, `Select`, `OTPField`,
`Checkbox`, `Switch`, `CheckboxGroup`, `RadioGroup`, `Rating`, `Slider`,
`RangeSlider`. For each:

1. `invalid` → the node's `aria.description` is `"invalid"`;
2. valid → the description is `undefined` (the twin).

Then four composition cases:

- `Input invalid aria-description="Net of refunds."` → `"invalid. Net of
  refunds."`;
- `Checkbox invalid disabled` → `"unavailable. invalid"`;
- a `Slider`'s track and its thumb both report `"invalid"`;
- `Label invalid` publishes no `invalid` description (paint-only, the
  deliberate exception).

The header comment states the bug and the measured before/after.

### 3.3 The docs guard (`src/docs-invalid-announcement.test.ts`, new)

Two cases, both able to fail:

1. no primitives page may contain the three withdrawn claims — `"not an
   announced error"`, `"is not announced by itself"`, `"Validation is paint
   only"` — nor `"invalid"` followed by `"not announced"` on the same line;
2. `docs/gpuix-capabilities.md`'s `aria-*` row must name `invalid` in its
   workaround column.

### 3.4 Both directions

The runtime file is written **first** and run against the unfixed code: twelve
"invalid" cases and three composition cases fail with `undefined`, the valid
twins pass. After the fix all pass. The source guard fails when `TextArea`'s
wiring is removed from `fieldHostProps` (shared), and the unit cases fail with
the `invalid` branch deleted from `stateWords`.

## 4. Commands and expected results

Run from `packages/primitives` unless stated. `nub` v0.9.6; the filter goes
straight after the script, never after an extra `--` (plan `700`).

```sh
# 1. The new native file fails before the fix (twelve cases + three compositions)
nub run test:runtime runtime/invalid-announcement.runtime.test.tsx

# 2. After implementing: the same file is green
nub run test:runtime runtime/invalid-announcement.runtime.test.tsx
#    expected: one file, 28 passed (24 rows + 4 composition cases)

# 3. The rule and the guards
nub run test src/components/description.test.tsx
nub run test src/docs-invalid-announcement.test.ts
#    expected: green; each new case is listed

# 4. The paint matrix still passes (nothing repainted)
nub run test:runtime runtime/invalid.runtime.test.tsx

# 5. The announcement neighbours (shared rule)
nub run test:runtime runtime/inert-announcement.runtime.test.tsx runtime/description.runtime.test.tsx

# 6. Types and the whole offline suite
nub run check-types
nub run test

# 7. End-of-task: the package's whole runtime suite (this is a cross-cutting
#    change across twelve parts; the full live suite is the merge gate)
nub run test:runtime
```

Expected totals are recorded in `TODO.md` and the plan index when the task
lands; the exact numbers come from the runs, never guessed.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any of the twelve parts cannot produce a named accessibility node at all
  (then the announcement has nowhere to go and the part needs its own plan);
- `nub run test:runtime` shows a failure outside the files named above and it is
  not the known flake class (the fixture closes every window, so order flake
  should not exist);
- a fix would require editing a path outside `packages/primitives`,
  `packages/icons`, `docs/gpuix-capabilities.md`, `COMPONENTS.md`, `TODO.md`,
  `.agents/slop/plans/` — record it in `TODO.md` instead;
- a docs page contradicts the runtime in a way this plan did not anticipate:
  correct the page, and if the contradiction is a second bug, write it as its
  own TODO row rather than widening this change.

## 6. Acceptance

- `invalid` is a state word in `internal.ts`, wired on all twelve controls.
- The new runtime matrix proves the announcement on the painted tree, and its
  valid twin proves no false announcement.
- `Label` stays paint-only and every page (including `Label`'s) says which node
  announces.
- The three false limitation claims are gone and guarded.
- `check-types`, the offline suite and the scoped runtime files are green; the
  exact commands and counts are in `TODO.md`.
- `COMPONENTS.md` records the behaviour; the plan index row says done.

## 7. Out of scope

- A visible error-message part. The caller owns the message; `Field` in
  `@gpuixui/components` already renders one.
- `aria-invalid` itself — the runtime does not publish it.
- Localisation of state words (no i18n layer in this package).
