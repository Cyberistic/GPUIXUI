# 810 — A mention suggestion is a named option in a listbox, not an unnamed button

**Owner:** components workstream · **Phase:** F (correctness hardening) ·
**Depends on:** 110, 117, 200, 201, 319, 391, 516, 754, 765, 783, 792

**Numbering:** `810` is free across every worktree on 2026-10-20 (checked with
`ls .agents/slop/plans` over every `workspaces/*`; the highest claimed numbers
are 809 here, 807 in `playground` and `tokens-theme`, 800 in `primitives`).
Recorded in `PLAN.md` D30.

## 1. Why

Plan `783` established one rule for every option row in the package — “a listbox
option carries a name, in every listbox” — and the command palette and combobox
follow it. The mention input does not, and its own record says why: the row is a
`role="button"` with `aria-selected` and the surface is a `role="group"`, on the
recorded claim that **0.10.0 drops `listbox`/`option` from the accessibility
dump**.

Measured in this worktree on 2026-10-20 against the installed 0.10.0 binding,
with two temporary probes (`src/behaviour/zz-probe.test.tsx` and
`zz-probe2.test.tsx`, deleted by this plan):

```text
A real MentionInput with three candidates, after typing "@":
  role "button"   name ""        selected true          ← row 1
  role "label"    name "@ana"    (the <text> child is a sibling node)
  role "button"   name ""        selected false         ← row 2
  role "label"    name "@anna"
  role "button"   name ""        selected false         ← row 3
  role "label"    name "@joan"
  role "group"    name "Mentions"

A bare <div role="listbox" aria-label="Suggestions"> holding two
<div role="option" aria-selected aria-label="…"> rows:
  role "listboxoption"  name "ana"   selected true
  role "listboxoption"  name "anna"  selected —
  role "listbox"        name "Suggestions"
```

So:

1. **Every suggestion row is unnamed.** 0.10.0 does not name a role-bearing
   `div` from its text child (plans 391/792), so a screen reader hears
   “button, selected” with no candidate. The package's own rule — a part that
   paints an interactive role names itself (plan 391) — was never applied here,
   because the rows only exist after typing `@` and the all-example contract
   (plan 792) only walks a painted example.
2. **The surface is not a listbox of options.** `role="listbox"` and
   `role="option"` are *not* dropped by 0.10.0: they are reported as `listbox`
   and `listboxoption` (the same spelling plan 783 measured), with `selected`
   preserved. The recorded limitation is false, and `aria-selected` on a
   `role="button"` is invalid ARIA in the first place.

The fix is the command palette's shape (plan 783): `MentionInputList` paints a
named `listbox` and `MentionInputItem` a `listboxoption` named by its visible
label; the highlight keeps using `aria-selected` because 0.10.0 has no
`aria-activedescendant`.

Scope:

- `MentionInputList` gains an optional `label` (default `"Mentions"`; a caller
  `aria-label` still wins) and paints `role="listbox"`.
- `MentionInputItem` paints `role="option"` and names itself with
  `controlNameFrom`: an authored `aria-label` wins, else `label`, else
  `` `@${value}` `` — the same string it paints.
- Nothing else changes: activation (Enter on press, Space on release, click),
  the focus ring, the highlight rules, ranking, the `disabled` contract, ids and
  styles stay exactly as they are.

**Out of scope** (do not add): `aria-activedescendant` (0.10.0 has none); a
listbox wrapper for the mention `input`; a roving tab stop over the rows (they
stay individually focusable, as shipped); async candidates; any change to the
query/insertion rules.

## 2. What exists today (read these first)

- `packages/components/src/mention-input.tsx`
  - `MentionInputList` (~line 290): `FloatingLayer` with
    `role="group" aria-label="Mentions"`, `{...rest}` spread after them.
  - `MentionInputItem` (~line 366): `role="button"`, `aria-selected={highlighted}`,
    `tabIndex={0}`, `{...rest}` then `ref`/`autoFocus`/handlers/style; its body is
    `<text>{label ?? `@${value}`}</text>`.
  - `mentionInputMeta.limitations` (~line 470): the false
    `"role=listbox and role=option are dropped …"` bullet and
    `"… so the surface is a named group and rows are selected buttons"`.
- `packages/components/src/internal/name.ts` — `controlNameFrom(authored,
  sources)` is the existing rule for “a caller label, else the first visible
  source”.
