# 565 — The combobox trigger paints focus and keeps the caller's style

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `116`, `117`, `388`, `394`, `516`, `522`, `523`, `527` |
| Status | done — 4 native cases (Combobox 45), four mutation proofs |
| Blocker | none — the assertions read the authored `style` the renderer reports (plan `150`) and `autoFocus` seeds the focus state (plan `388`), so the plan-540 binding defects (focus events, box conventions) are out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`ComboboxTrigger` renders GPUix's headless trigger: a `div` with
`role="button"`, `tabIndex 0`, `aria-expanded` and the open/close handlers. It is
a real tab stop, but it has **no focus state and therefore no focus ring**, and
its `style` attribute overwrites the caller's instead of merging it.

Measured on this host (0.10.0, plan 140's binding) with

```tsx
<Combobox options={options} defaultValue="calendar">
  <ComboboxTrigger testId="cb-trigger" label="Choose" autoFocus
    style={{ backgroundColor: "#FF0000" }} />
  <ComboboxContent>
    <ComboboxInput />
    <ComboboxList />
  </ComboboxContent>
</Combobox>
```

the renderer reports:

```
before (trigger auto-focused, focused element id 4 = the trigger):
  backgroundColor #11141A   ← the component's background, not the caller's #FF0000
  boxShadow       undefined ← no focus ring
  tabIndex        0
after pressing the trigger:
  focused element id 6 (the search field)
  input boxShadow   { offset 0, blur 0, spread 2, color #A7A9FF }  ← the field's ring
  trigger boxShadow undefined
```

Two defects, one surface:

1. **No focus indicator.** Every focusable part in this package paints the token
   focus ring (plan `522`); the combobox trigger was missed by that audit even
   though it is the package's only focusable part that had no ring at all. A
   keyboard user tabbing to the combobox gets no visual cue, and `docs/combobox.mdx`
   only promises the ring for the search field (plan `523`).
2. **The caller's `style` is dropped.** `ComboboxTrigger` spreads `{...rest}`
   and then sets `style={...}` after it, so the last write wins and a caller
   `style` never reaches the runtime. The docs' API preamble states "Every part
   merges `style` last where it takes one", so this contradicts a documented
   contract.

Scope of this plan:

- the trigger paints `focusRing(theme)` while it has focus and is not disabled;
- the ring is suppressed while the popup is open, because the search field owns
  focus then (its own ring is the cue);
- a caller `style` merges **last** over the trigger's base style;
- prove each rule with a native case that fails without it, sync
  `docs/combobox.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index.

**Out of scope** (do not change): the headless trigger's open/close, disabled,
Escape or keyboard contract (GPUix owns it and its suite proves it); focus rings
on option rows (the input keeps focus and the highlight is the row cue, plan
`523`); a `focusVisible` heuristic (0.10.0 has none); the local button stand-in;
the plan-540 binding defects.

## 2. What exists today (read these first)

- `packages/components/src/combobox.tsx` → `ComboboxTrigger`:
  - destructures `placeholder`, `label`, `testId`, `onKeyDown`, `...rest`;
  - `disabled` and `open` come from `useCombobox()`;
  - passes `role="button"`, `aria-expanded={open}`, `ref={registerTrigger}`,
    `disabled`, `{...rest}`, `stateDescription(disabled, ...)`, `onKeyDown` and
    a literal `style` object;
  - the literal `style` ends with
    `hover: disabled ? undefined : { backgroundColor: theme.colors.hover }`.
- `packages/components/src/behaviour/combobox.test.tsx` — 41 native cases. The
  header comment names the bugs the suite guards; add these two.
- `packages/components/docs/combobox.mdx`:
  - Keyboard section: "The search input keeps focus and paints the token focus
    ring while it holds it (plan 523)";
  - Theming section names the trigger's colours;
  - Verification says "(41 tests)";
  - Limitations: "The trigger is a `div` with button semantics ... not a native
    button element".
- `COMPONENTS.md` → Tier 2 → Comboboxes: says "41 native behaviour tests" and
  records "The search field paints the token focus ring while it holds focus
  (plan 523)."
- `packages/components/src/combobox.tsx` → `comboboxMeta`: `testFile` is
  `src/behaviour/combobox.test.tsx`; its `limitations` array does not claim the
  trigger has no ring or ignores `style`, so no record edit is required.
- `packages/components/src/inventory.test.ts` holds the docs/`COMPONENTS.md`
  test count to the suite, so both counts change in the same commit.
- `focusRing` and `mergeStyles` are already imported in `combobox.tsx`
  (`focusRing` for `ComboboxInput`, `mergeStyles` for the content/list).
- `useState` is already imported.

## 3. Design

### 3.1 Focus state (`combobox.tsx`, `ComboboxTrigger`)

```tsx
const [focused, setFocused] = useState(autoFocus === true && !disabled);
```

- Seed from `autoFocus` exactly like every other ring-owning part (plan `388`):
  the runtime focuses the element after React's effects, so `onFocus` never runs
  for an `autoFocus` mount and `style.boxShadow` would otherwise be computed
  from a stale `false`.
- A disabled trigger never seeds focus, and never paints the ring: disabled is
  inert (plan `394`; plan `527` applies the same rule to the mention and tag
  fields).
- Compose the caller's handlers, in the package's order
  (`internal/button.tsx`, plan `331`): call the caller's first, then set state.
  Destructure `autoFocus`, `onFocus` and `onBlur`; pass
  `autoFocus={autoFocus && !disabled}` so a disabled trigger is never focused
  by the prop.

```tsx
onFocus={(event) => {
  setFocused(true);
  onFocus?.(event);
}}
onBlur={(event) => {
  setFocused(false);
  onBlur?.(event);
}}
```

### 3.2 The ring condition

```tsx
...(focused && !disabled && !open ? focusRing(theme) : {}),
```

- `!open` matters because opening moves native focus to the search field. Without
  it an `autoFocus` trigger would keep its seeded `focused` (no `onBlur` is
  delivered on this binding) and the popup would show two rings at once. `open`
  is React state, so the rule is observable and testable.
- The ring is the neutral token ring, the same one `ComboboxInput` paints; no
  new token or component-owned colour.

### 3.3 The caller's style

Destructure `style` and merge the base object first, the caller last:

```tsx
style={mergeStyles(
  { /* the existing literal base style */ },
  style,
)}
```

`mergeStyles(base, caller)` lets the caller override any property while the
component keeps its defaults, which is what the docs promise and what
`ComboboxContent`/`ComboboxList` already do.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/combobox.tsx` | the focus state, the ring condition and the `mergeStyles` call in `ComboboxTrigger`; a doc-comment line on the trigger |
| `packages/components/src/behaviour/combobox.test.tsx` | four native cases (§5.1) plus the guarded-bug header line |
| `packages/components/docs/combobox.mdx` | Keyboard/Theming prose for the trigger ring, the caller `style` merge and the count `41 → 45` |
| `COMPONENTS.md` | the Comboboxes row: `41 → 45` native tests, the trigger ring and the style merge |
| `TODO.md` | add and tick the Phase C hardening row (§7) |
| `.agents/slop/plans/README.md` | index this plan after `564` with the measured counts |
| `.agents/slop/plans/565-combobox-trigger-surface.md` | this plan |

Touch nothing outside `packages/components/**`, `COMPONENTS.md`, `TODO.md` and
`.agents/slop/plans/**`.

## 5. Test plan

Extend the suite header comment with the two guarded bugs: **the combobox
trigger took focus but painted no ring, and it discarded the caller's `style`**.

### 5.1 Native (`src/behaviour/combobox.test.tsx`, real `TestRenderer`)

Add a small fixture or reuse the existing option list. Import `focusRing` from
`../internal/theme.js` and `clickCentreOf`/`until` from
`../internal/interaction.js` (the suite already imports the interaction helpers
it needs; add what is missing).

1. **The auto-focused trigger paints the token ring in both themes.**
   For each of `light` and `dark`: render a closed combobox whose trigger has
   `autoFocus` (plus content, so the tree is a realistic combobox), then assert
   `findByTestId("combobox-trigger")?.style.boxShadow` deep-equals
   `focusRing(palette).boxShadow`. `unmount()` between themes (one native root).
   *Fails today*: `boxShadow` is `undefined`.
2. **The ring leaves while the popup is open.**
   Render the same combobox with an `autoFocus` trigger, press the trigger
   centre (`clickCentreOf(root, "combobox-trigger")`), wait with
   `until(() => root.renderer.findByTestId("combobox-input") !== undefined)`,
   then assert:
   - the trigger's `style.boxShadow` is `undefined`;
   - the search field's `style.boxShadow` deep-equals
     `focusRing(darkTheme).boxShadow`.
   *Fails with the `!open` guard removed*: the trigger keeps its seeded ring.
3. **A caller `style` merges over the trigger's base.**
   Render a trigger with `style={{ backgroundColor: "#FF0000" }}` and assert the
   reported `style.backgroundColor` is `"#FF0000"` while another base property
   the caller did not set (e.g. `borderRadius`) still equals the theme's
   `radius.md`. *Fails today*: the reported colour is the theme background.
4. **A disabled auto-focused trigger paints no ring.** Render
   `<ComboboxTrigger autoFocus disabled />` and assert `style.boxShadow` is
   `undefined`. This is a **pin**: it passes before and after the change, and
   fails if the `!disabled` part of the seed/condition is removed.

Expected: the suite grows from 41 to 45 passing cases; existing cases unchanged.

### 5.2 Both directions (AGENTS §3)

1. Fix only §3.2's ring condition and seed, keep the old style line: case 1 and
   case 2 must fail on `boxShadow`; case 3 must still fail.
2. Restore the ring line, revert only `mergeStyles(...)` to the literal style:
   case 3 fails, cases 1, 2, 4 pass.
3. Remove `&& !open` from the ring condition: case 2 fails (trigger ring
   present) while case 1 passes.
4. Seed `useState(autoFocus)` without `!disabled`: case 4 fails.
5. Restore everything: all four cases pass. Record each observed failure in the
   commit message.

### 5.3 Regression

- the 41 existing combobox cases pass unchanged;
- `src/behaviour/theme-matrix.test.tsx` covers Combobox in both themes and stays
  green;
- `nub run --filter @gpuixui/components test` passes with the updated inventory
  and docs counts;
- `nub run check`, `nub run lint` pass.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/combobox.test.tsx                       # 45 passed
cd ../..
nub run --filter @gpuixui/components test               # unit suite passes
nub run --filter @gpuixui/components check-types        # exit 0
nub run check                                           # exit 0
nub run lint                                            # exit 0
```

`test:behaviour` as a script runs the whole native suite, which currently has 55
**pre-existing** plan-540 binding failures; scope the run to the file with the
command above. Never report the full suite green unless it is.

## 7. Docs, inventory and TODO

- `docs/combobox.mdx`:
  - Keyboard: after the search-field ring sentence, state that the trigger also
    paints the token ring while it holds focus and gives it up while the popup is
    open, so exactly one ring is visible;
  - API preamble or Theming: note the trigger merges the caller's `style` last,
    like every other part that takes one;
  - Verification: `(41 tests)` → `(45 tests)` and name the new cases.
- `COMPONENTS.md` Comboboxes row: `41 → 45 native behaviour tests`; add "the
  trigger paints the token focus ring while it holds focus (and not while the
  popup's field does) and merges the caller's `style`".
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick `The combobox trigger paints focus and keeps the caller's style — plan
  565; 4 native cases (Combobox 45), four mutation proofs; docs, COMPONENTS.md
  and the inventory synced`.
- Plan index: add plan 565 after 564 with the measured counts.
- `src/inventory.ts` needs no edit (no limitation claims the ring is absent or
  that `style` is dropped).

## 8. STOP conditions

Stop and report instead of improvising when:

- the auto-focused trigger's `boxShadow` is not deep-equal to
  `focusRing(theme).boxShadow` (the runtime may reshape the shadow; do not
  weaken the assertion to `toBeDefined` without recording the exact value);
- the trigger's ring cannot be observed through `autoFocus` (then the plan-388
  seeding rule or the harness regressed — report; do not switch to
  `renderer.focusElement`, which this binding cannot observe);
- pressing the trigger does not open the popup, or the search field has no ring
  (the fixture, not the fix, is wrong — report the case name);
- the caller's `backgroundColor` still reads the theme background after the
  merge (then `mergeStyles` order or the spread order is wrong — fix the order,
  not the test);
- the ring also appears on a disabled trigger;
- an existing combobox, theme-matrix or inventory case fails for a reason other
  than the intended change (name the case and stop);
- the inventory count check fails because a count was not synced (fix the
  count, not the check).

## 9. Acceptance

- A focused, enabled, closed combobox trigger reports the theme's token focus
  ring; an open one does not (the search field does);
- a disabled trigger reports no ring;
- a caller `style` reaches the trigger and overrides its defaults while the
  remaining defaults stay;
- four new native cases pass; the 41 existing ones still pass; unit, inventory,
  type, lint and format gates pass;
- `docs/combobox.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index agree with
  the measured counts.
