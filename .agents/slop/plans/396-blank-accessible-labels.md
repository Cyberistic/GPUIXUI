# Plan 396 — A blank accessible label is not a name

**Owner:** primitives workstream (`packages/primitives`).
**Phase:** F (accessible-name truth pass), no public API change.
**Depends on:** 043 (`testId` parity), 058 (names from text), 072 (`ScrollArea`
keyboard), 073 (`InfoTip`), 085/086 (button activation), 093 (name matrix),
341/345 (slot triggers), 389 (fields state what they cannot do).

## 1. The defect, measured

Two surfaces treat a **blank** explicit label as a name:

- `Button`/`Toggle` resolve their name as `props.label ?? textOf(children)`. A
  computed label that arrives as `""` therefore **wins over a perfectly good
  text child**, and the control reaches assistive technology unnamed.
- `ScrollArea` decides `named = label !== undefined`. A label of `"   "` makes
  the area a focusable `region` whose name is whitespace, which is exactly the
  unnamed tab stop the component's own docs say it avoids.

Measured on this host, 2026-10-19 (temporary probe, 1280 × 800 window, then
deleted):

```
<Button label="">Save</Button>      a11y dump: Button:""            <- "Save" discarded
<Button>Save</Button>               a11y dump: Button:"Save"
<ScrollArea label="   " />          a11y dump: Region:"   "         <- focus stop
```

The class is the same one plans `057`, `058`, `071`, `073` and `093` fixed — a
control that paints and takes focus but carries no usable name — and the name
matrix's closure test cannot see it, because its composed scene gives every
control a real label.

## 2. What ships

One rule, in `src/components/internal.ts`:

- `usableLabel(label)` — trim, then `None` when the result is empty.
- `controlName(label, children)` — the explicit name when `usableLabel` says it
  says something, otherwise `textOf(children)`.

Applied where the two defects live:

1. `Button` and `Toggle` use `controlName`, so a blank explicit label falls back
   to their text children instead of erasing the name.
2. `ScrollArea` uses `usableLabel` for both `named` and the key guard, so a blank
   label leaves the area inert: no `region` role, no tab stop, no key handler.
   A non-blank label is trimmed and used as the accessible name.
3. Other optional `label` props keep passing their value through: an empty label
   on a field or group has no fallback, and inventing one would be worse. The
   rule is recorded in the docs of the helper, not silently generalised.

**No API change:** the same props and types, a stricter reading of "label".