- `packages/components/src/behaviour/mention-input.test.tsx` — 22 native cases;
  it already asserts `nodesWithRole(renderer, "button")` has 3 nodes after `@`
  and reads `aria-selected` through `customProps`.
- `packages/components/docs/mention-input.mdx` — API table rows for both parts,
  the Accessibility bullets (“buttons with `aria-selected` … named group”,
  “`listbox`/`option` are dropped”), the Limitations list and the Verification
  line `(22 tests)`.
- `COMPONENTS.md` — the `Mention input` row: `22 native behaviour tests` and the
  same false limitation.
- `packages/components/src/behaviour/accessibility.test.tsx` — the plan-792
  contract that every painted role carries a name; it walks the shipped examples
  at rest, so a popup that only opens on interaction is outside it.

## 3. Exact changes

### 3.1 `packages/components/src/mention-input.tsx`

1. `MentionInputListProps` gains
   `readonly label?: string;` with JSDoc: the listbox's accessible name, default
   `"Mentions"`.
2. In `MentionInputList`, destructure `label = "Mentions"`, resolve
   `const name = controlNameFrom(rest["aria-label"], [label])` and paint

   ```tsx
   role="listbox"
   {...rest}
   {...(name === undefined ? {} : { "aria-label": name })}
   ```

   so the caller's authored name still wins and a blank one falls back to the
   default. Update the module/part JSDoc: the surface is a named listbox because
   0.10.0 reports `listbox`/`listboxoption` (measured), and the highlight is
   `aria-selected` because there is no `aria-activedescendant`.
3. In `MentionInputItem`, resolve
   `const name = controlNameFrom(rest["aria-label"], [label, `@${value}`]);`
   and paint `role="option"`, keeping `aria-selected={highlighted}` and every
   handler. Write the resolved name after `{...rest}` so a blank authored label
   cannot erase the fallback; an authored one is the same string, so nothing is
   lost. Import `controlNameFrom` from `./internal/name.js`.
4. Replace the two false limitation strings in `mentionInputMeta.limitations`
   with: `"the highlight is aria-selected on a listbox option because 0.10.0 has
   no aria-activedescendant"` and `"the list is a named listbox of named options;
   every row is individually focusable (no roving tab stop)"`.

### 3.2 `packages/components/src/behaviour/mention-input.test.tsx`

Update the header comment with the measured defect (unnamed `button` rows; the
false “roles are dropped” claim), then add three cases:

1. **“the suggestion list is a named listbox of named options”** — type `@`;
   assert one `listbox` named `"Mentions"`, and `listboxoption` names exactly
   `["@ana", "@anna", "@joan"]`; assert the first option's `selected` is
   `some(true)` and the others are not selected. Fails at `HEAD` (zero
   listboxes, zero options, three unnamed buttons).
2. **“the highlight is the selected option”** — type `@a`, press `ArrowDown`;
   assert the options' `selected` flags are `[false, true, false]` and the names
   are unchanged. Fails at `HEAD` on the role (no options exist).
3. **“a caller names the list and a row”** — `<MentionInputList label="People">`
   with one `MentionInputItem aria-label="Ana Alvarez"`; type `@`; assert the
   `listbox` is named `"People"` and the option names are
   `["Ana Alvarez", "@anna", "@joan"]`. The authored row-name half is a pin that
   already passes; the list-label half fails at `HEAD`.

This makes **25** native cases in the file.

### 3.3 `packages/components/docs/mention-input.mdx`

