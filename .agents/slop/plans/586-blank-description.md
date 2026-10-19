# 586 — A blank `aria-description` is not a description

**Phase:** F (correctness / accessibility)
**Workstream:** primitives
**Depends on:** 026, 071, 341, 345, 396, 500, 573, 577
**Status:** planned

## 1. The bug, measured

`ariaName` (plan 026) made a blank **label** absent on every named surface, and
plan 500/573/577 applied the same rule to the descriptions a group row or a
tooltip publishes. The public `aria-description` prop that a slot trigger adds
(plans 341/345) was never brought under the rule: every control passed the raw
string to the host, so a computed blank translation became a real, whitespace
accessibility description, and a busy `Button` composed `"Loading. "` + padding.

Measured on this host (release-tag `@gpuix/native@0.10.0`, `TestRenderer`),
mounting nine surfaces with `aria-description="   "` (`TextArea` shares
`Input`'s helper, so it is the tenth):

```text
Button          label "Save changes"  description "   "
Button loading  label "Save changes"  description "Loading.    "
CheckBox        label "Accept"        description "   "
Button (Toggle) label "Grid view"     description "   "
Switch          label "Dark"          description "   "
Slider          label "Volume"        description "   "
TextInput       label "Name"          description "   "
ComboBox        label "Fruit"         description "   "
Region          label "Activity"      description "   "
```

A padded real description is published with its padding, unlike every name and
every group-row description (which `ariaName` trims). The probe is reproducible
with the retired `runtime/description-probe.runtime.test.tsx` described in §4.

**Why it matters.** A screen reader announces the empty description as content;
a tooltip-injected description and a caller-computed one are the same channel,
so a missing translation silently becomes `"   "` on a control that looks
unnamed-but-described. The package's own documented rule is the opposite
(`docs/tooltip.mdx` line 193: a blank tip must not publish
`aria-description: "   "`).

## 2. The rule

There is **one** blank-text rule, `ariaName`: trim a string that says
something; a string that trims to nothing is absent. It already serves names and
group-row descriptions; extend its documented intent to every
`aria-description` a control forwards:

- `undefined`, `""` and `"   "` → the host prop is `undefined` (no description
  node field);
- `"  Net of refunds.  "` → `"Net of refunds."`;
- a busy `Button` → `"Loading"` when there is no tip, `"Loading. <tip>"` when
  there is one, and the separator never appears with an empty tip.

No second helper and no new public API. The public prop stays
`aria-description?: string`; only its published value changes.

## 3. Exact files to change

1. `packages/primitives/src/components/internal.ts`
   - Extend `ariaName`'s JSDoc: it is the name **and** description rule.
   - No code change (it already trims and returns `Option.getOrUndefined`).
2. `packages/primitives/src/components/Button.tsx`
   - Import `ariaName`.
   - Replace the `Option.fromNullishOr`/`Option.match` description block with
     one `ariaName(props["aria-description"])` value and the busy composition
     from §2.
   - Render `aria-description={ariaName(description)}` (idempotent, and it keeps
     the source guard in §4 simple).
3. `packages/primitives/src/components/Toggle.tsx` — import `ariaName`;
   `aria-description={ariaName(props["aria-description"])}`.
4. `packages/primitives/src/components/Checkbox.tsx` — same on line 134.
5. `packages/primitives/src/components/Switch.tsx` — same on line 111.
6. `packages/primitives/src/components/Input.tsx` — in `fieldHostProps`,
   `"aria-description": ariaName(props["aria-description"])` (covers `TextArea`
   because it shares the helper).
7. `packages/primitives/src/components/NumberField.tsx` — same on line 211.
8. `packages/primitives/src/components/Select.tsx` — same on line 580 (the
   trigger; the list has no description).
9. `packages/primitives/src/components/Slider.tsx` — same on line 192.
10. `packages/primitives/src/components/ScrollArea.tsx` — import `ariaName`;
    same on line 137.

## 4. Tests

### 4.1 Element-tree matrix — `packages/primitives/src/components/description.test.tsx`

New file, modelled on `style-order.test.tsx`'s cross-part guard.

- `described(element)` walks the element tree (`elementChildren`) and collects
  every `aria-description` (`elementProp`) on any element.
- `SURFACES`: one entry per surface in §3 that takes the prop, built from the
  package's `render*` functions with the shared `testTheme` and the minimal
  fixtures the other suites already use:
  `renderButton`, `renderToggle`, `renderCheckbox`, `renderSwitch`,
  `renderInput`, `renderTextArea`, `renderNumberField`, `renderSelect`,
  `renderSlider`, `renderScrollArea`.
- `it.each(SURFACES)` **blank**: render with `"   "` and assert the collected
  descriptions are `[]`.
- `it.each(SURFACES)` **padded**: render with `"  Net of refunds.  "` and
  assert the collected descriptions are exactly `["Net of refunds."]`.
- `Button` busy cases:
  - `loading` + blank → `"Loading"`;
  - `loading` + `"  Net of refunds.  "` → `"Loading. Net of refunds."`;
  - not loading + blank → no description.
- Source guard: read every `src/components/*.tsx` (the `callback-names.test.ts`
  Effect/FileSystem pattern), skip declaration lines (`readonly`), and for every
  line that assigns `aria-description` require the same line to contain
  `ariaName(`. This fails by file and line on the old tree for all ten
  assignment sites.

### 4.2 Runtime matrix — `packages/primitives/runtime/description.runtime.test.tsx`

New file with the required header comment (plan 390's hygiene guard).

- Mount all nine surfaces with `aria-description="   "`; collect every node with
  a defined `aria.description` and assert `[]`.
- Mount them again with `"  Net of refunds.  "`; assert every node carries
  `"Net of refunds."` (names as measured in §1).
- One busy `Button` case: blank → `"Loading"`, padded → `"Loading. Net of
  refunds."`.
- Run scoped by path only (the full suite has the known release-artifact
  failures recorded in `TODO.md` and plan 529/583; do not re-baseline them).

### 4.3 Both directions

1. Before the fix the new offline matrix fails on every blank-row (non-empty
   collected list) and the source guard fails by file:line; the runtime file
   fails on all ten blank rows and on the busy `Button` (`"Loading.    "`).
2. After the fix everything passes.
3. Record the exact counts in this plan's §8 and in `TODO.md`.

## 5. Documentation and inventory

- The `aria-description` row on every affected page becomes
  `description announced after the name; trimmed; a blank value is absent
  (a Tooltip writes its text here)`:
  `docs/button.mdx`, `docs/toggle.mdx`, `docs/checkbox.mdx`, `docs/switch.mdx`
  (add a row if the table has none), `docs/input.mdx`, `docs/textarea.mdx`,
  `docs/number-field.mdx`, `docs/select.mdx`, `docs/slider.mdx`,
  `docs/scroll-area.mdx`.
- `docs/tooltip.mdx` §"Slot triggers": one sentence that a directly supplied
  blank `aria-description` is absent for the same reason a blank tip is.
- `COMPONENTS.md`: extend the "Blank labels (026)" paragraph to say the same
  rule now governs every forwarded `aria-description`, with the busy-button
  exception, and cite plan 586.

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/primitives check-types        # Done, no errors
nub run --filter @gpuixui/primitives test               # 54 files, 753 + new offline tests, all pass
nub run --filter @gpuixui/primitives test:runtime description.runtime.test.tsx
                                                        # scoped file green (a11y-only shapes)
nub run lint                                            # Done
```

`nub run check` (root) must stay green. Do not run the full `test:runtime` as a
pass/fail gate on this host.

## 7. STOP conditions

- A runtime assertion needs a native binding change or a geometry measurement:
  stop — this plan is a11y-prop-only and must not touch paint or placement.
- The source guard cannot be written without an allowlist: stop and report the
  file rather than weakening the rule to "contains the string `ariaName`" for
  lines that do not assign the prop.
- More than the ten surfaces in §3 declare `aria-description`: add them to §4.1
  before editing, do not ship a partial matrix.
- A docs edit would contradict a measured behaviour: correct the page, do not
  change behaviour to match prose.

## 8. Verification record

Measured 2026-10-19 in `workspaces/primitives`, release-tag
`@gpuix/native@0.10.0`:

- **Old direction (source fix stashed, new tests present):** offline
  `23 failed | 763 passed (786)` — ten blank rows, ten padded rows, both busy
  cases and the source guard; the absent-prop cases pass in both directions
  because they were never broken. Scoped runtime
  `4 failed | 1 passed (5)` — the absent-prop case passes.
- **After:** offline `54 files / 786 tests` green; scoped runtime
  `runtime/description.runtime.test.tsx` `5/5` green; `check-types`, `lint`,
  `fmt`, root `nub run check` and root `nub run test`
  (primitives 786, components 308, playground 20, icons/docs green) all pass.
- The full `test:runtime` suite was **not** used as a gate: the store artifact is
  the release-tag build, whose missing focus events and published box model
  produce the known 111 failures recorded in `TODO.md` and plans 529/583. No
  runtime assertion was re-baselined.

The fixed tree publishes no `aria.description` for a blank value and
`"Net of refunds."` for padded text on all ten surfaces; the busy `Button`
publishes `"Loading"` and `"Loading. Net of refunds."`.

## 9. Acceptance

- Every surface in §3 publishes no description for a blank value and a trimmed
  one for a padded value, proven in the element tree and the real accessibility
  tree.
- A busy `Button` never paints a dangling `"Loading. "`.
- Both failure directions are measured and recorded.
- The offline suite, `check-types` and `lint` are green; no runtime assertion is
  re-baselined.
