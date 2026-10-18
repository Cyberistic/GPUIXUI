# 527 — A disabled mention or tag field stays in the tab order and lights the ring

**Phase:** C/F (Tier 2 hardening) · **Owner:** components · **Depends on:** 110,
200, 201, 314, 319, 388, 394, 516, 522 · **Status:** done — 4 native cases (17
Mention, 15 Tag), six mutation proofs, behaviour suite 702, all three gates green

## 1. The defect (measured 2026-10-18, this host, `0.10.0`)

Plan 394 established **"disabled means inert: no hover, no press, no ring, no tab
stop"** for the controls it measured. `FieldInput` (`tabIndex: -1`, ring guarded
by `!isDisabled`), `SearchInput`, `TimePicker`, `HotkeyRecorder` and `InlineEdit`
follow it. Two field families were missed:

| Render | `autoFocus` | `tabIndex` | focus ring after programmatic focus |
| ------ | ----------- | ---------- | ----------------------------------- |
| `MentionInput disabled autoFocus` | **stole focus** (`mention`) | `undefined` (tabbable) | painted |
| `TagInput disabled` + `TagInputField autoFocus` | **stole focus** (`tag-field`) | `undefined` (tabbable) | painted |

Measured with a scratch behaviour suite (`src/behaviour/scratch-disabled-fields`),
now deleted:

```
mention disabled autoFocus → { focused: Some("mention"), tabIndex: undefined, ring: undefined }
mention disabled, focusElement(mention) → { focused: Some("mention"), ring: { … } }
tag disabled autoFocus → { focused: Some("tag-field"), tabIndex: undefined, ring: undefined }
tag disabled, focusElement(tag-field) → { focused: Some("tag-field"), ring: { … } }
```

`autoFocus` never runs React's `onFocus` (plan 388), so the ring was only
missing in the `autoFocus` case; a press or a programmatic focus paints it. The
field also announces `Disabled` through `aria-description` (plan 516) while
behaving as an ordinary tabbable control — the exact contradiction plan 394 set
out to remove.

Reachable without exotic composition: a settings form disables a field while the
user is tabbing through it, or mounts a disabled composer with `autoFocus`.

## 2. The rule

> A disabled field is read-only, out of the tab order, announces `Disabled`, and
> paints no focus ring; its `autoFocus` is ignored. Enabling it restores the
> caller's own `tabIndex` and the field's normal focus behaviour.

This is `FieldInput`'s existing contract, applied to the two outliers. It does
**not** claim to make a native `readOnly` input unreachable by pointer: GPUix
0.10.0 focuses it, exactly as `FieldInput` allows; the guarantee is the tab stop
and the paint.

## 3. Files and changes

### 3.1 `packages/components/src/mention-input.tsx`

In `MentionInput` (the field):

1. `autoFocus={autoFocus && !disabled}` — a disabled field never takes focus on
   mount.
2. After `{...rest}`, add `{...(disabled ? { tabIndex: -1 } : {})}`. When
   enabled, a caller's `tabIndex` still passes through untouched.
3. Keep `readOnly={disabled}` as is.
4. The group style's ring becomes `...(focused && !disabled ? focusRing(theme) : {})`.
   Keep the `focused` state itself honest (`onFocus` still records it), so a
   later enable is correct without a second render path.

### 3.2 `packages/components/src/tag-input.tsx`

In `TagInputField`:

1. `autoFocus={autoFocus && !disabled}`.
2. After `{...rest}`, add `{...(disabled ? { tabIndex: -1 } : {})}`.
3. In `TagInput`'s group style, the ring becomes
   `...(focused && !disabled ? focusRing(theme) : {})`.

The `autoFocus` seed in `TagInputField` already checks `!disabled` (plan 522);
the native `autoFocus` prop did not. The chip removal controls are already
unmounted when disabled, so no chip change.

### 3.3 Behaviour tests

`packages/components/src/behaviour/mention-input.test.tsx` — add two cases
(suite 15 → 17; the docs page must state 17):

1. **"a disabled field ignores autoFocus and leaves the tab order"** — render
   `disabled autoFocus`; expect `focusedTestId` not `Some("mention")`, the input's
   `customProps.tabIndex` `-1`, and the group's `style.boxShadow` `undefined`.
