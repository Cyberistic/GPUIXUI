# 740 — A visible label inside a standalone `Checkbox` and `Switch`

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — removes two documented Tier 1 limitations |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the two inventory rows in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `055` (theme axes), `396` (blank names), `590` (native-focus tracker), `640` (mark scale) |
| Status | **done** — `children` is the row's visible label, name and hit area on both controls; 6 element + 6 runtime cases, all six runtime cases fail against the unlabelled tree; offline 69 files / 947 tests, scoped live 5 files / 104; full runtime 64 files / 858 tests green; README and the two inventory rows carry 64 runtime files |

## 0. Why

Both pages document the same limitation, and it is the one shape a settings
screen cannot avoid:

- `docs/checkbox.mdx` §Limitations: "No label-inside-the-control composition for
  a standalone box: a `Label` beside it is cosmetic (not clickable, not
  associated)."
- `docs/switch.mdx` §Limitations: "…a visible `Label` beside it is cosmetic (not
  clickable, not associated) — the switch names itself through `label`."

The workaround today is `CheckboxGroup` (wrong for one boolean) or a Tier 2
field row. GPUix 0.10.0 has no `aria-labelledby`, so a sibling label cannot be
associated. But the data-driven groups already solved this the honest way: the
**row is the control** — role, name, tab stop, keyboard and pointer — and the
box is a decorative child (`CheckboxGroup`'s header comment, plan `355`).

This plan gives a standalone `Checkbox` and `Switch` the same shape through one
additive prop: `children`. With children the root becomes the labelled row; with
none the component renders exactly what it renders today, so no existing caller
changes behaviour.

Measured on the pinned release build before this plan (probe, 2026-10-20):
`CheckboxGroup`/`RadioGroup` rows toggle when a real hit-tested click lands on
the inner box, so a plain child `div` does not swallow the press; the same shape
is safe for the new row.

## 1. The API

Both parts gain one prop, typed and documented:

```tsx
<Checkbox defaultChecked>Email me product updates</Checkbox>
<Switch checked={paused} onValueChange={setPaused}>Pause all notifications</Switch>
```

Rules:

1. `children` is the **visible** label. It paints as `Text role="label"` inside
   the row, and the row becomes the hit area, the tab stop and the focus ring's
   owner-of-record (the ring still paints on the box / track, as in the groups).
2. The accessible name is `label` when it says something, else the text
   children (`controlName`, the Button/Toggle rule, plans `058`/`396`). A blank
   `label` therefore falls back to the children rather than erasing the name; a
   blank child list leaves the control unnamed, exactly like a `Button` with
   non-text children.
3. `label` still wins for the name when both are supplied; both may be used
   together when the visible text is an abbreviation.
4. `style` (a `StateStyle`) applies to **the control root**: the box today, the
   row when children are present. Documented, because a caller-visible surface
   changes with the shape.
5. No children → the current element tree is byte-identical. `CheckboxGroup`,
   `RadioGroup`, the focus-ring matrix and every existing assertion are
   untouched.
6. `Tooltip` slot handlers stay on the root (`passiveTriggerHandlers` + composed
   focus/key handlers), so a labelled control is still a trigger.

## 2. Files to change

### 2.1 `packages/primitives/src/components/Checkbox.tsx`

- Add `readonly children?: ReactNode` to `CheckboxProps` with a doc comment
  stating rules 1–5 above.
- Import `controlName`, `selectionRowStyle`, `shrinkLayoutStyle`, `Text`,
  `Option`.
- In `renderCheckbox`, after `partState`:
  - `const labelled = props.children !== undefined && props.children !== null;`
  - `const name = Option.getOrUndefined(controlName(props.label, props.children));`
  - keep the existing unlabelled return unchanged except it uses `name`
    (identical to `ariaName(props.label)` when there are no children);
  - when `labelled`, return:

    ```tsx
    <div
      {...passiveTriggerHandlers(props)}
      ref={composeRef(props.ref, focus.ref)}
      role="checkbox"
      aria-label={name}
      aria-description={ariaName(props["aria-description"])}
      aria-valuetext={selectionValueText(current)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down", props.onKeyDown)}
      onKeyUp={onKey("up", props.onKeyUp)}
      onFocus={composeHandler(focus.onFocus, props.onFocus)}
      onBlur={composeHandler(focus.onBlur, props.onBlur)}
      style={resolvePartStyle(
        selectionRowStyle({ disabled: props.disabled, align: "center" }, theme),
        props.style,
        partState,
      )}
    >
      <div style={selectionBoxStyle(spec, theme)}>{mark}</div>
      <Text
        role="label"
        tone={props.disabled === true ? "muted" : "default"}
        style={shrinkLayoutStyle}
      >
        {props.children}
      </Text>
    </div>
    ```

  - extract the mark (`current === "unchecked" ? null : <Icon …>`) into one
    `const mark` used by both branches, so the two paints cannot drift.

### 2.2 `packages/primitives/src/components/Switch.tsx`

Same shape:

- Add `children` to `SwitchProps`; derive `name` and `labelled` exactly as
  above; extract the current `<motion.div …>` into `const thumbElement`.
- Unlabelled: unchanged.
- Labelled: root row (role/name/valuetext/tabIndex/handlers/focus) with
  `selectionRowStyle`, an inner `<div style={switchTrackStyle(spec, theme)}>`
  containing the thumb, and the label `Text` beside it.

### 2.3 `packages/primitives/src/components/selection.test.tsx`

Add to `describe("Checkbox")`:

1. `"names a labelled checkbox from its text, and paints one row"` — render
   `{ children: "Email notifications", checked: true }`; assert the root is
   `role="checkbox"`, `aria-label` is `"Email notifications"`, it has exactly two
   children, and the first child's style is the box (`width` = `iconSize.md`).
2. `"lets an explicit label win over the visible text, and a blank one fall back"`
   — `{ label: "Alerts", children: "Email me" }` → `"Alerts"`;
   `{ label: "   ", children: "Email me" }` → `"Email me"`;
   `{ label: "   ", children: "   " }` → no `aria-label`.
3. `"merges the caller's style on the row when the control has a label"` —
   a `style` callback returning `{ paddingLeft: 4 }` reaches the row (root)
   style, not the box; the unlabelled render still puts it on the box.
4. The existing unlabelled cases stay untouched (they are the regression guard
   that the default tree did not change).

Add to `describe("Switch")`:

5. `"names a labelled switch from its text and keeps the thumb inside a track"` —
   root role `switch`, name from children, root has two children, the first is
   the track whose first child is the `motion.div` with `animate.left`.
6. `"lets an explicit label win over the visible text"` — `{ label: "Wi-Fi" }`
   wins; blank label falls back.

### 2.4 `packages/primitives/runtime/labelled-selection.runtime.test.tsx` (new)

Header comment names the limitation this plan removes. Six cases, each with a
locator named in the title:

1. `"toggles a labelled checkbox from a press on its visible text"` —
   `<Checkbox testId="c" defaultChecked={false}>Email notifications</Checkbox>`;
   `runtime.click("c")` (row centre = the text) → the `Email notifications`
   accessibility node announces `"checked"`; click again → `"unchecked"`.
2. `"reaches a labelled checkbox once in the tab order, and toggles on Space"` —
   mount the labelled box beside a `Button`; `focusNext()` → `runtime.focused()`
   is `"c"`; `keyDown("c","space")` + `keyUp` → announced `"checked"`;
   `focusNext()` leaves it (the row is one stop, not two).
3. `"paints the focus ring on the box, not around the row"` — after focusing,
   `awaitFrame` until the inner box's `boxShadow` is defined; assert the row's
   own style has no ring. The inner box id is `row.children[0]`.
4. `"refuses a press and leaves the tab order while disabled"` — `disabled`
   labelled box: click → still `"unchecked"`, `focusNext()` skips it.
5. `"toggles a labelled switch from its text and announces the new state"` —
   labelled switch, click → `"checked"`.
6. `"keeps a sibling Label inert beside the labelled control"` — render a
   labelled box and a sibling `Label` to its right; clicking the sibling does
   nothing. This keeps the old limitation (a *sibling* label is not associated)
   true while the new composition works.

Use the existing helpers: `openWindow`, `Surface`, `awaitFrame`, `a11yValueOf`,
`runtime.element`, `runtime.paintBoundsOfId` (only if a coordinate click is
needed — prefer `click(testId)`).

### 2.5 `packages/primitives/docs/checkbox.mdx`

- Usage: show `<Checkbox defaultChecked>Email me product updates</Checkbox>`
  first; keep the controlled + `CheckboxGroup` examples.
- API: add `children` (`ReactNode`, none, "visible label; the row becomes the
  hit area and the tab stop, and the text is the name when `label` is absent").
- Accessibility: replace the "visible name is a separate `Label`" bullet with
  the two supported shapes — children inside the control (one node, clickable)
  and `label` for a name with no visible text; a **sibling** `Label` is still
  inert.
- Limitations: delete the "No label-inside-the-control composition" bullet;
  state what remains (no sibling association, no description line inside a
  standalone control — use `CheckboxGroup` for label + description rows).
- Verification: add the new element cases and the runtime file.
- Theming/`style`: state that `style` applies to the row when children are
  present.

### 2.6 `packages/primitives/docs/switch.mdx`

Same edits: usage with children, API row, accessibility bullet, limitations
(delete the cosmetic-label bullet; keep no `aria-checked`, motion and sizing
limits), theming note that `style` lands on the row with children, verification
list.

### 2.7 `packages/primitives/examples/checkbox.example.tsx`

Use the new composition where the example already hand-rolled it:

- Header: `<Checkbox testId="checkbox-example-all" checked={all}
  indeterminate={!all && !none} …>Select all assets</Checkbox>` and delete the
  sibling `Text "Select all"`. The accessible name stays `"Select all assets"`,
  so `runtime/examples.runtime.test.tsx` keeps passing.
- Asset rows: `<Checkbox testId={…} …>{asset.name}</Checkbox>` and delete the
  sibling `<Text role="body">{asset.name}</Text>`, keeping the `Spacer` and the
  detail caption in the outer row.
- Refresh the header comment: the example no longer needs the "a label beside a
  standalone box is inert" workaround.

### 2.8 `packages/primitives/examples/selection.example.tsx`

Replace the final `Row`-wrapped switch with the labelled switch plus a caption
under it:

```tsx
<Stack direction="column" gap="2xs">
  <Switch
    checked={paused}
    onValueChange={setPaused}
    testId="selection-example-pause"
  >
    Pause all notifications
  </Switch>
  <Text role="caption" tone="muted">
    Keeps your preferences; sends nothing until paused off.
  </Text>
</Stack>
```

Delete the now-unused `Row` helper. The runtime example test looks the switch up
by the name `"Pause all notifications"`, which the children supply.

### 2.9 `packages/primitives/README.md` and `COMPONENTS.md`

- README: runtime suite count `63` → `64` test files.
- `COMPONENTS.md`: both "63 files" passages (`the whole runtime suite — **63
  files**`, and any `**63 files, all passing` form) → `64`; update the
  **Checkboxes** and **Switches** rows with the new composition and its tests.

## 3. Commands and expected results

Run in `packages/primitives` (or with `--filter` from the root).

```sh
# 1. offline element suites — new cases included
nub run --filter @gpuixui/primitives test
# expect: all offline files pass; the count assertion in `docs-counts.test.ts`
# passes only after README/COMPONENTS are updated.

# 2. the new runtime file, scoped
nub run --filter @gpuixui/primitives test:runtime runtime/labelled-selection.runtime.test.tsx
# expect: 1 file, 6 tests, all pass.

# 3. the suites the change touches
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/focus-ring.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/selection-mark.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
# expect: each file passes; examples now exercises the label composition.

# 4. the whole offline/type gate for the package
nub run --filter @gpuixui/primitives check-types
```

Do **not** run the whole runtime suite while iterating; it is the end-of-task
check only if the change turns out cross-cutting.

## 4. Test plan — both directions

The regression this plan guards: a standalone `Checkbox`/`Switch` with visible
text painted the text as an inert sibling, so the label was not a hit area, was
not the name, and clicking it did nothing.

For each new proof, run it against the old code first:

1. Revert only the labelled branch (make `labelled` false) and re-run the new
   runtime file: cases 1, 2, 3, 5 and 6 must fail by name (no toggle, or the name
   missing). Case 4 may still pass (disabled), so it is not the proof.
2. Revert `controlName` to `ariaName(props.label)` and run the element suite:
   case 2 must fail (`aria-label` empty for a labelled box).
3. Revert the row `style` merge and run the element suite: case 3 must fail (the
   caller's `paddingLeft` lands on the box, not the row).
4. Keep the sibling-`Label` runtime case in both directions: it must pass before
   and after, because the sibling limitation is not what this plan fixes.

Record the exact failing assertion text in the plan's status line and in the
commit body.

## 5. STOP conditions

Stop and report (do not improvise) if:

- a hit-tested click at the row's centre does **not** toggle the labelled control
  (the runtime swallowed the press: the row shape is not viable);
- the box/track child becomes a second tab stop or a second accessibility node;
- the ring cannot be measured on the inner box, or it paints on the row instead;
- adding `children` changes the unlabelled element tree (the existing selection
  and focus-ring suites fail);
- the `examples.runtime` switch lookup by name stops finding
  `"Pause all notifications"`.

## 6. Acceptance

- `Checkbox` and `Switch` accept `children`; the row is one accessible node, one
  tab stop and one hit area; the text is the name unless `label` says something.
- No children → the previous tree, styles and tests are unchanged.
- Element + runtime proofs for name, toggle, tab order, ring, disabled and the
  still-inert sibling label; all fail in the old direction where stated.
- Both pages, both examples, the README and the two inventory rows tell the
  truth; the file-count guards pass.
- `nub run --filter @gpuixui/primitives test` and the four scoped runtime files
  pass.
