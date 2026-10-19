# 577 — A blank caption is not a caption

**Phase:** F (integration and polish) · **Owner:** primitives · **Depends on:** 026, 355, 368, 396, 500, 573
**Number note:** `575` and `576` are taken by the playground and components
worktrees (plans are aggregated across worktrees, `PLAN.md` D7), so this plan
takes the first free number across every worktree.

## 0. The bug class

Four surfaces paint a **caption** from caller data, and all four gated it on
`undefined` only:

| Surface | Prop | Guard before |
| ------- | ---- | ------------ |
| `Label` | `description` | `description === undefined` |
| `CheckboxGroup` | `options[].description` | `description === undefined` |
| `RadioGroup` | `options[].description` | `option.description === undefined` |
| `Separator` | `label` | `label === undefined` |

The **accessibility** half of this class is already fixed: `ariaName` trims and
drops a blank string (plans 026, 396, 500, 573), so the tree says nothing. The
paint did not follow. A caller computing a hint (`description={row.help}`,
`label={section.title}`) therefore gets an empty caption element:

- `Label`: one `caption`-role text line (16 px in the shipped themes) plus the
  label stack's `2xs` gap (2 px) — 18 px of blank space under the name.
- `CheckboxGroup`: the row's label column is one caption line taller (16 px)
  plus its `2xs` gap (2 px).
- `RadioGroup`: the caption is a sibling in the row (documented as "beside the
  name"), so it adds a `sm` gap (6 px) and an empty text element beside the
  label.
- `Separator`: the **labelled** branch is chosen, so the rule is split into two
  halves with a `sm` gap (6 px) on each side of an empty caption — a 12 px hole
  in a divider, where a single rule was asked for.

It is the same rule plan 573 applied to a tip and plan 399 to an icon label:
**a string that trims to nothing is absence, not content.** It is also a
documented contract: `CheckboxGroupOption.description` and `RadioOption.
description` both say "A blank description is absent", and `Label`'s page says
the description is "a second line of help".

## 1. Evidence

The defect is **structural**, so the element tree is the honest proof; no new
runtime observation is needed or claimed. The relevant numbers come from the
shipped token package (`packages/tokens/src/typography.ts` caption `12/16`,
`packages/tokens/src/scale.ts` `sm: 6`, `2xs: 2`).

Measured with the package's element-tree harness, before the change:

```
Label({ description: "   " })              -> 2 children (name row + caption)
CheckboxGroup row's label column           -> 2 children (label + caption)
RadioGroup option row                      -> 3 children (box + label + caption)
Separator({ label: "   ", horizontal })    -> display: "flex", 3 children
```

After the change:

```
Label({ description: "   " })              -> 1 child
CheckboxGroup row's label column           -> 1 child
RadioGroup option row                      -> 2 children
Separator({ label: "   ", horizontal })    -> no `display`, 0 children (one rule)
```

A **non-blank** description still paints exactly as before, and the visible text
stays what the caller wrote — only the gate changes. This mirrors plan 573:
trim for the accessibility tree, paint what was passed.

## 2. Changes

### 2.1 `packages/primitives/src/components/internal.ts`

Add one internal predicate beside `usableLabel`:

```ts
export const hasText = (value: string | undefined): boolean =>
  Option.isSome(usableLabel(value));
```

`usableLabel` is already the package's one "a string that says something"
rule (trim, then non-empty). Do not add a second trimming helper, and do not
change `ariaName`/`ariaNameOr`.

### 2.2 The four call sites

- `src/components/Label.tsx` — import `hasText`; render the caption only when
  `hasText(description)`.
- `src/components/CheckboxGroup.tsx` — same in `renderRow` (the row already
  passes `description` through).
- `src/components/RadioGroup.tsx` — same for `option.description`.
- `src/components/Separator.tsx` — the plain-rule branch becomes
  `orientation === "vertical" || !hasText(label)`.

No paint, layout or ARIA value changes for a non-blank string. Do **not** trim
the painted text (plan 573's precedent): the caption shows the caller's string.

### 2.3 Documentation

- `packages/primitives/docs/label.mdx` — API row and a Limitations bullet: a
  blank description paints no caption (plan `577`); Verification names the case.
- `packages/primitives/docs/separator.mdx` — API `label` row says a blank label
  paints the plain rule; Verification names the case.
- `packages/primitives/docs/checkbox-group.mdx` and `docs/radio-group.mdx` —
  the existing "a blank description is absent" sentences now say **neither
  announced nor painted**, and their Verification lists name the caption case.
- `COMPONENTS.md` — append the measured rule to the Labels, Separators,
  Checkboxes and Radio groups rows.
- `TODO.md` — tick the task in the Primitives workstream list.

## 3. Test plan

All four cases must fail before the change and pass after. They live beside the
existing element-tree suites:

- `src/components/presentational.test.tsx`
  - `keeps a rule whole when its caption says nothing` — blank label → no
    `display: "flex"` and no children; a real label still composes the row.
  - `paints no description line when the description says nothing` — `Label`
    with `"   "` has one child; with `"A hint."` two, and the second is the
    caption text.
- `src/components/selection.test.tsx`
  - `RadioGroup` — a blank description leaves two row children; a real one
    three.
  - `CheckboxGroup` — the label column has one child for a blank description,
    two for a real one.

### Both directions

1. With the old gate (`value !== undefined`), run:

   ```sh
   cd packages/primitives
   nub exec vitest run src/components/presentational.test.tsx src/components/selection.test.tsx
   ```

   Expected: **4 failed / 73 passed**, failing by the four case names above
   (`display` was `flex`; children counts 2/3/2 instead of 1/2/1).
2. Restore the `usableLabel` gate and run the same command.
   Expected: **2 files, 77 tests passed**.
3. Full package and repo gates:

   ```sh
   nub run --filter @gpuixui/primitives test
   nub run check
   nub run lint
   nub run test
   ```

   Expected: primitives **51 files / 738 tests**; `check` green; `lint` green;
   the workspace `test` run green (the runtime suites are opt-in and are not
   part of `nub run test`).

The runtime suite is **not** re-run for this plan: the defect is a condition in
the element tree, and the current host's binding is derived from `references/
gpuix` `main`, not the published tag (plan 529), so it is not evidence for a
new paint claim. No runtime assertion is changed or re-baselined.

## 4. STOP conditions

- A page or example is found that **intends** a blank caption (for example a
  spacing-only separator): stop and report before changing the gate.
- A change is needed outside `packages/primitives` (for example a group option
  is normalised elsewhere): record it in `TODO.md` instead of editing another
  workstream's paths.
- The tests pass against the old gate: the cases are not measuring the caption;
  rewrite them before claiming the fix.

## 5. Acceptance

- The four element-tree cases fail with the old gate and pass with `hasText`.
- A non-blank description/label renders exactly as before (same text, same
  role, same styles).
- `nub run check`, `nub run lint`, `nub run test` pass.
- The four pages, `COMPONENTS.md` and `TODO.md` record the rule and plan 577.