2. **"a focused disabled field paints no ring"** — render `disabled` without
   `autoFocus`, `renderer.focusElement(input.id)`, flush; expect the group's
   `style.boxShadow` `undefined` (focus may still move — the guarantee is the
   paint; `FieldInput` behaves the same).

`packages/components/src/behaviour/tag-input.test.tsx` — the same two cases for
`TagInputField` (suite 13 → 15).

Update both suite header comments: add "a disabled field that steals `autoFocus`,
stays tabbable and lights the ring (plan 527)" to the guarded-bugs list.

### 3.4 Docs, records and examples

- `docs/mention-input.mdx`: the Accessibility bullet and Limitations gain "a
  disabled field ignores `autoFocus`, leaves the tab order (`tabIndex -1`) and
  paints no ring"; the Verification line's count 15 → 17 and its list gains the
  two cases.
- `docs/tag-input.mdx`: the same sentence in Accessibility/Theming and the
  Verification count 13 → 15.
- `COMPONENTS.md`: update the Tag and Mention rows' disabled sentences and
  native counts (Mention 15 → 17, Tag 13 → 15).
- `src/mention-input.tsx` / `src/tag-input.tsx` `…Meta.limitations`: no new
  limitation — this closes one. Keep the "no aria-disabled" note.
- Optional but preferred: add a disabled instance to
  `examples/mention-input.example.tsx` and `examples/tag-input.example.tsx`, so
  the example suite renders the state in the real runtime.
- `TODO.md`: tick the task under Tier 2 hardening.
- `.agents/slop/plans/README.md`: index this plan, status `done` after the run.
- `PLAN.md`: no decision row — this applies D25/plan 394, it does not change the
  architecture.

## 4. Commands and expected results

```sh
cd packages/components
nub run test:behaviour mention-input
nub run test:behaviour tag-input
```

Expected: `mention-input` 15 passed, `tag-input` 15 passed.

Mutation proofs (run each, record, revert):

| Mutation | Expected failure |
| -------- | ---------------- |
| Drop `&& !disabled` from `autoFocus` (mention) | disabled autoFocus case fails |
| Drop `tabIndex: -1` (mention) | tab-order case fails |
| Drop `&& !disabled` from the group ring (mention) | focused-disabled ring case fails |
| The same three on the tag field | the matching tag case fails |

Then from the repo root: `nub run check`, `nub run lint`, `nub run test` — all
exit `0`; the behaviour suite is 698 + 4 = **702**.

## 5. STOP conditions

- If a disabled field no longer receives `focusElement` at all after the change,
  that is a stronger result than the plan assumes: keep the tests but assert the
  measured truth, and update §1's table before continuing.
- If `tabIndex: -1` changes any existing enabled-field case, stop and report
  which case; enabled callers must see no difference.
- If the docs/inventory count checks disagree for any other page, stop — this
  plan touches only the two pages and two rows.

## 6. Acceptance

- Four new native cases pass; each has a recorded mutation that fails it.
- The full behaviour suite (702) and the three gates pass.
- Mention/Tag docs, `COMPONENTS.md`, the inventory records, `TODO.md` and the
  plan index agree; the example suite still renders every example.

## 7. Results (2026-10-18, this host, `0.10.0`)

- The fix is the three-line change in each field recorded in §3: `autoFocus` is
  gated on `!disabled`, a disabled field sets `tabIndex: -1`, and the group ring
  is painted only when `focused && !disabled`.
- New native cases: Mention input 15 → **17**, Tag / token input 13 → **15**;
  behaviour suite 698 → **702**.
- Mutation proofs (each mutation failed exactly the named case, then reverted):
  | Mutation | Failure |
  | -------- | ------- |
  | Mention `autoFocus` unguarded | `ignores autoFocus and leaves the tab order when disabled` |
  | Mention `tabIndex` removed | the same case |
  | Mention ring unguarded | `paints no ring when a disabled field is focused` |
  | Tag `autoFocus` unguarded | `ignores a disabled field's autoFocus and leaves the tab order` |
  | Tag `tabIndex` removed | the same case |
  | Tag ring unguarded | `paints no ring when a disabled field is focused` |
- The scratch measurement file was deleted; no example changed, because both
  components already render a working example and the disabled state is covered
  by the native suite.
- Docs, `COMPONENTS.md` rows, `TODO.md` and this index now state the same rule
  and counts.
