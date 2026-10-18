# 386 — A control's chrome is selectable

| Field | Value |
| ----- | ----- |
| Phase | F (interaction truth) |
| Owner | primitives workstream |
| Depends on | `020`, `030`, `041`, `047`, `058`, `085`, `343`, `361`, `368`, `370`, `385` |
| Status | done |

Self-contained: §0 what is true before this plan and the measurement, §1 the
decision, §2 the rule, §3 the files, §4 the commands, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan

`Text` documents the split the library means: `selectable` is **off for chrome,
on for content**, and plan `385` proved a selectable run really can be dragged.
That is the whole story for `Text`.

Controls are not `Text`. `Button`, `Toggle`, `ToggleGroup`, and both
`Select` surfaces put a raw string (or a `<text>` from the runtime's own
`SelectItem`) inside their own chrome, and none of them declares `userSelect`.
The runtime's default is **selectable** — `Inherited::root` in
`references/gpuix/packages/native/src/renderer.rs` starts at
`selectable: true`, and only `userSelect: "none"` on an ancestor turns it off
(an explicit `userSelect: "text"` re-opts in). `Text` opts out for every role;
a control's label has no such rule.

Measured on this host against the installed binding (plan `385`'s harness, a
real `dragSelect` across the painted box):

| Surface | Painted `userSelect` | Drag selects |
| ------- | -------------------- | ------------ |
| `<Button>Save changes</Button>` | none declared | `"Save changes"` |
| `<Toggle>Grid view</Toggle>` | none declared | `"Grid view"` |
| `ToggleGroup` item `"Align left"` | none declared | `"Align left"` |
| `Select` trigger (`defaultValue="a"`, `"Apple"`) | **`"text"`** (field recipe) | `"Apple"` |
| `Select` option `"Banana"` | none declared | `"Banan"` |
| `CheckboxGroup` / `RadioGroup` row | `Text` inside opts out | nothing |
| `<Text selectable>` (content) | `"text"` | the whole run |

Two facts fall out:

1. **Chrome is selectable.** Pressing and dragging across a button, a toggle or
   a select — the surfaces a user aims at most — highlights and copies its
   label. It is the exact opposite of the rule `Text` states, and nothing tests
   it.
2. **The `Select` trigger is the one control with a text cursor.** It inherits
   `cursor: "text"` from `fieldRecipeStyle` (the field paint is written for a
   native `<input>`), so a select advertises editing and takes selection, while
   every other clickable surface in the package declares `cursor: "pointer"`.

This is one class with one owner: a control's chrome is not content. It is the
same class plan `385` closed for `Text` — a documented interaction with no test
— and plan `361` closed for pointer feedback.

## 1. The decision

**Chrome opts out of selection; content opts in.** Put `userSelect: "none"` on
the control's own root style, not on the label helper:

- inheritance is how the runtime implements it, so one property on the root
  covers a label, a leading icon, a trailing count and any nested `<text>` the
  runtime creates (`SelectItem`'s own children included);
- a caller who wants selectable content inside a control can still put a
  `Text selectable` there — an explicit `"text"` island overrides an ancestor
  (`references/gpuix/.../text/paint.rs`: "An explicit userSelect: text island
  registers true and can override an ancestor"). The boundary stays honest.

The `Select` trigger additionally stops borrowing the text field's **cursor**:
it is a button-shaped control, so it declares `pointer` (and `not-allowed` while
disabled, the same rule every other control follows; plan `361`).

The rule lives in the four resolvers that own those roots:

| Resolver | Covers |
| -------- | ------ |
| `core/recipes.ts` `buttonRecipeStyle` | `Button`, `IconButton` |
| `core/style.ts` `controlStyle` | `Toggle`, every `ToggleGroup` item |
| `Select.tsx` `selectTriggerStyle` | the `Select` trigger (value + placeholder + chevron) |
| `Select.tsx` `selectItemStyle` and `selectHeadingStyle` | the open list's options and group headings |

No public prop changes. A consumer keeps `style` (merged last) as the override,
and `Text.selectable` remains the way to make content selectable.

## 2. The rule

> A surface that is **chrome** — a control, its rows, its captions — declares
> `userSelect: "none"` on the element that owns the interaction. A surface that
> is **content** — `Text` with `selectable`, a native input, a document body —
> opts in. A control that takes a pointer declares a pointer cursor, and a
> disabled one `not-allowed`.

The trigger's cursor is the second half: it comes from the field paint, which
is written for a text host, and a select is not one.

## 3. Files to change

All paths under `packages/primitives/` unless stated.

| File | Change |
| ---- | ------ |
| `src/core/recipes.ts` | `buttonRecipeStyle`'s base adds `userSelect: "none"`. The disabled branch keeps it (a disabled control is still chrome). |
| `src/core/style.ts` | `controlStyle`'s base adds `userSelect: "none"` (the disabled branch inherits it). |
| `src/components/Select.tsx` | `selectTriggerStyle` adds `userSelect: "none"` and `cursor: state.disabled ? "not-allowed" : "pointer"` after the field recipe spread. `selectItemStyle` adds `userSelect: "none"`. `selectHeadingStyle` adds `userSelect: "none"`. |
| `src/core/style.test.ts` | One `controlStyle` case: `userSelect === "none"`, in both the resting and disabled states. |
| `src/core/recipes.test.ts` | One `buttonRecipeStyle` case: `userSelect === "none"` for a text button and for a `square` (icon) button. |
| `src/components/Select.test.tsx` | Trigger: `userSelect === "none"`, `cursor === "pointer"` while enabled and `"not-allowed"` while disabled. Item and heading: `userSelect === "none"`. |
| `runtime/chrome-selection.runtime.test.tsx` | New suite (header names the missing proof): a real drag across a `Button`, a `Toggle`, a `ToggleGroup` item, a `Select` trigger and an open `Select` option selects nothing; a selectable `Text` in the same window still selects; the trigger's painted style reports `userSelect: "none"` and a pointer cursor. |
| `docs/button.mdx`, `docs/toggle.mdx`, `docs/toggle-group.mdx`, `docs/select.mdx` | One measured sentence each: the control's label is chrome and not selectable; the select trigger also uses a pointer cursor. Select's page says options and group headings are chrome too. |
| `COMPONENTS.md` | Button, Toggle Group and Selects rows record plan `386` and the measurement. |
| `TODO.md` | The task added and ticked in the primitives section. |
| `.agents/slop/plans/README.md` | Index this plan after `385`. |

No example change: every impacted surface already mounts in an example (the
form, toggle-group, release-actions and select screens). The fix adds no new
visual shape; plan `385`'s selectable content run already demonstrates the
positive side of the boundary.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test
```

Expected: the existing offline suite plus the new cases, green. The count grows
by one file's cases (the four assertion additions live in existing files).

```sh
nub run check-types
```

Expected: no output.

```sh
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/chrome-selection.runtime.test.tsx
```

Expected: green against the installed binding.

```sh
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/text-selection.runtime.test.tsx runtime/fields.runtime.test.tsx
```

Expected: unchanged, green (the trigger's style is asserted there; the selection
suite is the content control).

From the repo root:

```sh
nub run check
nub run lint
nub run test
```

Expected: green.

## 5. Test plan and the two-direction proof

**Offline (element tree / pure resolvers):**

- `controlStyle` resting and disabled → `userSelect: "none"`.
- `buttonRecipeStyle` text and square → `userSelect: "none"`.
- `selectTriggerStyle` enabled → `userSelect: "none"`, `cursor: "pointer"`;
  disabled → `userSelect: "none"`, `cursor: "not-allowed"`; a caller's `style`
  still wins last.
- `selectItemStyle` and `selectHeadingStyle` → `userSelect: "none"`.

**Runtime (`runtime/chrome-selection.runtime.test.tsx`):**

1. Drag from just inside each painted box's left edge to just inside its right
   edge over: a `Button` label, a `Toggle` label, a `ToggleGroup` item, a
   `Select` trigger, and an open `Select` option (found by its painted `<text>`).
   Every `selection()` is `None`.
2. The same drag over a `Text selectable` in the same window selects the run —
   the positive control: content still behaves as plan `385` proved.
3. The select trigger's `TestElement.style` reports `userSelect: "none"` and
   `cursor: "pointer"`; the disabled trigger reports `not-allowed`.
4. A caller's `style={{ userSelect: "text" }}` on a `Button` still wins last
   (the documented merge rule), and the runtime then selects the label. This is
   the escape hatch, measured rather than assumed.

**Two-direction proof (record each in §7):**

- Drop `userSelect: "none"` from `controlStyle` → cases 1 (`Toggle`,
  `ToggleGroup`) fail by name; the Button case still passes because its own
  resolver owns it.
- Drop it from `buttonRecipeStyle` → the `Button` case fails.
- Drop it from `selectItemStyle` → the option case fails.
- Drop it and the cursor override from `selectTriggerStyle` → the trigger case
  fails on both the drag and the painted style.
- The positive `Text selectable` case must pass in every mutation, or the test
  is proving the window rather than the component.

## 6. STOP conditions

Stop and report, do not improvise, when:

- the drag selects nothing on **every** surface including `Text selectable` —
  that is a broken selection path on the binding, not this defect (plan `385`
  §6 applies);
- `userSelect: "none"` does not stop the selection on this host — record the
  binding revision and the measured result; the rule would then be documented
  as a runtime limitation, not fixed;
- a control's painted style stops reporting `userSelect`/`cursor` (the
  `TestElement.style` report changed) — record the observation and keep the
  offline assertions only;
- the runtime suite is failing for reasons unrelated to this file (the store's
  binding is main-derived; see `TODO.md`'s open live-suite row). Run the scoped
  files only and do not re-baseline unrelated assertions.

## 7. The outcome

Implemented and run on this host, 2026-10-18.

**The class was real, and wider than the trigger.** The probe in §0 measured
five surfaces, not one; every chrome surface with a raw label was selectable,
and the `Select` trigger additionally painted `cursor: "text"`.

| Change | File |
| ------ | ---- |
| `buttonRecipeStyle` base declares `userSelect: "none"` | `src/core/recipes.ts` |
| `controlStyle` base declares `userSelect: "none"` | `src/core/style.ts` |
| Trigger declares `userSelect: "none"` + `pointer`/`not-allowed` | `src/components/Select.tsx` |
| Option and group heading declare `userSelect: "none"` | `src/components/Select.tsx` |

| Step | Command | Result |
| ---- | ------- | ------ |
| new runtime suite | `nub exec vitest run --config vitest.runtime.config.ts runtime/chrome-selection.runtime.test.tsx` | **5 passed** |
| offline suite | `nub run test` | **46 files / 677 tests passed** (three cases added: `controlStyle`, `buttonRecipeStyle`, `Select`) |
| types | `nub run check-types` | clean |
| mutation: `controlStyle` drops `userSelect` | scoped runtime file | **1 failed / 4 passed** — `takes no text from a button, a toggle or a toggle-group item`; the Button case still passed because its own resolver owns it |
| mutation: `buttonRecipeStyle` drops `userSelect` | scoped runtime file | **1 failed / 4 passed** — the same case fails on its Button assertion |
| mutation: `selectItemStyle` drops `userSelect` | scoped runtime file | **1 failed / 4 passed** — `takes no text from an open list's option or group heading` |
| mutation: `selectHeadingStyle` drops `userSelect` | scoped runtime file | **1 failed / 4 passed** — same case, at the heading assertion |
| mutation: trigger drops both overrides | scoped runtime file | **1 failed / 4 passed** — `gives the select trigger a pointer cursor and no selection`, failing on the drag (the drag assertion runs first) |
| mutation: trigger keeps `userSelect` but not the cursor | scoped runtime file | **1 failed / 4 passed** — the same case, failing on `expected 'text' to be 'pointer'` |

The positive-control case (`Text selectable` and a caller's
`style={{ userSelect: "text" }}` on a Button) passed in **every** mutation run —
the fix is a default on chrome, not a cage on content. The three offline cases
assert the same fields the runtime proves; they were added after the mutation
runs and not separately mutated.

One documentation correction fell out of the probe: the `Select` page said the
trigger was "a text-entry surface" in its field-recipe note, which is true of
its *metrics* but not of its cursor or selection. The page now states the
chrome contract explicitly.

## 8. Acceptance

1. A drag across every chrome surface with a label selects nothing; a selectable
   `Text` still selects.
2. The `Select` trigger paints a pointer cursor (not-allowed while disabled) and
   declares `userSelect: "none"`; options and headings are chrome too.
3. Every mutation above fails the named case, and the positive control holds in
   every direction.
4. Docs, inventory and `TODO.md` state the measured contract.
5. Every gate in §4 is green.
