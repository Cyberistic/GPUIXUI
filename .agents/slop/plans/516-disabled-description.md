# 516 — A disabled control says so: `aria-description` for every disabled part

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening, accessibility) |
| Owner | components workstream |
| Depends on | `110`, `111`, `112`, `113`, `114`, `115`, `116`, `391`, `392`, `394` |
| Status | done — `internal/state-description.ts` joins the caller's text, any component message and `Disabled`; 16 control families announce it in the real accessibility tree. 6 pure + 12 native cases (unit 404, behaviour 668); mutation proof: removing the helper from Button, FieldInput and ComboboxTrigger fails 4 cases. Docs, `COMPONENTS.md`, `TODO.md` and the plan index synced |
| Number | `516` — `515` is the last claimed number in this block; `512` is `tokens-theme`'s |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. The defect (measured 2026-10-18, this host, `0.10.0`)

GPUix 0.10.0 has no `aria-disabled` (verified in `HostProps`). Every disabled
part therefore dims, leaves the tab order and drops its handlers — a sighted
user sees a disabled control, but the accessibility tree still reports an
ordinary control that does nothing:

```
<div role="button" aria-label="Save" tabIndex={-1} style={{ opacity: 0.5 }}>
  → a11y node { role: "Button", label: "Save" }        // no disabled state
```

`aria-description` **is** supported, and it reaches the dump:

```
<div role="button" aria-label="Save" aria-description="disabled" />
  → a11y node { role: "Button", label: "Save", description: "disabled" }
```

(measured with the throwaway probe this plan replaces; an `<input>` behaves the
same and reports `role: "TextInput"`). Avatar (plan 392) and Field (validation
messages) already use this channel, so the pattern is established.

Today only a handful of parts carry any description, and none says the control
is disabled. `internal/button.tsx` records the gap explicitly: "assistive
technology sees a button that does nothing".

## 2. The rule

> A part whose own state makes it inert appends **`Disabled`** to its accessible
> description. The caller's `aria-description` and the component's own message
> (validation, required, status) are kept, joined with `". "`. An enabled part
> adds nothing unless it already had a description.

This is a description, not `aria-disabled`: the state is announced honestly, and
the docs continue to say the runtime has no `aria-disabled` semantics. It does
not claim the control is programmatically disabled, only that it is unavailable.

## 3. Design

### 3.1 One helper

New `packages/components/src/internal/state-description.ts`:

```ts
/**
 * The accessible description a part adds for its own state.
 *
 * 0.10.0 has no `aria-disabled`, so a part that drops its handlers and dims is
 * otherwise announced as an ordinary control. `aria-description` is supported,
 * so a disabled part appends "Disabled" to whatever description the caller or
 * the component already supplies (plan 516).
 */
export const stateDescription = (
  disabled: boolean,
  ...authored: ReadonlyArray<string | undefined>
): { readonly "aria-description"?: string } =>
  pipe(
    authored,
    Arr.filterMap((value) =>
      pipe(
        Option.fromNullishOr(value),
        Option.map(Str.trim),
        Option.filter(Str.isNonEmpty),
      ),
    ),
    Arr.appendAll(disabled ? ["Disabled"] : []),
    Arr.dedupe,
    Arr.match({
      onEmpty: () => ({}),
      onNonEmpty: (parts) => ({ "aria-description": Arr.join(parts, ". ") }),
    }),
  );
```

A spread object, not an `Option`, keeps each call site one line and preserves
"the caller's value wins" without a second branch:

```tsx
<div {...rest} {...stateDescription(disabled, rest["aria-description"])} />
```

Because it is applied **after** `{...rest}`, it replaces the caller's raw string
with the joined one; when the part is enabled the result is `{}`, so `{...rest}`
keeps the caller's description untouched.

### 3.2 Parts to change

Every part that owns a `disabled` prop and exposes a role or a native input:

| File | Part(s) | Where |
| ---- | ------- | ----- |
| `src/internal/button.tsx` | `Button`, `IconButton` | after `{...rest}` |
| `src/accordion.tsx` | `AccordionTrigger` | after `aria-label` |
| `src/collapsible.tsx` | `CollapsibleTrigger` | after `aria-label` |
| `src/tabs.tsx` | `TabsTrigger` | after `aria-label` |
| `src/list.tsx` | `ListItem` | after `role`/`aria-selected` |
| `src/menu/item.tsx` | `MenuItem` (covers checkbox and radio rows) | after `aria-label` |
| `src/combobox.tsx` | `ComboboxTrigger`, `ComboboxItem` | after `aria-expanded` / `aria-selected` |
| `src/field.tsx` | `FieldInput` | replace the `description` spread with `stateDescription(isDisabled, description)` |
| `src/fieldset.tsx` | `Fieldset` group | after `aria-label` |
| `src/search-input.tsx` | the `<input>` | after `aria-label` |
| `src/mention-input.tsx` | the `<input>` | after `aria-label` |
| `src/tag-input.tsx` | `TagInput` group and `TagInputField` input | after `aria-label` |
| `src/time-picker.tsx` | `TimePicker` group and `TimePickerSegment` input | group + `props` |
| `src/color-picker.tsx` | group, each swatch, the hex `<input>` | merge with "Invalid hex colour" |
| `src/hotkey-recorder.tsx` | the recorder button | after `aria-label` |
| `src/inline-edit.tsx` | the display button and the editing `<input>` | after `aria-label` |

Parts that delegate to `Button` need no edit: `PopoverTrigger` (and so
`DatePickerTrigger`), `DialogTrigger`/`DialogClose`, `DrawerTrigger`/`DrawerClose`,
Pagination's Previous/Next, Carousel's controls, the Alert/Toast dismiss
controls and every menu/navigation trigger built on it.

`ContextMenuTrigger` is deliberately **out**: it is a focusable region with no
role in 0.10.0, so a description has nothing to attach to. Its missing role is a
separate limitation, not part of this plan.

### 3.3 Test helper

`src/internal/a11y.ts` gains the description the dump already carries:

```ts
readonly description: Option.Option<string>;
// …
description: Option.fromNullishOr(node.aria?.description),
```

and one lookup:

```ts
/** The node whose accessible name is exactly `name`, if the dump has one. */
export const nodesNamed = (
  renderer: TestRenderer,
  name: string,
): ReadonlyArray<A11yNode> =>
  Arr.filter(a11yNodes(renderer), (node) => node.name === name);
```

## 4. Test plan

### 4.1 Pure: `src/internal/state-description.test.ts`

The helper must be provable without a renderer. Cases:

1. enabled, no authored description → `{}` (not an empty string);
2. disabled, no authored description → `"Disabled"`;
3. enabled with an authored description → that description unchanged;
4. disabled with an authored description → `"Opens settings. Disabled"`;
5. whitespace/empty authored descriptions are skipped;
6. several authored parts join in order, and an explicit `"Disabled"` is not
   repeated.

### 4.2 Native: `src/behaviour/disabled-description.test.tsx` (new)

Header comment names the measured gap: no `aria-disabled`, so a disabled
control used to be announced as an ordinary one. The suite reads the real
accessibility dump; `nodesWithRole`/`nodesNamed` and `description` are the
assertions. One case per control family, each asserting both directions where
the component has an enabled sibling:

1. `Button` and `IconButton`: disabled → `Disabled`; enabled → no description;
   a caller description is kept (`"Opens settings. Disabled"`).
2. `TabsTrigger` inside `Tabs`: the disabled tab says `Disabled`, the enabled
   tab says nothing.
3. `AccordionTrigger` inside `Accordion` (disabled item).
4. `CollapsibleTrigger` disabled.
5. `ListItem` (`selectionMode="single"`) disabled.
6. `DropdownMenu` item disabled (open menu; read `menuitem`).
7. `SearchInput` disabled (`TextInput`).
8. `FieldInput` disabled inside a `Field` with an error → the message survives
   and `Disabled` is appended.
