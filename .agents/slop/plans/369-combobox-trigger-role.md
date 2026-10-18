# 369 — ComboboxTrigger exposes a button role and its expanded state

**Phase.** F — integration and polish (accessibility defect measured by the
playground).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 116, 138, 302, 323, 328, 340, 346 (playground evidence).
**Status.** done 2026-10-18 — 1 native case (Combobox 28, behaviour 530); it fails
without the role.

## 1. Why this plan exists

The playground's `tier2-choice` view (plan `346` §8.2) measured that
`ComboboxTrigger` authors `aria-expanded` but no `role`, so its authored
`aria-id` never appears in the accessibility dump and the expanded state is not
announced. The scenario had to assert the search field's `TextInput` node
instead.

Reproduced in this worktree on 2026-10-18 with a throwaway probe (deleted), using
the suite's own combobox fixture and `a11yNodes`:

| State | Accessibility nodes for the trigger |
| ----- | ----------------------------------- |
| closed | one `label` named `Select…` (the trigger's `<text>` child); no `button`, no `expanded` |
| open | same `label` node; the expanded state is nowhere |

The trigger also carried `aria-label="Assign reviewer"`, which was discarded:
AccessKit names the `label` node from its text child, so the whole control was
not addressable as a control.

## 2. What will change

1. `ComboboxTrigger` gives the headless trigger `role="button"` (before `...rest`,
   so a caller can override it).
2. One native test asserts the trigger is a button named by `label` with
   `expanded: false` while closed and `expanded: true` while open.
3. Docs and inventory counts updated.

No public API changes; the host prop was already accepted through `HostProps`.

## 3. Exact implementation

### 3.1 `packages/components/src/combobox.tsx` — `ComboboxTrigger`

```tsx
<HeadlessTrigger
  {...(label === undefined ? {} : { "aria-label": label })}
  role="button"
  aria-expanded={open}
  ref={registerTrigger}
  testId={testId}
  disabled={disabled}
  {...rest}
  …
```

`role="button"` is the honest mapping: the control toggles a popup and does not
accept text (the text field lives in the popup), and 0.10.0 has no
`aria-haspopup`, so `aria-expanded` is the only available state signal.

### 3.2 `packages/components/src/behaviour/combobox.test.tsx`

```tsx
it("exposes the trigger as a button with its expanded state", async () => {
  const picker = renderComponent(<Picker />);
  const named = (): ReadonlyArray<A11yNode> =>
    Arr.filter(
      nodesWithRole(picker.renderer, "button"),
      (node) => node.name === "Assign reviewer",
    );

  expect(Option.map(Arr.head(named()), (node) => node.expanded)).toEqual(
    Option.some(Option.some(false)),
  );

  await open(picker);

  expect(Option.map(Arr.head(named()), (node) => node.expanded)).toEqual(
    Option.some(Option.some(true)),
  );

  picker.unmount();
});
```

Imports gain `* as Arr from "effect/Array"` and
`{ nodesWithRole, type A11yNode }` from `../internal/a11y.js`.

### 3.3 Docs and inventory

- `packages/components/docs/combobox.mdx`: the parts table says `role="button"`,
  the keyboard section gains the exposure sentence, the verification count goes
  **27 → 28**.
- `COMPONENTS.md`: Combobox row 27 → 28 and the role note.
- Plan index row; `TODO.md` task.

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/combobox.test.tsx
```

Expected: Combobox 28/28. With `role="button"` removed, the new case fails with
`Option.none()` (no button node) and 27 pass.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run --filter @gpuixui/components test
nub run check
```

Expected: behaviour 530, unit unchanged, `check` exit `0`.

## 5. STOP conditions

1. Adding the role duplicates the trigger's text as a second accessible node
   (a `label` beside the `button`). That is the current shape and is acceptable;
   if the button's name becomes empty, keep `aria-label` and STOP if AccessKit
   still ignores it.
2. `role="button"` changes keyboard behaviour (the headless trigger's own
   handlers). It must not: the role is a prop only.
3. An existing combobox case regresses. Investigate before widening the patch.

## 6. Acceptance

- The trigger is a `button` node named by `label` with a live `expanded` value.
- The new test fails without the role.
- Gates pass; docs and inventory say 28; plan indexed and `TODO.md` ticked.

## 7. Result

Executed on this host, 2026-10-18.

- Probe (deleted): before the role, the dump held only a `label` node named
  `Select…` and no `expanded` anywhere. After it, a `button` named
  `Assign reviewer` with `expanded: false` closed and `true` open.
- `src/behaviour/combobox.test.tsx`: **28/28 green**; with the role removed the
  new case fails (`expected Option.none() to deeply equal Option.some(…)`) and
  27 pass.
- Behaviour suite **530**; docs and inventory say 28.