## 3. Exact files

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/396-blank-accessible-labels.md` | this plan |
| `.agents/slop/plans/README.md` | index row, status `done` |
| `packages/primitives/src/components/internal.ts` | `usableLabel` + `controlName` |
| `packages/primitives/src/components/Button.tsx` | name resolution through `controlName` |
| `packages/primitives/src/components/Toggle.tsx` | the same |
| `packages/primitives/src/components/ScrollArea.tsx` | blank label is absent in `renderScrollArea` and the key guard |
| `packages/primitives/src/components/Button.test.tsx` | blank and whitespace labels fall back to text; an explicit label is trimmed |
| `packages/primitives/src/components/Toggle.test.tsx` | the same two cases |
| `packages/primitives/src/components/ScrollArea.test.tsx` | blank label is inert; a padded label is the region's trimmed name |
| `packages/primitives/runtime/name.runtime.test.tsx` | two matrix rows (blank `Button`/`Toggle`) and one no-unnamed-region case |
| `packages/primitives/docs/button.mdx` | the `label` row and the name paragraph |
| `packages/primitives/docs/toggle.mdx` | the same |
| `packages/primitives/docs/scroll-area.mdx` | a blank label is not a label |
| `COMPONENTS.md` | the Button and Scrollable-containers rows |
| `TODO.md` | one ticked row under the primitives section |

Do not change any other package, the theme, or any component's public props.

## 4. Implementation steps

1. **Confirm the defect is still present.** Run the probe from §1 (a temporary
   `runtime/probe-labels.runtime.test.tsx`, mount one `Button label=""` and one
   `ScrollArea label="   "`, dump `a11yNodes`). The received dump must contain
   `Button:""` and `Region:"   "`. If it does not, STOP — someone else fixed it
   and this plan is stale.
2. **Add the helper** to `internal.ts`, beside `textOf`:

   ```ts
   /** A caller's label, when it says anything; whitespace is not a name. */
   export const usableLabel = (label: string | undefined): Option.Option<string> =>
     Option.filter(Option.map(Option.fromNullishOr(label), Str.trim), Str.isNonEmpty);

   /** A control's name: an explicit label that says something, else its text children. */
   export const controlName = (
     label: string | undefined,
     children: ReactNode,
   ): Option.Option<string> =>
     pipe(usableLabel(label), Option.orElse(() => textOf(children)));
   ```

   JSDoc must carry a summary (`tsdoc.test.ts` only scans public exports, but the
   package convention is every exported value is documented).
3. **Button:** replace `props.label ?? Option.getOrUndefined(textOf(props.children))`
   with `Option.getOrUndefined(controlName(props.label, props.children))`.
   **Toggle:** the same. Both keep every other prop and handler untouched.
4. **ScrollArea:** in `renderScrollArea`, resolve
   `const name = Option.getOrUndefined(usableLabel(label));` and use
   `const named = name !== undefined;`, `aria-label={name}`. In the component's
   `onKeyDown`, return when `Option.isNone(usableLabel(props.label))` — the same
   decision, so the render and the key guard cannot disagree.
5. **Element-tree tests** (no runtime needed):
   - `Button`: `label: ""` and `label: "   "` on `children: "Save changes"` →
     `aria-label` is `"Save changes"`; `label: " Close "` → `"Close"`; no label
     and a non-text child stays `None` (the existing case).
   - `Toggle`: the same with `"Bold"`.
   - `ScrollArea`: `label: "   "` → no `role`, no `tabIndex`, no `aria-label`;
     `label: "  Activity  "` → `role="region"`, `tabIndex=0`,
     `aria-label="Activity"`.
6. **Runtime name matrix** (`runtime/name.runtime.test.tsx`):
   - add `"Button with a blank label"` (`label: ""`, child `"Save"`) and
     `"Toggle with a blank label"` (`label: "   "`, child `"Bold"`) to `CASES`;
     each expects the content name at its documented role.
   - add `it("creates no unnamed region for a blank ScrollArea label", ...)`:
     mount `Button "Before"`, a `ScrollArea label="   "`, `Button "After"`; assert
     no `Region` node exists in the dump and that `focusNext()` from `Before`
     lands on `After` (use `runtime.keyDown("before", "tab")` then
     `runtime.focused()`).
7. **Docs:**
   - `button.mdx`: the `label` row says an **explicit, non-blank** label wins and
     whitespace falls back to text content (trimmed).
   - `toggle.mdx`: the same sentence.
   - `scroll-area.mdx`: the label paragraph says a **non-blank** label is what
     makes the region focusable; a blank one leaves the area inert.
8. **Inventory:** append the blank-label rule to the Button and Scrollable
   containers rows in `COMPONENTS.md` (plan 396), naming what it prevents
   (`Button:""`, `Region:"   "`, the unnamed tab stop).
9. **`TODO.md`:** add and tick one row under the primitives section:
   "a blank explicit label erased a control's name and made a nameless region a
   tab stop — `usableLabel`/`controlName` (plan 396)".
10. Run the commands in §5. Commit with
    `fix(primitives): never let a blank label erase a name`.

## 5. Test plan and commands

All commands run from `workspaces/primitives`.

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime runtime/name.runtime.test.tsx
nub run --filter @gpuixui/primitives check-types
nub run check
```

Expected: the offline suite is green (700 → 704, the four new element cases);
the scoped live file is green (33/33, its three new cases included); `check` is
green.

**Both directions, recorded in the plan index row:**

1. Run the new element cases with `controlName` reverted to the old
   `props.label ?? textOf(...)` → the blank-label cases fail on `aria-label`.
2. Run the new runtime matrix rows with the same revert → the two rows fail by
   name with `Button:""` in the dump.
3. Run the ScrollArea cases with `named = label !== undefined` restored → the
   element case sees a `region`, and the live case finds an unnamed `Region` and
   focus on it after Tab.
4. Restore the fix; all cases pass.

## 6. STOP conditions

- The probe in step 1 no longer reproduces (`Button:""`/`Region:"   "` absent):
  stop and report; the plan is stale.
- A blank label on `Button` proves to have a **deliberate** contract (docs or a
  test asserting the empty name): stop and report instead of changing it.
- Trimming an explicit label breaks an existing case: stop; do not widen the
  change to keep a failing expectation.
- The scoped live file fails for the host/artifact reason already recorded in
  `TODO.md` (the full-suite row), not because of these cases: record the failure
  and continue with the offline evidence; do not re-baseline unrelated cases.

## 7. Acceptance

- `usableLabel`/`controlName` exist once, are documented, and are the only
  place this rule lives.
- A `Button`/`Toggle` with a blank explicit label exposes its text content's
  name; a non-blank label is trimmed.
- A `ScrollArea` with a blank label has no `region` role, no tab stop and no key
  handler; a padded label is named without the padding.
- The new cases fail in the old direction and pass in the new one.
- Docs and inventory state the rule; the plan is indexed and `TODO.md` ticked.