9. `TimePicker` disabled: both segments (`TextInput`, named "Time hours" /
   "Time minutes") carry it.
10. `TagInput` disabled: the field carries it and the group still has its name.
11. `ColorPicker` disabled: the hex input says `Disabled`, and an invalid draft
    plus disabled reads `"Invalid hex colour. Disabled"`.
12. `ComboboxTrigger` disabled and a disabled `ComboboxItem` (open popup).
13. `Fieldset` disabled: the group says `Disabled`, and its `FieldInput` inherits
    it through the context.
14. `HotkeyRecorder` and `InlineEdit` disabled displays.
15. `MentionInput` disabled.

Every case has an enabled counterpart or a second assertion so it can fail:
removing `stateDescription` from a part must remove that assertion. Record the
mutation proof: drop the `aria-description` line from `internal/button.tsx` and
observe case 1 fail; drop it from `FieldInput` and observe case 8 fail; drop it
from `ComboboxTrigger` and observe case 12 fail.

## 5. Commands and expected results

```sh
cd packages/components
nub run test src/internal/state-description.test.ts        # 6 passed
nub run test:behaviour src/behaviour/disabled-description.test.tsx
```

Expected: the new behaviour suite passes, and the existing 656 native tests are
unchanged (no test asserted the absence of a description). Then, from the repo
root:

```sh
nub run check       # exit 0
nub run lint        # exit 0
nub run test        # exit 0
nub run --filter @gpuixui/components test:behaviour   # 656 + new cases
```

`scripts/verify-two-directions.sh` is unavailable (`jj` is not installed — D1);
record the manual mutation proof above instead.

## 6. Docs and records

- `docs/component-api.md`: add one line to the accessibility subsection: a part
  with a `disabled` state appends `Disabled` to its `aria-description`, because
  0.10.0 has no `aria-disabled`; the caller's description is kept.
- Affected `packages/components/docs/*.mdx` pages: where a page says "no
  `aria-disabled`", add that disabled parts announce `Disabled` through
  `aria-description` (color-picker, fieldset, hotkey-recorder, inline-edit,
  tag-input, time-picker, date-picker, form/field if it mentions it).
- `COMPONENTS.md`: the Tier 2 rows for the changed families gain a short
  "disabled announces `Disabled`" clause; the Fieldset row's "group state is not
  announced" claim is corrected.
- `TODO.md`: add and tick a Tier 2 hardening item.
- `.agents/slop/plans/README.md`: index plan 516.
- Delete the superseded `.agents/slop/plans/514-preview-card-nested-dismiss.md`
  draft: it was the combined plan split into 514 (trigger claim) and 515 (focus
  guard) and is neither indexed nor current. Its two probes are reproduced in
  514/515; add a one-line note to 515.

## 7. STOP conditions

- If `aria-description` does **not** appear on the accessibility node for any
  control family (measured for `div[role=button]` and `<input>`), stop and
  report which family: do not substitute a fake field or claim the state is
  announced.
- If a caller's `aria-description` is overwritten on an **enabled** part, stop:
  `stateDescription` must be a no-op there.
- If any existing behaviour case changes because a node now has a description,
  stop and report which; the change is additive by design.
- If a component cannot know it is disabled (a part that does not read its own
  or the group's `disabled`), do not guess from style; leave it out and record
  the limitation.

## 8. Acceptance criteria

- One helper owns the join rule, with a pure test.
- Every part listed in §3.2 announces `Disabled` when its own `disabled` state
  is set; the caller's description and any component description survive.
- The new native suite passes, and the mutation proof fails without the helper
  call on at least Button, FieldInput and ComboboxTrigger.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index are in sync.
- `nub run check`, `nub run lint`, `nub run test` and the behaviour suite pass.