- API table: `MentionInputList` renders a `role="listbox"` surface labelled
  `Mentions` by default, takes `label?` (the caller's `aria-label` wins), and
  `MentionInputItem` renders a `listboxoption` row named by `aria-label`, else
  `label`, else `@value`.
- Accessibility: replace “Suggestion rows are buttons … named group” and the
  “dropped” bullet with the measured truth — the surface is a named listbox of
  named options, the highlighted row carries `aria-selected`, and there is no
  `aria-activedescendant` so the highlight is the selection channel.
- Limitations: delete `No role="listbox"/option in the dump, no
  aria-activedescendant` (keep the `aria-activedescendant` half) and delete
  `Fixed "Mentions" label for the surface` — the label is now the caller's.
  Keep the "individually focusable rows, no roving tab stop" sentence.
- Verification: `(22 tests)` → `(25 tests)` and name the three new cases.

### 3.4 `COMPONENTS.md`

In the `Mention input` row: `22 native behaviour tests` → `25 native behaviour
tests`; replace “and `listbox`/`option` roles are dropped from the a11y dump
(rows are selected buttons)” with “the surface is a named listbox of
`listboxoption` rows named by their visible label (plan 810), with the highlight
on `aria-selected` because 0.10.0 has no `aria-activedescendant`”.

### 3.5 Index and tracking

- Add a row for 810 to the components table in `.agents/slop/plans/README.md`.
- Add a ticked `[x]` line under “Tier 2 hardening after the inventory closed” in
  `TODO.md`.
- Append `810` to the overflow sentence in `PLAN.md` D30.

## 4. Test plan

Run from `packages/components`:

```sh
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/mention-input.test.tsx
```

Expected **before** the source change: **5 failed | 20 passed (25)** — the three
new cases, the updated `opens the list` role assertion, and the recorded
`mention-input > composes the caller's field handlers` plan-540 case (a native
focus move delivers no React `onFocus`). Expected after: **24 passed | 1 failed
(25)**, the same single plan-540 case.

**Both directions** (revert one line at a time, confirm the named case fails,
restore):

1. `role="option"` → `role="button"`: cases 1 and 2 fail (`listboxoption` count
   is 0); the authored-name half of case 3 still passes.
2. The resolved row name (drop the `aria-label` write): cases 1 and 2 fail on
   the option names.
3. `role="listbox"` → `role="group"`: case 1 and case 3 fail on the list role /
   name.

Then the scoped neighbours and the gates:

```sh
nubx vitest run --config vitest.behaviour.config.ts \
  src/behaviour/mention-input.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
nub run test
nub run check
nub run lint
```

All exit 0. The unit suite is unchanged (no logic module touched); the behaviour
suite should stay at its pre-change pass/fail split apart from the three new
passes (the recorded plan-540 binding classes are the only failures).

No playground smoke or live scenario mounts a mention field, so the native
`TestRenderer` read is the evidence; no live window is needed.

**Measured in this worktree, 2026-10-20:**

```sh
nubx vitest run --config vitest.behaviour.config.ts src/behaviour/mention-input.test.tsx
# HEAD (git show HEAD:… > src/mention-input.tsx): 5 failed | 20 passed (25)
# after:                                          24 passed | 1 failed (25)
#   the one failure is the recorded plan-540 case

nubx vitest run --config vitest.behaviour.config.ts \
  src/behaviour/mention-input.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
# 1 failed | 26 passed of 27 (the same plan-540 case); both contract files green

nub run test    # exit 0; unit 512 in 48 files
nub run check   # exit 0 (all 11 workspace projects)
nub run lint    # exit 0
# full native suite: 1035 passed / 20 failed of 1055 — the same plan-540 classes
# (pre-change 1032/20 of 1052, i.e. +3 tests and no new failure)
```

Each mutation proof was measured separately (source restored between runs):
`role="option"` → `button` fails cases 1, 2 and 3 plus the updated `opens the
list` case; removing the resolved row name fails cases 1–3; `role="listbox"` →
`group` fails cases 1 and 3.

## 5. STOP conditions

- A new case passes at `HEAD`: stop and re-measure; another writer may have
  changed the tree.
- The dump reports `listboxoption` **without** its `aria-label` name: stop and
  report; the naming rule must work as measured in the probe.
- A painted name, order, `testId`, style or activation result changes: stop;
  only role, name and the list `label` prop may change.
- The accessibility contract (plan 792) starts failing in another example: stop
  — this change must not alter any at-rest example.
- `docs/mention-input.mdx` or `COMPONENTS.md` states a count other than 25 after
  the change: stop and reconcile before committing.

## 6. Acceptance

- A mention suggestion is a `listboxoption` inside a named `listbox`, named by
  its visible label (`aria-label` > `label` > `@value`), and the highlighted row
  is the selected option; `MentionInputList` takes a caller `label`.
- `mention-input.test.tsx` is **24/25 measured on this host** (the one failure is
  the recorded plan-540 focus case), with the three new cases red at `HEAD` and
  the updated `opens the list` assertion red at `HEAD`.
- The three mutation proofs above each fail the named cases.
- `docs/mention-input.mdx`, `COMPONENTS.md`, the plan index, `TODO.md` and
  `PLAN.md` D30 agree; `nub run test`, `nub run check` and `nub run lint` exit 0.
